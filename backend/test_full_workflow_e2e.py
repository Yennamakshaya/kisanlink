import os
import sys
import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import User, FarmerProfile, BuyerProfile, Offer, Negotiation, Agreement, ProcurementSlot, Procurement, Transaction, Payment
from app.seed import init_admin_account, run_schema_migrations
from fastapi.testclient import TestClient
from app.main import app

def run_full_lifecycle_test():
    print("=" * 80)
    print("STARTING COMPLETE KISANLINK LIFECYCLE E2E TEST: AGREEMENT -> PAYMENT")
    print("=" * 80)

    db = SessionLocal()
    run_schema_migrations(db)
    
    # Clean test data for farmer 1 & buyer 1
    prior_offers = db.query(Offer).filter(Offer.farmer_id == 1, Offer.buyer_id == 1).all()
    for po in prior_offers:
        db.query(Negotiation).filter(Negotiation.offer_id == po.id).delete()
        agrs = db.query(Agreement).filter(Agreement.offer_id == po.id).all()
        for a in agrs:
            db.query(Payment).filter(Payment.transaction_code.like(f"%{a.id}%")).delete(synchronize_session=False)
            db.query(Transaction).filter(Transaction.agreement_id == a.id).delete(synchronize_session=False)
            db.query(Procurement).filter(Procurement.agreement_id == a.id).delete(synchronize_session=False)
            db.query(ProcurementSlot).filter(ProcurementSlot.agreement_id == a.id).delete(synchronize_session=False)
            db.delete(a)
        db.delete(po)
    db.commit()
    db.close()

    client = TestClient(app)

    # 1. Login Farmer & Buyer
    farmer_login = client.post("/api/auth/login", json={"identifier": "ramesh_reddy", "password": "demo123", "role": "farmer"})
    assert farmer_login.status_code == 200, f"Farmer login failed: {farmer_login.text}"
    farmer_headers = {"Authorization": f"Bearer {farmer_login.json()['access_token']}"}

    buyer_login = client.post("/api/auth/login", json={"identifier": "shree_foods", "password": "demo123", "role": "buyer"})
    assert buyer_login.status_code == 200, f"Buyer login failed: {buyer_login.text}"
    buyer_headers = {"Authorization": f"Bearer {buyer_login.json()['access_token']}"}
    print("[OK] Auth: Logged in Farmer (Ramesh Reddy) and Buyer (Shree Foods).")

    # 2. Farmer sends initial offer (Rs 30/kg for 5000 kg Tomato) with default terms
    res1 = client.post("/api/workflow/offers", json={
        "produce_id": 1,
        "buyer_id": 1,
        "crop_name": "Tomato",
        "quantity": 5000,
        "price_per_kg": 30.0,
        "payment_terms": "Within 3 Days",
        "cold_storage_required": False,
        "message": "Initial offer: Rs 30/kg for 5000 kg"
    }, headers=farmer_headers)
    assert res1.status_code == 200, res1.text
    offer_id = res1.json()["offer_id"]
    neg_code = res1.json()["negotiation_id"]
    print(f"[OK] 1. Farmer sent Rs 30 offer -> Created {neg_code} (Offer ID: {offer_id})")

    # 3. Buyer counter-offers Rs 32/kg with Cold Storage and Payment Terms: "Within 2 Days"
    res2 = client.post(f"/api/workflow/offers/{offer_id}/counter", json={
        "offer_id": offer_id,
        "price_per_kg": 32.0,
        "quantity": 5000,
        "payment_terms": "Within 2 Days",
        "cold_storage_required": True,
        "storage_cost": 1000.0,
        "storage_duration": "5 Days",
        "message": "Buyer counter: Rs 32/kg with 5 days cold storage, payment Within 2 Days"
    }, headers=buyer_headers)
    assert res2.status_code == 200, res2.text
    print(f"[OK] 2. Buyer counter-offered Rs 32/kg, Payment Terms 'Within 2 Days', Cold Storage Rs 1000 under {neg_code}")

    # 4. Farmer accepts Rs 32/kg -> Generates Agreement
    accept_res = client.post(f"/api/workflow/offers/{offer_id}/accept", headers=farmer_headers)
    assert accept_res.status_code == 200, accept_res.text
    agr_id = accept_res.json()["agreement_id"]
    agr_code = accept_res.json()["agreement_code"]

    # Verify Agreement has zero transport cost, Payment as per Negotiation, and cold storage
    agr_detail = client.get(f"/api/workflow/agreements/{agr_id}", headers=farmer_headers).json()
    assert agr_detail["transport_cost"] == 0.0, f"Expected transport_cost 0.0, got {agr_detail['transport_cost']}"
    assert agr_detail["cold_storage_required"] is True
    assert agr_detail["storage_cost"] == 1000.0
    assert agr_detail["payment_terms"] == "Payment as per Negotiation", f"Expected 'Payment as per Negotiation', got {agr_detail['payment_terms']}"
    assert agr_detail["settlement_mode"] == "UPI Only", f"Expected 'UPI Only', got {agr_detail['settlement_mode']}"
    assert "Payment as per Negotiation" in agr_detail["terms_and_conditions"]
    assert "UPI Only" in agr_detail["terms_and_conditions"]
    # Gross: 32 * 5000 = 160000. Net Realisation = 160000 - 1000 = 159000
    assert agr_detail["total_value"] == 160000.0
    assert agr_detail["net_realisation"] == 159000.0
    print(f"[OK] 3. Farmer accepted offer! Agreement {agr_code} generated. Verified: payment_terms='Payment as per Negotiation', settlement_mode='UPI Only', cold_storage=1000, Net=Rs 159000.")

    # GUARD 1: Slot booking MUST fail if agreement is not yet signed
    guard_slot = client.post("/api/workflow/procurement/book-slot", json={
        "agreement_id": agr_id,
        "slot_date": "2026-09-18",
        "time_window": "08:00 AM - 10:00 AM",
        "location": "Shadnagar APMC Hub"
    }, headers=farmer_headers)
    assert guard_slot.status_code == 400, f"Expected 400 when booking slot for unsigned agreement, got {guard_slot.status_code}"
    print(f"[OK] 4. GUARD ENFORCED: Attempt to book slot on unsigned agreement was blocked with 400: '{guard_slot.json()['detail']}'")

    # 5a. Farmer signs Agreement first
    sign_farmer = client.post(f"/api/workflow/agreements/{agr_id}/sign", json={"accepted_tc": True}, headers=farmer_headers)
    assert sign_farmer.status_code == 200, f"Farmer signing failed: {sign_farmer.text}"
    farmer_sign_data = sign_farmer.json()
    assert farmer_sign_data["status"] == "Waiting for Buyer to sign", f"Expected 'Waiting for Buyer to sign', got {farmer_sign_data['status']}"
    assert farmer_sign_data["farmer_signed"] is True
    assert farmer_sign_data["buyer_signed"] is False
    assert farmer_sign_data["both_signed"] is False
    print(f"[OK] 5a. Farmer signed agreement! Status='{farmer_sign_data['status']}', farmer_signed=True, buyer_signed=False, both_signed=False.")

    # GUARD 1b: Slot booking MUST fail if only one party has signed!
    guard_slot_single = client.post("/api/workflow/procurement/book-slot", json={
        "agreement_id": agr_id,
        "slot_date": (datetime.date.today() + datetime.timedelta(days=1)).isoformat(),
        "time_window": "08:00 AM - 10:00 AM",
        "location": "Shadnagar APMC Hub"
    }, headers=farmer_headers)
    assert guard_slot_single.status_code == 400, f"Expected 400 when only one party signed, got {guard_slot_single.status_code}"
    assert "not yet signed by both parties" in guard_slot_single.json()["detail"]
    print(f"[OK] 5b. GUARD ENFORCED: Attempt to book slot with single signature was blocked: '{guard_slot_single.json()['detail']}'")

    # 5c. Buyer signs Agreement -> Status becomes 'Both Sides Signed'
    sign_buyer = client.post(f"/api/workflow/agreements/{agr_id}/sign", json={"accepted_tc": True}, headers=buyer_headers)
    assert sign_buyer.status_code == 200, f"Buyer signing failed: {sign_buyer.text}"
    buyer_sign_data = sign_buyer.json()
    assert buyer_sign_data["status"] == "Both Sides Signed", f"Expected 'Both Sides Signed', got {buyer_sign_data['status']}"
    assert buyer_sign_data["farmer_signed"] is True
    assert buyer_sign_data["buyer_signed"] is True
    assert buyer_sign_data["both_signed"] is True
    assert buyer_sign_data["signed_at"] is not None
    proc_id = buyer_sign_data["procurement_id"]
    print(f"[OK] 5c. Buyer signed agreement! Both sides signed! Status='{buyer_sign_data['status']}', SignedAt='{buyer_sign_data['signed_at']}', Procurement ID={proc_id}")

    # Verify Available Slots: strictly future slots starting >= tomorrow
    slots_res = client.get(f"/api/workflow/procurement/available-slots?agreement_id={agr_id}", headers=farmer_headers)
    assert slots_res.status_code == 200, f"Slots fetch failed: {slots_res.text}"
    slots = slots_res.json()
    assert len(slots) > 0, "Expected available slots"
    tomorrow_iso = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()
    for s in slots:
        assert s["slot_date"] >= tomorrow_iso, f"Slot date {s['slot_date']} is not >= tomorrow {tomorrow_iso}"
        assert s["is_available"] is True
        assert s["capacity_kg"] > 0
    chosen_slot = slots[0]
    print(f"[OK] 5d. Verified Procurement Slots: {len(slots)} future slots found starting from {slots[0]['slot_date']} (all >= tomorrow {tomorrow_iso}).")

    # GUARD 2: Produce handover MUST fail if procurement slot is not yet booked
    guard_handover = client.post(f"/api/workflow/procurement/{proc_id}/handover", json={
        "notes": "Attempting handover before slot booked."
    }, headers=farmer_headers)
    assert guard_handover.status_code == 400, f"Expected 400 when performing handover before slot booking, got {guard_handover.status_code}"
    print(f"[OK] 6. GUARD ENFORCED: Attempt to handover produce before slot booking was blocked with 400: '{guard_handover.json()['detail']}'")

    # 6. Book Procurement Slot
    slot_res = client.post("/api/workflow/procurement/book-slot", json={
        "agreement_id": agr_id,
        "slot_date": chosen_slot["slot_date"],
        "time_window": chosen_slot["time_window"],
        "location": chosen_slot["location"],
        "vehicle_details": "Mini Truck (Bolero Pickup)",
        "driver_contact": "9876543210",
        "crop": "Tomato",
        "quantity": 5000
    }, headers=farmer_headers)
    assert slot_res.status_code == 200, f"Slot booking failed: {slot_res.text}"
    slot_id = slot_res.json()["slot_id"]
    slot_code = slot_res.json()["slot_code"]
    print(f"[OK] 7. Procurement Slot booked: {slot_code} (Slot ID: {slot_id}, Date: {chosen_slot['slot_date']}, Window: {chosen_slot['time_window']}, Status: CONFIRMED)")

    # GUARD 3: Payment MUST fail if handover has not taken place
    guard_payment = client.post("/api/workflow/procurement/process-payment", json={
        "procurement_id": proc_id,
        "payment_method": "UPI"
    }, headers=buyer_headers)
    assert guard_payment.status_code == 400, f"Expected 400 when processing payment before handover, got {guard_payment.status_code}"
    print(f"[OK] 8. GUARD ENFORCED: Attempt to process payment before handover was blocked with 400: '{guard_payment.json()['detail']}'")

    # 7. Farmer performs Produce Handover
    handover_res = client.post(f"/api/workflow/procurement/{proc_id}/handover", json={
        "notes": "Produce physical handover completed at farm site in good order."
    }, headers=farmer_headers)
    assert handover_res.status_code == 200, f"Handover failed: {handover_res.text}"
    handover_data = handover_res.json()
    txn_id = handover_data["transaction_id"]
    txn_code = handover_data["transaction_code"]
    gross_val = handover_data["gross_value"]
    net_real = handover_data["net_realisation"]
    assert handover_data["status"] == "Produce Picked Up"
    assert gross_val == 160000.0
    assert net_real == 159000.0
    assert handover_data["payment_method"] == "UPI"
    assert handover_data["labour_charges"] == 0.0
    assert handover_data["labour_status"] == "PENDING"
    assert handover_data["total_payable_amount"] == 159000.0

    # Verify transaction details in API
    tx_detail = client.get(f"/api/workflow/transactions/{txn_id}", headers=farmer_headers).json()
    assert tx_detail["transport_cost"] == 0.0
    assert tx_detail["storage_cost"] == 1000.0
    assert tx_detail["payment_terms"] == "Payment as per Negotiation"
    assert tx_detail["payment_method"] == "UPI"
    assert tx_detail["agreed_amount"] == 159000.0
    assert tx_detail["labour_charges"] == 0.0
    assert tx_detail["delay_amount"] == 0.0
    print(f"[OK] 9. Produce Handover completed! Txn {txn_code} (Gross: Rs {gross_val}, Storage: Rs 1000, Transport: Rs 0, Agreed Amount: Rs {net_real}, Payment Terms: 'Payment as per Negotiation', Method: UPI)")

    # 7b. Negotiate Labour / Unloading charges post-handover
    labour_res = client.post(f"/api/workflow/transactions/{txn_id}/negotiate-labour", json={
        "labour_charges": 750.0,
        "labour_notes": "Unloading charges for 5000 kg at farmgate",
        "action": "agree"
    }, headers=buyer_headers)
    assert labour_res.status_code == 200, f"Labour negotiation failed: {labour_res.text}"
    labour_data = labour_res.json()
    assert labour_data["labour_charges"] == 750.0
    assert labour_data["labour_status"] == "AGREED"
    # Total payable = Agreed 159000 + Labour 750 = 159750
    assert labour_data["total_payable_amount"] == 159750.0
    assert labour_data["payment_method"] == "UPI"
    print(f"[OK] 9b. Labour charges negotiated post-handover: Rs 750.0 agreed! Total payable updated to Rs {labour_data['total_payable_amount']} via UPI.")

    # 8. Buyer performs Quality Confirmation & Quantity Audit
    qconf_res = client.post("/api/workflow/procurement/quality-confirm", json={
        "procurement_id": proc_id,
        "transaction_id": txn_id,
        "expected_quantity": 5000,
        "received_quantity": 5000,
        "quality_received": "Grade A",
        "status": "Accepted",
        "adjustment_reason": "Verified and accepted in full."
    }, headers=buyer_headers)
    assert qconf_res.status_code == 200, f"Quality confirmation failed: {qconf_res.text}"
    qconf_data = qconf_res.json()
    assert qconf_data["quality_status"] == "CONFIRMED"
    assert qconf_data["quantity_status"] == "CONFIRMED"
    print(f"[OK] 10. Buyer Quality Audit Confirmed: 5000 kg Grade A Accepted (qualityStatus={qconf_data['quality_status']}, quantityStatus={qconf_data['quantity_status']})")

    # Check farmer dashboard before payment verification
    farmer_dash_before = client.get("/api/farmer/dashboard-summary", headers=farmer_headers).json()
    settled_before = farmer_dash_before["completed_transactions"]

    # 9. Buyer releases Payment via UPI only (with negotiated labour and delay support)
    pay_res = client.post("/api/workflow/procurement/release-payment", json={
        "procurement_id": proc_id,
        "transaction_id": txn_id,
        "payment_method": "UPI",
        "labour_charges": 750.0,
        "delay_amount": 0.0
    }, headers=buyer_headers)
    assert pay_res.status_code == 200, f"Payment release failed: {pay_res.text}"
    pay_data = pay_res.json()
    assert pay_data["payment_status"] == "RELEASED"
    assert pay_data["payment_method"] == "UPI"
    assert pay_data["labour_charges"] == 750.0
    assert pay_data["delay_amount"] == 0.0
    assert pay_data["total_payable_amount"] == 159750.0
    assert pay_data["payment_amount"] == 159750.0
    assert "UPI/KL/" in pay_data["payment_reference"]
    assert pay_data["released_by"] is not None
    print(f"[OK] 11. Payment Released via UPI by Buyer! Status='{pay_data['payment_status']}', Method='UPI', Agreed=Rs {pay_data['agreed_amount']}, Labour=Rs {pay_data['labour_charges']}, Delay=Rs {pay_data['delay_amount']}, Total Paid=Rs {pay_data['total_payable_amount']}, UPI Ref={pay_data['payment_reference']}")

    # 10. Farmer verifies Payment receipt & Completes Transaction
    verify_res = client.post(f"/api/workflow/transactions/{txn_id}/verify-payment", headers=farmer_headers)
    assert verify_res.status_code == 200, f"Payment verification failed: {verify_res.text}"
    verify_data = verify_res.json()
    assert verify_data["payment_status"] == "VERIFIED"
    assert verify_data["transaction_status"] == "COMPLETED"
    assert verify_data["verified_by"] is not None
    print(f"[OK] 12. Farmer Payment Verification Successful! Status='{verify_data['payment_status']}', TransactionStatus='{verify_data['transaction_status']}'")

    # Check farmer dashboard after payment verification
    farmer_dash_after = client.get("/api/farmer/dashboard-summary", headers=farmer_headers).json()
    settled_after = farmer_dash_after["completed_transactions"]
    assert settled_after == settled_before + 1, f"Expected {settled_before + 1} completed settlements, got {settled_after}"
    print(f"[OK] 13. Farmer Dashboard Payment Settlements Count correctly incremented: {settled_before} -> {settled_after}")

    # 11. Ledger Verification (Both Farmer and Buyer show COMPLETED with agreed amount, labour charges, delay amount, UPI)
    farmer_txns = client.get("/api/workflow/transactions", headers=farmer_headers).json()
    matching_ftxn = next((t for t in farmer_txns if t["transaction_code"] == txn_code), None)
    assert matching_ftxn is not None, "Transaction missing from Farmer ledger"
    assert matching_ftxn["final_status"] == "COMPLETED"
    assert matching_ftxn["payment_status"] in ["VERIFIED", "COMPLETED"]
    assert matching_ftxn["transport_cost"] == 0.0
    assert matching_ftxn["storage_cost"] == 1000.0
    assert matching_ftxn["agreed_amount"] == 159000.0
    assert matching_ftxn["labour_charges"] == 750.0
    assert matching_ftxn["delay_amount"] == 0.0
    assert matching_ftxn["total_payable_amount"] == 159750.0
    assert matching_ftxn["payment_method"] == "UPI"
    assert matching_ftxn["payment_terms"] == "Payment as per Negotiation"
    print(f"[OK] 14. Verified Farmer Ledger: Txn {txn_code} Status='COMPLETED', Payment='{matching_ftxn['payment_status']}', Agreed=Rs {matching_ftxn['agreed_amount']}, Labour=Rs {matching_ftxn['labour_charges']}, Delay=Rs {matching_ftxn['delay_amount']}, Total Settled=Rs {matching_ftxn['total_payable_amount']} via UPI")

    buyer_txns = client.get("/api/workflow/transactions", headers=buyer_headers).json()
    matching_btxn = next((t for t in buyer_txns if t["transaction_code"] == txn_code), None)
    assert matching_btxn is not None, "Transaction missing from Buyer ledger"
    assert matching_btxn["final_status"] == "COMPLETED"
    assert matching_btxn["agreed_amount"] == 159000.0
    assert matching_btxn["labour_charges"] == 750.0
    assert matching_btxn["delay_amount"] == 0.0
    assert matching_btxn["total_payable_amount"] == 159750.0
    assert matching_btxn["payment_method"] == "UPI"
    assert matching_btxn["transport_cost"] == 0.0
    print(f"[OK] 15. Verified Buyer Ledger: Txn {txn_code} Status='COMPLETED', Agreed=Rs {matching_btxn['agreed_amount']}, Labour=Rs {matching_btxn['labour_charges']}, Delay=Rs {matching_btxn['delay_amount']}, Total Settled=Rs {matching_btxn['total_payable_amount']} via UPI")

    # 12. Verification of Delay Penalty calculation logic
    from app.routers.workflow_router import calculate_delay_details
    five_days_ago = (datetime.datetime.utcnow().date() - datetime.timedelta(days=5)).strftime("%Y-%m-%d")
    delay_amt, delay_days = calculate_delay_details(five_days_ago, 100000.0)
    assert delay_days == 5, f"Expected 5 days delay, got {delay_days}"
    # Daily charge = max(250.0, 100000 * 0.005) = 500.0 -> 5 * 500 = 2500.0
    assert delay_amt == 2500.0, f"Expected Rs 2500.0 delay penalty, got {delay_amt}"
    print(f"[OK] 16. Verified Delay Penalty Engine: 5 days delayed on Rs 1,00,000 correctly computed delay penalty = Rs {delay_amt} ({delay_days} days)")

    print("\n" + "=" * 80)
    print("ALL WORKFLOW CHECKS, POST-HANDOVER LABOUR NEGOTIATIONS & UPI SETTLEMENTS PASSED 100%!")
    print("=" * 80)

if __name__ == "__main__":
    run_full_lifecycle_test()

