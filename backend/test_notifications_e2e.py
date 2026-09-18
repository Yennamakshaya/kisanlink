import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User, Offer, Negotiation, Agreement, ProcurementSlot, Procurement, Transaction, Payment, Notification, Grievance
from app.seed import run_schema_migrations, init_admin_account
from fastapi.testclient import TestClient
from app.main import app

def run_notifications_e2e_test():
    print("=" * 75)
    print("STARTING COMPREHENSIVE KISANLINK NOTIFICATIONS E2E TEST")
    print("=" * 75)

    client = TestClient(app)

    # 1. Login Farmer, Buyer, Admin
    admin_login = client.post("/api/auth/login", json={"identifier": "admin", "password": "Admin@KisanLink2026!", "role": "admin"})
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
    admin_id = admin_login.json()["user_id"]

    farmer_login = client.post("/api/auth/login", json={"identifier": "ramesh_reddy", "password": "demo123", "role": "farmer"})
    assert farmer_login.status_code == 200, f"Farmer login failed: {farmer_login.text}"
    farmer_headers = {"Authorization": f"Bearer {farmer_login.json()['access_token']}"}
    farmer_id = farmer_login.json()["user_id"]

    buyer_login = client.post("/api/auth/login", json={"identifier": "shree_foods", "password": "demo123", "role": "buyer"})
    assert buyer_login.status_code == 200, f"Buyer login failed: {buyer_login.text}"
    buyer_headers = {"Authorization": f"Bearer {buyer_login.json()['access_token']}"}
    buyer_id = buyer_login.json()["user_id"]

    print(f"[OK] Auth: Logged in Admin (ID: {admin_id}), Farmer (ID: {farmer_id}), Buyer (ID: {buyer_id})")

    # Clean test data for clean test run
    db = SessionLocal()
    run_schema_migrations(db)
    
    # Clean previous records
    db.query(Payment).delete()
    db.query(Transaction).delete()
    db.query(Procurement).delete()
    db.query(ProcurementSlot).delete()
    db.query(Agreement).delete()
    db.query(Negotiation).delete()
    db.query(Offer).delete()
    db.query(Grievance).delete()
    db.query(Notification).filter(Notification.user_id.in_([admin_id, farmer_id, buyer_id])).delete()
    db.commit()
    db.close()

    # 2. Verify initial unread counts are 0
    f_count = client.get("/api/workflow/notifications/unread-count", headers=farmer_headers).json()["unread_count"]
    b_count = client.get("/api/workflow/notifications/unread-count", headers=buyer_headers).json()["unread_count"]
    assert f_count == 0, f"Expected 0 farmer unread notifications, got {f_count}"
    assert b_count == 0, f"Expected 0 buyer unread notifications, got {b_count}"
    print("[OK] Step 1: Initial unread counts verified as 0.")

    # 3. Farmer sends initial offer -> Buyer should receive NEGOTIATION_OFFER notification
    offer_res = client.post("/api/workflow/offers", json={
        "produce_id": 1,
        "buyer_id": 1,
        "crop_name": "Tomato",
        "quantity": 5000,
        "price_per_kg": 30.0,
        "message": "Initial offer: Rs 30/kg for 5000 kg"
    }, headers=farmer_headers)
    assert offer_res.status_code == 200
    offer_id = offer_res.json()["offer_id"]
    neg_code = offer_res.json()["negotiation_id"]

    # Check Buyer's notifications
    b_notifs = client.get("/api/workflow/notifications", headers=buyer_headers).json()["notifications"]
    assert len(b_notifs) >= 1, "Buyer did not receive notification after Farmer created offer"
    latest_b_notif = b_notifs[0]
    assert latest_b_notif["notification_type"] == "NEGOTIATION_OFFER"
    assert latest_b_notif["related_type"] == "NEGOTIATION"
    assert latest_b_notif["is_read"] is False
    print(f"[OK] Step 2: Farmer created offer -> Buyer received '{latest_b_notif['title']}' notification (Type: NEGOTIATION_OFFER).")

    # 4. Buyer sends counter-offer -> Farmer should receive NEGOTIATION_COUNTER notification
    counter_res = client.post(f"/api/workflow/offers/{offer_id}/counter", json={
        "offer_id": offer_id,
        "price_per_kg": 32.0,
        "quantity": 5000,
        "message": "Buyer counter: Rs 32/kg"
    }, headers=buyer_headers)
    assert counter_res.status_code == 200

    # Check Farmer's notifications
    f_notifs = client.get("/api/workflow/notifications", headers=farmer_headers).json()["notifications"]
    assert len(f_notifs) >= 1, "Farmer did not receive notification after Buyer counter-offered"
    latest_f_notif = f_notifs[0]
    assert latest_f_notif["notification_type"] == "NEGOTIATION_COUNTER"
    assert latest_f_notif["related_type"] == "NEGOTIATION"
    print(f"[OK] Step 3: Buyer counter-offered -> Farmer received '{latest_f_notif['title']}' notification (Type: NEGOTIATION_COUNTER).")

    # 5. Farmer accepts offer -> Both receive acceptance & agreement notifications
    accept_res = client.post(f"/api/workflow/offers/{offer_id}/accept", headers=farmer_headers)
    assert accept_res.status_code == 200
    agr_id = accept_res.json()["agreement_id"]

    b_notifs = client.get("/api/workflow/notifications", headers=buyer_headers).json()["notifications"]
    b_types = [n["notification_type"] for n in b_notifs]
    assert "NEGOTIATION_ACCEPTED" in b_types or "AGREEMENT_CREATED" in b_types
    print("[OK] Step 4: Farmer accepted offer -> Agreement generated and notifications sent.")

    # Sign agreement to satisfy workflow guard (both Farmer and Buyer must sign)
    sign_res1 = client.post(f"/api/workflow/agreements/{agr_id}/sign", json={"accepted_tc": True}, headers=farmer_headers)
    assert sign_res1.status_code == 200
    sign_res2 = client.post(f"/api/workflow/agreements/{agr_id}/sign", json={"accepted_tc": True}, headers=buyer_headers)
    assert sign_res2.status_code == 200

    # 6. Farmer books slot -> Both Farmer & Buyer receive SLOT_BOOKED notifications
    slot_res = client.post("/api/workflow/procurement/book-slot", json={
        "agreement_id": agr_id,
        "slot_date": "2026-09-15",
        "time_window": "08:00 AM - 10:00 AM",
        "location": "Shadnagar APMC Collection Center, Rangareddy",
        "vehicle_details": "Mini Truck (Bolero Pickup)",
        "driver_contact": "9876543210",
        "crop": "Tomato",
        "quantity": 5000
    }, headers=farmer_headers)
    assert slot_res.status_code == 200
    proc_id = slot_res.json()["procurement_id"]

    f_notifs = client.get("/api/workflow/notifications", headers=farmer_headers).json()["notifications"]
    assert any(n["notification_type"] == "SLOT_BOOKED" for n in f_notifs)
    b_notifs = client.get("/api/workflow/notifications", headers=buyer_headers).json()["notifications"]
    assert any(n["notification_type"] == "SLOT_BOOKED" for n in b_notifs)
    print("[OK] Step 5: Slot booked -> Both Farmer & Buyer received SLOT_BOOKED notifications.")

    # 7. Produce Handover completed -> Both receive HANDOVER_COMPLETED & FEEDBACK_REQUEST
    handover_res = client.post(f"/api/workflow/procurement/{proc_id}/handover", json={
        "notes": "Grade A produce verified."
    }, headers=farmer_headers)
    assert handover_res.status_code == 200

    f_notifs = client.get("/api/workflow/notifications", headers=farmer_headers).json()["notifications"]
    f_types = [n["notification_type"] for n in f_notifs]
    assert "HANDOVER_COMPLETED" in f_types
    assert "FEEDBACK_REQUEST" in f_types
    print("[OK] Step 6: Produce Handover completed -> Received HANDOVER_COMPLETED & FEEDBACK_REQUEST notifications.")

    # 8. Mark single notification as read & check unread count decrements
    unread_before = client.get("/api/workflow/notifications/unread-count", headers=farmer_headers).json()["unread_count"]
    assert unread_before > 0
    first_notif_id = f_notifs[0]["notification_id"]
    mark_res = client.patch(f"/api/workflow/notifications/{first_notif_id}/read", headers=farmer_headers)
    assert mark_res.status_code == 200
    
    unread_after = client.get("/api/workflow/notifications/unread-count", headers=farmer_headers).json()["unread_count"]
    assert unread_after == unread_before - 1
    print(f"[OK] Step 7: Marked notification {first_notif_id} as read. Unread count went from {unread_before} to {unread_after}.")

    # 9. Mark all notifications as read
    read_all_res = client.patch("/api/workflow/notifications/read-all", headers=farmer_headers)
    assert read_all_res.status_code == 200
    unread_final = client.get("/api/workflow/notifications/unread-count", headers=farmer_headers).json()["unread_count"]
    assert unread_final == 0
    print("[OK] Step 8: Marked all notifications as read. Unread count is now 0.")

    # 10. Farmer submits Grievance -> Admins receive ADMIN_GRIEVANCE notification
    grievance_res = client.post("/api/workflow/grievances", json={
        "category": "payment",
        "title": "Delayed NEFT settlement for Tomato lot",
        "description": "Payment settlement pending after handover confirmation."
    }, headers=farmer_headers)
    assert grievance_res.status_code == 200, f"Grievance submission failed: {grievance_res.text}"

    admin_notifs = client.get("/api/workflow/notifications", headers=admin_headers).json()["notifications"]
    assert any(n["notification_type"] == "ADMIN_GRIEVANCE" for n in admin_notifs)
    print("[OK] Step 9: Grievance filed -> Admin received ADMIN_GRIEVANCE notification.")

    print("\n" + "=" * 75)
    print("ALL 9 NOTIFICATION TEST SCENARIOS PASSED 100% SUCCESSFULLY!")
    print("=" * 75)

if __name__ == "__main__":
    run_notifications_e2e_test()
