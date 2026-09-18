import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    User, FarmerProfile, BuyerProfile, Produce, BuyerRequirement,
    Agreement, ProcurementSlot, Procurement, QualityConfirmation,
    Transaction, Payment, Grievance, Market, MarketPrice, Notification, AuditLog
)
from app.auth import get_current_user, require_role
from app.notifications import create_notification

router = APIRouter(prefix="/api/admin", tags=["Admin"])

def format_iso(dt: Optional[datetime.datetime]) -> Optional[str]:
    if dt is None:
        return None
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def record_audit_log(
    db: Session,
    username: str,
    role: str,
    action: str,
    related_record: str,
    entity_type: str,
    details: Optional[str] = None,
    user_id: Optional[int] = None
):
    try:
        log = AuditLog(
            user_id=user_id,
            username=username or "admin",
            role=role or "admin",
            action=action,
            related_record=related_record,
            entity_type=entity_type,
            details=details,
            created_at=datetime.datetime.utcnow()
        )
        db.add(log)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error recording audit log: {e}")

# ==========================================
# 1. OVERVIEW
# ==========================================
@router.get("/dashboard-summary")
def get_admin_dashboard(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    # Exact 10 metrics from real database
    total_farmers = db.query(FarmerProfile).count()
    total_buyers = db.query(BuyerProfile).count()
    verified_farmers = db.query(FarmerProfile).filter(FarmerProfile.status.in_(["verified", "VERIFIED"])).count()
    verified_buyers = db.query(BuyerProfile).filter(BuyerProfile.verification_status.in_(["verified", "VERIFIED", "VERIFIED BUYER"])).count()
    active_lots = db.query(Produce).filter(Produce.status == "Available").count()
    active_procurement = db.query(Procurement).filter(
        Procurement.status.in_(["Slot Booked", "Agreement Signed", "Produce Picked Up", "Quality Confirmed"])
    ).count()
    completed_transactions = db.query(Transaction).filter(
        (Transaction.final_status.in_(["Completed", "COMPLETED"])) |
        (Transaction.payment_status.in_(["VERIFIED", "Completed", "COMPLETED"]))
    ).count()
    pending_payments = db.query(Payment).filter(
        Payment.status.in_(["Pending", "PENDING"])
    ).count()
    open_grievances = db.query(Grievance).filter(
        Grievance.status.in_(["Open", "OPEN", "Under Review", "UNDER_REVIEW"])
    ).count()

    # Settlement volume: sum of completed transaction net realisations
    completed_txs = db.query(Transaction).filter(
        (Transaction.final_status.in_(["Completed", "COMPLETED"])) |
        (Transaction.payment_status.in_(["VERIFIED", "Completed", "COMPLETED"]))
    ).all()
    settlement_volume = round(sum((t.net_realisation or 0.0) for t in completed_txs), 2)

    # Additional metrics for charts and summaries
    all_txs = db.query(Transaction).all()
    total_tx = len(all_txs)
    total_gross = sum((t.gross_value or 0.0) for t in all_txs) if all_txs else 0.0
    total_net = sum((t.net_realisation or 0.0) for t in all_txs) if all_txs else 0.0
    avg_gross = round(total_gross / total_tx, 2) if total_tx > 0 else 15500.0
    avg_net = round(total_net / total_tx, 2) if total_tx > 0 else 13800.0

    disputed_tx = len([t for t in all_txs if "DISPUT" in (t.procurement_status or "").upper() or "DISPUT" in (t.final_status or "").upper()])
    dispute_rate_pct = round((disputed_tx / max(1, total_tx)) * 100.0, 1)

    fpo_aggregated_lots = db.query(Produce).filter(Produce.is_fpo == True).count()
    fpo_produces = db.query(Produce).filter(Produce.is_fpo == True).all()
    fpo_volume_tonnes = round(sum((p.quantity or 0.0) for p in fpo_produces) / 1000.0, 2)

    return {
        # The 10 Primary Section Metrics
        "total_farmers": total_farmers,
        "total_buyers": total_buyers,
        "verified_farmers": verified_farmers,
        "verified_buyers": verified_buyers,
        "active_lots": active_lots,
        "active_procurement": active_procurement,
        "completed_transactions": completed_transactions,
        "pending_payments": pending_payments,
        "open_grievances": open_grievances,
        "settlement_volume": settlement_volume,

        # Supporting & Legacy Keys
        "active_produce": active_lots,
        "active_produce_lots": active_lots,
        "pending_verification": max(0, total_buyers - verified_buyers),
        "fpo_aggregated_lots": fpo_aggregated_lots,
        "fpo_volume_tonnes": fpo_volume_tonnes,
        "total_transactions": total_tx,
        "disputed_transactions": disputed_tx,
        "dispute_rate_pct": dispute_rate_pct,
        "avg_gross_realisation": avg_gross,
        "avg_net_realisation": avg_net
    }

# ==========================================
# 2. FARMER MANAGEMENT
# ==========================================
@router.get("/farmers")
def get_farmers_list(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    farmers = db.query(FarmerProfile).all()
    result = []
    for f in farmers:
        # Normalize Aadhaar KYC status
        raw_kyc = (getattr(f, "kyc_status", None) or "pending").strip().upper()
        if raw_kyc in ["VERIFIED", "VERIFY"]:
            aadhaar_status = "VERIFIED"
        elif raw_kyc in ["REJECTED", "REJECT"]:
            aadhaar_status = "REJECTED"
        else:
            aadhaar_status = "PENDING VERIFICATION"

        # Normalize Farmer Account status
        raw_status = (f.status or "PENDING VERIFICATION").strip().upper()
        if raw_status in ["VERIFIED", "ACTIVE"]:
            account_status = "VERIFIED"
        elif raw_status in ["SUSPENDED"]:
            account_status = "SUSPENDED"
        elif raw_status in ["REJECTED"]:
            account_status = "REJECTED"
        else:
            account_status = "PENDING VERIFICATION"

        result.append({
            "id": f.id,
            "user_id": f.user_id,
            "username": f.user.username if f.user else f"farmer_{f.id}",
            "full_name": f.full_name,
            "phone": f.user.mobile_number if f.user else "9876543210",
            "email": f.user.email if f.user else f"farmer{f.id}@kisanlink.in",
            "location": f"{f.village}, {f.mandal}, {f.district}",
            "village": f.village,
            "mandal": f.mandal,
            "district": f.district,
            "state": f.state or "Telangana",
            "pincode": f.pincode,
            "address": f.address or f"H.No. 4-{f.id}, Main Road, {f.village}",
            "aadhaar_masked": f.aadhaar_masked,
            "crops_grown": f.crops_grown or "Paddy, Cotton, Maize",
            "farm_size": f.farm_size or "4.5 Acres",
            "status": account_status,
            "account_status": account_status,
            "kyc_status": aadhaar_status,
            "aadhaar_verification_status": aadhaar_status,
            "land_records_status": getattr(f, "land_records_status", "verified") or "verified",
            "rating": f.rating or 4.8,
            "completed_transactions": f.completed_transactions or 0,
            "reliability_score": f.reliability_score or 95.0,
            "created_at": format_iso(f.user.created_at) if f.user and f.user.created_at else None
        })
    return result

@router.put("/farmers/{farmer_id}/verify")
def verify_farmer(
    farmer_id: int,
    action: str,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    farmer = db.query(FarmerProfile).filter(FarmerProfile.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found.")

    act = action.lower().strip()
    if act in ["verify", "approve"]:
        farmer.status = "VERIFIED"
        farmer.kyc_status = "VERIFIED"
        if farmer.user:
            farmer.user.status = "VERIFIED"
        action_name = "FARMER_VERIFIED"
        msg = f"Farmer {farmer.full_name} has been verified successfully."
    elif act == "reject":
        farmer.status = "REJECTED"
        farmer.kyc_status = "REJECTED"
        if farmer.user:
            farmer.user.status = "REJECTED"
        action_name = "FARMER_REJECTED"
        msg = f"Farmer {farmer.full_name} verification was rejected."
    elif act == "suspend":
        farmer.status = "SUSPENDED"
        if farmer.user:
            farmer.user.status = "SUSPENDED"
        action_name = "FARMER_SUSPENDED"
        msg = f"Farmer {farmer.full_name} account suspended."
    elif act in ["reactivate", "active"]:
        farmer.status = "VERIFIED"
        if farmer.user:
            farmer.user.status = "VERIFIED"
        action_name = "FARMER_REACTIVATED"
        msg = f"Farmer {farmer.full_name} account re-activated."
    else:
        raise HTTPException(status_code=400, detail="Action must be verify, reject, suspend, or reactivate.")

    db.commit()
    record_audit_log(
        db=db,
        username=current_user.username,
        role="admin",
        action=action_name,
        related_record=f"FARMER-{farmer.id} ({farmer.full_name})",
        entity_type="FARMER",
        details=msg,
        user_id=current_user.id
    )

    if farmer.user_id:
        create_notification(
            db=db,
            user_id=farmer.user_id,
            title="Farmer Verification Updated",
            message=msg,
            notification_type="success" if act in ["verify", "approve"] else "warning",
            related_id=str(farmer.id),
            related_type="FARMER"
        )

    return {
        "message": msg,
        "status": farmer.status,
        "account_status": farmer.status,
        "kyc_status": farmer.kyc_status,
        "aadhaar_verification_status": farmer.kyc_status
    }

@router.put("/farmers/{farmer_id}/status")
def update_farmer_status(
    farmer_id: int,
    status_val: str,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    farmer = db.query(FarmerProfile).filter(FarmerProfile.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found.")

    normalized = status_val.upper().strip()
    if normalized in ["VERIFIED", "APPROVE"]:
        final_status = "VERIFIED"
        farmer.kyc_status = "VERIFIED"
        if farmer.user: farmer.user.status = "VERIFIED"
    elif normalized in ["SUSPENDED", "SUSPEND"]:
        final_status = "SUSPENDED"
        if farmer.user: farmer.user.status = "SUSPENDED"
    elif normalized in ["REJECTED", "REJECT"]:
        final_status = "REJECTED"
        farmer.kyc_status = "REJECTED"
        if farmer.user: farmer.user.status = "REJECTED"
    elif normalized in ["PENDING", "PENDING VERIFICATION"]:
        final_status = "PENDING VERIFICATION"
        if farmer.user: farmer.user.status = "PENDING VERIFICATION"
    else:
        final_status = status_val

    farmer.status = final_status
    db.commit()

    record_audit_log(
        db=db,
        username=current_user.username,
        role="admin",
        action=f"FARMER_STATUS_{final_status.replace(' ', '_')}",
        related_record=f"FARMER-{farmer.id} ({farmer.full_name})",
        entity_type="FARMER",
        details=f"Farmer status updated to '{final_status}'",
        user_id=current_user.id
    )

    return {"message": f"Farmer status updated to {final_status}", "status": final_status}

@router.put("/farmers/{farmer_id}/verify-kyc")
def verify_farmer_kyc(
    farmer_id: int,
    status_val: str = "verified",
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    farmer = db.query(FarmerProfile).filter(FarmerProfile.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found.")

    farmer.kyc_status = status_val
    db.commit()

    record_audit_log(
        db=db,
        username=current_user.username,
        role="admin",
        action=f"FARMER_KYC_{status_val.upper()}",
        related_record=f"FARMER-{farmer.id} ({farmer.full_name})",
        entity_type="FARMER",
        details=f"Aadhaar / Identity KYC marked as {status_val} for {farmer.full_name}",
        user_id=current_user.id
    )

    return {"message": f"Farmer KYC status updated to {status_val}", "kyc_status": status_val}

@router.put("/farmers/{farmer_id}/verify-land")
def verify_farmer_land(
    farmer_id: int,
    status_val: str = "verified",
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    farmer = db.query(FarmerProfile).filter(FarmerProfile.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found.")

    farmer.land_records_status = status_val
    db.commit()

    record_audit_log(
        db=db,
        username=current_user.username,
        role="admin",
        action=f"FARMER_LAND_{status_val.upper()}",
        related_record=f"FARMER-{farmer.id} ({farmer.full_name})",
        entity_type="FARMER",
        details=f"Pattadar Passbook / Land record marked as {status_val} for {farmer.full_name}",
        user_id=current_user.id
    )

    return {"message": f"Farmer land records status updated to {status_val}", "land_records_status": status_val}

# ==========================================
# 3. BUYER MANAGEMENT
# ==========================================
@router.get("/buyers")
def get_buyers_list(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    buyers = db.query(BuyerProfile).all()
    result = []
    for b in buyers:
        raw_ver = (b.verification_status or "PENDING VERIFICATION").strip().upper()
        if raw_ver in ["VERIFIED", "VERIFIED BUYER", "ACTIVE"]:
            ver_status = "VERIFIED BUYER"
        elif raw_ver in ["SUSPENDED"]:
            ver_status = "SUSPENDED"
        elif raw_ver in ["REJECTED"]:
            ver_status = "REJECTED"
        else:
            ver_status = "PENDING VERIFICATION"

        cert_url = b.gst_doc_url or None
        cert_name = cert_url.split("/")[-1] if (cert_url and "/" in cert_url) else (cert_url or "Not provided")

        phone_val = (b.user.mobile_number if (b.user and b.user.mobile_number) else None) or "Not provided"
        email_val = (b.user.email if (b.user and b.user.email) else None) or "Not provided"
        address_val = b.address or "Not provided"
        udyam_val = b.udyam_number or "Not provided"
        gstin_val = b.gstin or (b.gstin_masked.replace(" (Verified)", "").strip() if b.gstin_masked else None) or "Not provided"
        pan_val = b.pan or (b.pan_masked.strip() if b.pan_masked else None) or "Not provided"

        doc_type_val = "GST Registration & Business Certificate" if cert_url else "Not provided"
        issuing_auth_val = "Government of Telangana • Commercial Taxes" if cert_url else "Not provided"

        result.append({
            "id": b.id,
            "user_id": b.user_id,
            "company_name": b.company_name or "Not provided",
            "company_id": b.company_id or f"BUY-{b.id}",
            "contact_person": b.contact_person or "Not provided",
            "phone": phone_val,
            "email": email_val,
            "city": b.city or "Not provided",
            "district": b.district or "Not provided",
            "state": b.state or "Telangana",
            "location": f"{b.city or 'Not provided'}, {b.district or 'Not provided'}, {b.state or 'Telangana'}",
            "pincode": b.pincode or "Not provided",
            "address": address_val,
            "gstin": gstin_val,
            "pan": pan_val,
            "gstin_masked": b.gstin_masked or "Not provided",
            "pan_masked": b.pan_masked or "Not provided",
            "udyam_number": udyam_val,
            "buyer_category": b.buyer_category or "Not provided",
            "document_type": doc_type_val,
            "issuing_authority": issuing_auth_val,
            "certificate_url": cert_url or "",
            "certificate_name": cert_name,
            "certificate": cert_name,
            "verification_status": ver_status,
            "status": ver_status,
            "business_reg_status": getattr(b, "business_reg_status", "verified") or "verified",
            "trade_license_status": getattr(b, "trade_license_status", "verified") or "verified",
            "gst_doc_url": cert_url or "",
            "rating": b.rating or 4.7,
            "completed_transactions": b.completed_transactions or 0,
            "reliability_score": b.reliability_score or 94.0,
            "created_at": format_iso(b.user.created_at) if b.user and b.user.created_at else None
        })
    return result

@router.put("/buyers/{buyer_id}/verify")
def verify_buyer(
    buyer_id: int,
    action: str,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    buyer = db.query(BuyerProfile).filter(BuyerProfile.id == buyer_id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found.")

    act = action.lower().strip()
    if act in ["verify", "approve"]:
        buyer.verification_status = "VERIFIED BUYER"
        buyer.business_reg_status = "VERIFIED"
        buyer.trade_license_status = "VERIFIED"
        if buyer.user:
            buyer.user.status = "ACTIVE"
        action_name = "BUYER_CERTIFICATE_VERIFIED"
        msg = f"Buyer certificate verified for {buyer.company_name}. Account marked as VERIFIED BUYER."
    elif act == "reject":
        buyer.verification_status = "REJECTED"
        buyer.business_reg_status = "REJECTED"
        if buyer.user:
            buyer.user.status = "REJECTED"
        action_name = "BUYER_CERTIFICATE_REJECTED"
        msg = f"Buyer certificate rejected for {buyer.company_name}."
    elif act == "suspend":
        buyer.verification_status = "SUSPENDED"
        if buyer.user:
            buyer.user.status = "SUSPENDED"
        action_name = "BUYER_SUSPENDED"
        msg = f"Buyer {buyer.company_name} suspended by Administrator."
    elif act in ["reactivate", "active"]:
        buyer.verification_status = "VERIFIED BUYER"
        if buyer.user:
            buyer.user.status = "ACTIVE"
        action_name = "BUYER_REACTIVATED"
        msg = f"Buyer {buyer.company_name} re-activated by Administrator."
    else:
        raise HTTPException(status_code=400, detail="Action must be verify, reject, suspend, or reactivate.")

    db.commit()

    record_audit_log(
        db=db,
        username=current_user.username,
        role="admin",
        action=action_name,
        related_record=f"BUYER-{buyer.id} ({buyer.company_name})",
        entity_type="BUYER",
        details=msg,
        user_id=current_user.id
    )

    if buyer.user_id:
        create_notification(
            db=db,
            user_id=buyer.user_id,
            title="Buyer Certificate Verification Updated",
            message=msg,
            notification_type="success" if act in ["verify", "approve"] else "warning",
            related_id=str(buyer.id),
            related_type="BUYER"
        )

    return {
        "message": msg,
        "verification_status": buyer.verification_status,
        "status": buyer.verification_status
    }

@router.put("/buyers/{buyer_id}/verify-doc")
def verify_buyer_document(
    buyer_id: int,
    doc_type: str = Query(..., description="business_reg, gst, or trade_license"),
    status_val: str = "verified",
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    buyer = db.query(BuyerProfile).filter(BuyerProfile.id == buyer_id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found.")

    if doc_type == "business_reg":
        buyer.business_reg_status = status_val
    elif doc_type == "gst":
        if status_val == "verified":
            buyer.verification_status = "verified"
        elif status_val == "rejected":
            buyer.verification_status = "rejected"
    elif doc_type == "trade_license":
        buyer.trade_license_status = status_val
    else:
        raise HTTPException(status_code=400, detail="Invalid doc_type")

    db.commit()

    record_audit_log(
        db=db,
        username=current_user.username,
        role="admin",
        action=f"BUYER_DOC_{doc_type.upper()}_{status_val.upper()}",
        related_record=f"BUYER-{buyer.id} ({buyer.company_name})",
        entity_type="BUYER",
        details=f"Document '{doc_type}' marked as {status_val} for {buyer.company_name}",
        user_id=current_user.id
    )

    return {"message": f"{doc_type} status updated to {status_val}"}

# ==========================================
# 4. PRODUCE & LOT MANAGEMENT
# ==========================================
@router.get("/produce-lots")
def get_all_produce_lots(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    lots = db.query(Produce).order_by(Produce.id.desc()).all()
    result = []
    for p in lots:
        result.append({
            "id": p.id,
            "lot_code": p.lot_code or f"LOT-{p.id:04d}",
            "crop_name": p.crop_name,
            "variety": p.variety or "Standard",
            "quantity": p.quantity,
            "unit": p.unit or "kg",
            "quality": p.quality or "Grade A",
            "expected_price": p.expected_price,
            "location": f"{p.village}, {p.mandal}, {p.district}",
            "village": p.village,
            "mandal": p.mandal,
            "district": p.district,
            "harvest_date": p.harvest_date,
            "available_from": p.available_from,
            "status": p.status or "Available",
            "flagged_reason": getattr(p, "flagged_reason", None),
            "is_fpo": p.is_fpo,
            "fpo_name": p.fpo_name,
            "farmer_name": p.farmer.full_name if p.farmer else "Verified Farmer",
            "farmer_id": p.farmer_id,
            "created_at": format_iso(p.created_at)
        })
    return result

@router.put("/produce-lots/{produce_id}/flag")
def flag_produce_lot(
    produce_id: int,
    payload: Dict[str, Any],
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    p = db.query(Produce).filter(Produce.id == produce_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Produce lot not found.")

    reason = payload.get("reason", "Flagged by Admin for policy violation or invalid data.")
    p.status = "Flagged"
    p.flagged_reason = reason
    db.commit()

    record_audit_log(
        db=db,
        username=current_user.username,
        role="admin",
        action="PRODUCE_LOT_FLAGGED",
        related_record=f"{p.lot_code or f'LOT-{p.id}'} ({p.crop_name})",
        entity_type="PRODUCE",
        details=f"Produce listing flagged. Reason: {reason}",
        user_id=current_user.id
    )

    return {"message": "Listing flagged successfully", "status": p.status, "reason": p.flagged_reason}

@router.put("/produce-lots/{produce_id}/status")
def update_produce_status(
    produce_id: int,
    status_val: str = Query(..., description="Available, Deactivated, Cancelled, Flagged"),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    p = db.query(Produce).filter(Produce.id == produce_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Produce lot not found.")

    p.status = status_val
    if status_val != "Flagged":
        p.flagged_reason = None
    db.commit()

    record_audit_log(
        db=db,
        username=current_user.username,
        role="admin",
        action=f"PRODUCE_STATUS_{status_val.upper()}",
        related_record=f"{p.lot_code or f'LOT-{p.id}'} ({p.crop_name})",
        entity_type="PRODUCE",
        details=f"Produce status changed to {status_val}",
        user_id=current_user.id
    )

    return {"message": f"Produce lot status updated to {status_val}", "status": p.status}

# ==========================================
# 5. PROCUREMENT & HANDOVER
# ==========================================
@router.get("/procurement-monitoring")
def get_procurement_monitoring(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    slots = db.query(ProcurementSlot).order_by(ProcurementSlot.id.desc()).all()
    slots_data = []
    for s in slots:
        slots_data.append({
            "id": s.id,
            "slot_code": s.slot_code,
            "agreement_id": s.agreement_id,
            "slot_date": s.slot_date,
            "time_window": s.time_window,
            "location": s.location,
            "crop_name": s.crop_name or (s.agreement.crop_name if s.agreement else "Produce"),
            "quantity": s.quantity or (s.agreement.quantity if s.agreement else 0),
            "farmer_name": s.farmer.full_name if s.farmer else (s.agreement.farmer.full_name if s.agreement and s.agreement.farmer else "Farmer"),
            "buyer_company": s.buyer.company_name if s.buyer else (s.agreement.buyer.company_name if s.agreement and s.agreement.buyer else "Buyer"),
            "status": s.status,
            "booked_by": s.booked_by,
            "created_at": format_iso(s.created_at)
        })

    procurements = db.query(Procurement).order_by(Procurement.id.desc()).all()
    procurements_data = []
    for pr in procurements:
        agr = pr.agreement
        slot = db.query(ProcurementSlot).filter(ProcurementSlot.id == pr.slot_id).first() if pr.slot_id else None
        qconf = db.query(QualityConfirmation).filter(QualityConfirmation.procurement_id == pr.id).order_by(QualityConfirmation.id.desc()).first()
        procurements_data.append({
            "id": pr.id,
            "agreement_id": pr.agreement_id,
            "agreement_code": agr.agreement_code if agr else f"AGR-{pr.agreement_id}",
            "slot_id": pr.slot_id,
            "slot_code": slot.slot_code if slot else None,
            "farmer_name": pr.farmer.full_name if pr.farmer else "Farmer",
            "buyer_company": pr.buyer.company_name if pr.buyer else "Buyer",
            "crop_name": agr.crop_name if agr else "Produce",
            "quantity": agr.quantity if agr else 0,
            "pickup_location": pr.pickup_location,
            "delivery_location": pr.delivery_location,
            "status": pr.status,
            "handover_at": format_iso(pr.handover_at),
            "handover_notes": pr.handover_notes,
            "transport_cost": 0.0,
            "quality_confirmation": {
                "id": qconf.id,
                "expected_quantity": qconf.expected_quantity,
                "received_quantity": qconf.received_quantity,
                "diff_quantity": qconf.diff_quantity,
                "quality_received": qconf.quality_received,
                "status": qconf.status,
                "adjustment_reason": qconf.adjustment_reason,
                "confirmed_at": format_iso(qconf.confirmed_at)
            } if qconf else None
        })

    return {
        "slots": slots_data,
        "procurements": procurements_data
    }

# ==========================================
# 6. TRANSACTIONS & PAYMENTS
# ==========================================
@router.get("/transactions")
def get_all_transactions(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    txs = db.query(Transaction).order_by(Transaction.id.desc()).all()
    result = []
    for t in txs:
        pmt = db.query(Payment).filter(Payment.transaction_id == t.id).first()
        if not pmt and t.procurement_id:
            pmt = db.query(Payment).filter(Payment.procurement_id == t.procurement_id).first()

        labour_chg = t.labour_charges or 0.0
        delay_amt = t.delay_amount or 0.0
        total_settlement = round((t.net_realisation or 0.0) + labour_chg + delay_amt, 2)
        farmer_user = getattr(t.farmer, "user", None) if t.farmer else None
        farmer_mobile = getattr(farmer_user, "mobile_number", None) if farmer_user else None
        farmer_upi = t.upi_id or (f"{farmer_mobile}@upi" if farmer_mobile else "farmer@upi")

        result.append({
            "id": t.id,
            "transaction_code": t.transaction_code,
            "agreement_id": t.agreement_id,
            "agreement_code": t.agreement.agreement_code if t.agreement else f"AGR-{t.agreement_id}",
            "crop_name": t.crop_name,
            "quantity": t.quantity,
            "price_per_kg": t.price_per_kg,
            "gross_value": t.gross_value,
            "transport_cost": 0.0,
            "storage_cost": t.storage_cost or 0.0,
            "cold_storage_required": getattr(t, "cold_storage_required", False) or False,
            "storage_duration": getattr(t, "storage_duration", None),
            "payment_terms": getattr(t, "payment_terms", "Payment as per Negotiation") or "Payment as per Negotiation",
            "payment_due_date": getattr(t, "payment_due_date", None),
            "other_costs": t.other_costs or 0.0,
            "net_realisation": t.net_realisation,
            "agreed_amount": t.net_realisation,
            "labour_charges": labour_chg,
            "labour_notes": t.labour_notes,
            "labour_status": t.labour_status or "PENDING",
            "delay_amount": delay_amt,
            "delay_days": t.delay_days or 0,
            "total_payable_amount": total_settlement,
            "payment_method": "UPI",
            "upi_id": farmer_upi,
            "net_price_per_kg": t.net_price_per_kg,
            "procurement_status": t.procurement_status,
            "payment_status": t.payment_status,
            "final_status": t.final_status,
            "farmer_name": t.farmer.full_name if t.farmer else "Farmer",
            "farmer_village": t.farmer.village if t.farmer else None,
            "farmer_district": t.farmer.district if t.farmer else None,
            "buyer_company": t.buyer.company_name if t.buyer else "Buyer",
            "buyer_city": t.buyer.city if t.buyer else None,
            "created_at": format_iso(t.created_at),
            "completed_at": format_iso(t.completed_at),
            "payment": {
                "id": pmt.id if pmt else None,
                "amount": pmt.amount if pmt else total_settlement,
                "amount_due": pmt.amount_due if pmt else 0.0,
                "status": pmt.status if pmt else ("Completed" if t.payment_status in ["VERIFIED", "COMPLETED"] else "Pending"),
                "payment_method": "UPI",
                "upi_id": (pmt.upi_id if pmt and pmt.upi_id else farmer_upi),
                "labour_charges": (pmt.labour_charges if pmt and pmt.labour_charges is not None else labour_chg),
                "delay_amount": (pmt.delay_amount if pmt and pmt.delay_amount is not None else delay_amt),
                "payment_reference": pmt.payment_reference if pmt else None,
                "payment_date": format_iso(pmt.payment_date) if pmt and pmt.payment_date else None
            } if pmt or t.payment_status else None
        })
    return result

# ==========================================
# 7. GRIEVANCE MANAGEMENT
# ==========================================
@router.get("/grievances")
def get_all_grievances(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    grvs = db.query(Grievance).order_by(Grievance.id.desc()).all()
    result = []
    for g in grvs:
        result.append({
            "id": g.id,
            "grievance_code": g.grievance_code,
            "user_id": g.user_id,
            "user_name": g.user.username if g.user else "User",
            "user_role": g.user.role if g.user else "User",
            "transaction_id": g.transaction_id,
            "transaction_code": g.transaction_code,
            "category": g.category or "Quality Dispute",
            "title": g.title,
            "description": g.description,
            "status": g.status or "OPEN",
            "admin_remarks": g.admin_remarks,
            "created_at": format_iso(g.created_at)
        })
    return result

@router.put("/grievances/{grievance_id}/resolve")
def resolve_grievance(
    grievance_id: int,
    payload: Dict[str, Any],
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    grv = db.query(Grievance).filter(Grievance.id == grievance_id).first()
    if not grv:
        raise HTTPException(status_code=404, detail="Grievance not found.")

    status_val = payload.get("status", "RESOLVED").upper()
    remarks = payload.get("admin_remarks", payload.get("remarks", ""))

    valid_statuses = ["OPEN", "UNDER_REVIEW", "RESOLVED", "ESCALATED", "CLOSED"]
    if status_val not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid_statuses}")

    old_status = grv.status
    grv.status = status_val
    if remarks:
        grv.admin_remarks = remarks
    db.commit()

    record_audit_log(
        db=db,
        username=current_user.username,
        role="admin",
        action=f"GRIEVANCE_{status_val}",
        related_record=grv.grievance_code,
        entity_type="GRIEVANCE",
        details=f"Grievance status changed from '{old_status}' to '{status_val}'. Remarks: {remarks or 'None'}",
        user_id=current_user.id
    )

    if grv.user_id:
        create_notification(
            db=db,
            user_id=grv.user_id,
            title=f"Grievance {grv.grievance_code} Updated",
            message=f"Your dispute has been updated to '{grv.status}' by Administrator. Remarks: {grv.admin_remarks or 'Action recorded.'}",
            notification_type="success" if grv.status == "RESOLVED" else "info",
            related_id=grv.grievance_code,
            related_type="GRIEVANCE"
        )

    return {"message": f"Grievance {grv.grievance_code} updated to {grv.status}", "status": grv.status}

# ==========================================
# 8. MARKET INTELLIGENCE
# ==========================================
@router.get("/market-intelligence")
def get_market_intelligence(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    prices = db.query(MarketPrice).order_by(MarketPrice.id.asc()).all()
    markets = {m.id: m for m in db.query(Market).all()}
    result = []
    for mp in prices:
        m = markets.get(mp.market_id)
        result.append({
            "id": mp.id,
            "crop_name": mp.crop_name,
            "market_name": m.name if m else f"APMC Mandi {mp.market_id}",
            "district": m.district if m else "Telangana",
            "state": m.state if m else "Telangana",
            "min_price": mp.min_price,
            "modal_price": mp.modal_price,
            "max_price": mp.max_price,
            "arrival_volume_tonnes": getattr(mp, "arrival_volume_tonnes", 120.0) or 120.0,
            "price_change": getattr(mp, "price_change", 0.0) or 0.0,
            "data_source": mp.data_source or "APMC Market Intelligence Network",
            "data_status": getattr(mp, "data_status", "VERIFIED") or "VERIFIED",
            "last_updated": getattr(mp, "last_updated", "Live") or "Live",
            "date": getattr(mp, "price_date", "Today") or "Today"
        })
    return result

# ==========================================
# 9. NOTIFICATIONS & ALERTS
# ==========================================
@router.get("/notifications")
def get_admin_notifications_alerts(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    # 1. Verification Alerts
    pending_buyers = db.query(BuyerProfile).filter(BuyerProfile.verification_status == "pending").all()
    verification_alerts = [
        {
            "id": f"buyer-verif-{b.id}",
            "type": "VERIFICATION_ALERT",
            "title": f"Pending Buyer Verification: {b.company_name}",
            "description": f"Buyer in {b.city}, {b.district} awaiting administrative approval.",
            "target_url": "/admin/dashboard?tab=buyers",
            "created_at": format_iso(b.user.created_at if b.user else None),
            "urgency": "HIGH"
        }
        for b in pending_buyers
    ]

    pending_farmers = db.query(FarmerProfile).filter(FarmerProfile.status == "pending").all()
    for f in pending_farmers:
        verification_alerts.append({
            "id": f"farmer-verif-{f.id}",
            "type": "VERIFICATION_ALERT",
            "title": f"Farmer Onboarding Review: {f.full_name}",
            "description": f"Aadhaar: {f.aadhaar_masked} from {f.village}, {f.district} awaiting KYC verification.",
            "target_url": "/admin/dashboard?tab=farmers",
            "created_at": format_iso(f.user.created_at if f.user else None),
            "urgency": "MEDIUM"
        })

    # 2. Transaction Alerts
    recent_txs = db.query(Transaction).order_by(Transaction.id.desc()).limit(10).all()
    transaction_alerts = [
        {
            "id": f"txn-alert-{t.id}",
            "type": "TRANSACTION_ALERT",
            "title": f"Trade {t.transaction_code}: {t.crop_name} ({t.quantity} kg)",
            "description": f"Status: {t.final_status} | Net Realisation: ₹{t.net_realisation:,.2f}",
            "target_url": "/admin/dashboard?tab=transactions",
            "created_at": format_iso(t.created_at),
            "urgency": "INFO"
        }
        for t in recent_txs
    ]

    # 3. Payment Alerts
    pending_pmts = db.query(Payment).filter(Payment.status.in_(["Pending", "PENDING"])).all()
    payment_alerts = [
        {
            "id": f"pmt-alert-{p.id}",
            "type": "PAYMENT_ALERT",
            "title": f"Pending Settlement Release: ₹{p.amount:,.2f}",
            "description": f"Transaction Ref: {p.transaction_code} via {p.payment_method}",
            "target_url": "/admin/dashboard?tab=transactions",
            "created_at": format_iso(p.created_at),
            "urgency": "HIGH"
        }
        for p in pending_pmts
    ]

    # 4. Grievance Alerts
    open_grvs = db.query(Grievance).filter(Grievance.status.in_(["Open", "OPEN", "Under Review", "UNDER_REVIEW"])).all()
    grievance_alerts = [
        {
            "id": f"grv-alert-{g.id}",
            "type": "GRIEVANCE_ALERT",
            "title": f"Active Dispute: {g.grievance_code}",
            "description": f"{g.title} - Category: {g.category}",
            "target_url": "/admin/dashboard?tab=grievances",
            "created_at": format_iso(g.created_at),
            "urgency": "HIGH"
        }
        for g in open_grvs
    ]

    # System notifications from DB
    sys_notifs = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.id.desc()).limit(15).all()
    admin_notifs = [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.notification_type,
            "is_read": n.is_read,
            "related_id": n.related_id,
            "related_type": n.related_type,
            "created_at": format_iso(n.created_at)
        }
        for n in sys_notifs
    ]

    return {
        "verification_alerts": verification_alerts,
        "transaction_alerts": transaction_alerts,
        "payment_alerts": payment_alerts,
        "grievance_alerts": grievance_alerts,
        "system_notifications": admin_notifs
    }

# ==========================================
# 10. AUDIT LOGS
# ==========================================
@router.get("/audit-logs")
def get_audit_logs(
    entity_type: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if entity_type and entity_type.upper() != "ALL":
        query = query.filter(AuditLog.entity_type == entity_type.upper())

    logs = query.order_by(AuditLog.id.desc()).limit(limit).all()
    result = []
    for l in logs:
        result.append({
            "id": l.id,
            "username": l.username or "admin",
            "role": l.role or "admin",
            "action": l.action,
            "related_record": l.related_record,
            "entity_type": l.entity_type,
            "details": l.details,
            "created_at": format_iso(l.created_at)
        })
    return result

# ==========================================
# PRODUCE & PLATFORM ANALYTICS
# ==========================================
@router.get("/analytics")
def get_analytics(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    # Actual farmer produce records from database
    produce_records = db.query(Produce).filter(Produce.status != "Cancelled").all()
    crop_volume_map = {}
    for p in produce_records:
        c_name = p.crop_name or "Other"
        if c_name not in crop_volume_map:
            crop_volume_map[c_name] = {
                "crop": c_name,
                "quantity_kg": 0,
                "active_listings": 0,
                "total_listings": 0
            }
        crop_volume_map[c_name]["quantity_kg"] += int(p.quantity or 0)
        crop_volume_map[c_name]["total_listings"] += 1
        if p.status == "Available":
            crop_volume_map[c_name]["active_listings"] += 1

    produce_chart_data = sorted(list(crop_volume_map.values()), key=lambda x: x["quantity_kg"], reverse=True)

    return {
        "produce_chart_data": produce_chart_data
    }

