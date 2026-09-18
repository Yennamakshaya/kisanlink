from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.models import User, BuyerProfile, FarmerProfile, Produce, BuyerRequirement, Offer, Agreement, Transaction
from app.schemas import AddRequirementSchema
from app.auth import get_current_user, require_role
from app.recommendation import score_farmer_for_buyer

router = APIRouter(prefix="/api/buyer", tags=["Buyer"])

@router.get("/dashboard-summary")
def get_buyer_dashboard(current_user: User = Depends(require_role("buyer")), db: Session = Depends(get_db)):
    buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer profile not found.")

    reqs = db.query(BuyerRequirement).filter(BuyerRequirement.buyer_id == buyer.id).all()
    active_reqs_count = len([r for r in reqs if r.status == "Active"])

    offers_count = db.query(Offer).filter(
        Offer.buyer_id == buyer.id,
        Offer.status.in_(["Pending", "Negotiating", "ACTIVE", "BUYER_PENDING", "FARMER_PENDING"])
    ).count()

    active_agreements_count = db.query(Agreement).filter(
        Agreement.buyer_id == buyer.id,
        Agreement.status.in_(["Signed", "Draft", "Active", "ACCEPTED"])
    ).count()

    transactions = db.query(Transaction).filter(Transaction.buyer_id == buyer.id).all()

    return {
        "company_name": buyer.company_name,
        "company_id": buyer.company_id,
        "contact_person": buyer.contact_person,
        "phone": current_user.mobile_number,
        "email": current_user.email,
        "verification_status": buyer.verification_status,
        "active_requirements": active_reqs_count,
        "pending_offers": offers_count,
        "active_agreements": active_agreements_count,
        "completed_transactions": len([t for t in transactions if (t.final_status and t.final_status.upper() == "COMPLETED") or (t.payment_status and t.payment_status.upper() in ["VERIFIED", "COMPLETED"])]),
        "rating": buyer.rating,
        "reliability_score": buyer.reliability_score,
        "gstin": buyer.gstin or (buyer.gstin_masked.replace(" (Verified)", "").strip() if buyer.gstin_masked else "36AAAAA0000A1Z5"),
        "pan": buyer.pan or (buyer.pan_masked.strip() if buyer.pan_masked else "ABCDE1234F"),
        "address": buyer.address or "Plot 42, Food Processing Zone, Cherlapally",
        "city": buyer.city,
        "district": buyer.district,
        "state": buyer.state or "Telangana",
        "udyam_number": buyer.udyam_number or "UDYAM-TG-05-0012345",
        "buyer_category": buyer.buyer_category or "Food Processor & Bulk Exporter",
        "certificate_name": (buyer.gst_doc_url.split("/")[-1] if buyer.gst_doc_url else None) or "Business_Registration_Certificate.pdf",
        "certificate_url": buyer.gst_doc_url or "/uploads/Business_Registration_Certificate.pdf"
    }

@router.get("/profile")
def get_buyer_own_profile(current_user: User = Depends(require_role("buyer")), db: Session = Depends(get_db)):
    buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer profile not found.")
    return {
        "id": buyer.id,
        "company_name": buyer.company_name,
        "company_id": buyer.company_id,
        "contact_person": buyer.contact_person,
        "phone": current_user.mobile_number,
        "email": current_user.email,
        "city": buyer.city,
        "district": buyer.district,
        "state": buyer.state or "Telangana",
        "address": buyer.address or "Plot 42, Food Processing Zone, Cherlapally",
        "gstin": buyer.gstin or (buyer.gstin_masked.replace(" (Verified)", "").strip() if buyer.gstin_masked else "36AAAAA0000A1Z5"),
        "pan": buyer.pan or (buyer.pan_masked.strip() if buyer.pan_masked else "ABCDE1234F"),
        "udyam_number": buyer.udyam_number or "UDYAM-TG-05-0012345",
        "buyer_category": buyer.buyer_category or "Food Processor & Bulk Exporter",
        "verification_status": buyer.verification_status,
        "certificate_name": (buyer.gst_doc_url.split("/")[-1] if buyer.gst_doc_url else None) or "Business_Registration_Certificate.pdf",
        "certificate_url": buyer.gst_doc_url or "/uploads/Business_Registration_Certificate.pdf"
    }

@router.get("/requirements")
def get_my_requirements(current_user: User = Depends(require_role("buyer")), db: Session = Depends(get_db)):
    buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
    reqs = db.query(BuyerRequirement).filter(BuyerRequirement.buyer_id == buyer.id).order_by(BuyerRequirement.id.desc()).all()
    result = []
    for r in reqs:
        result.append({
            "id": r.id,
            "crop_name": r.crop_name,
            "variety": r.variety,
            "required_quantity": r.required_quantity,
            "quality": r.quality,
            "min_quality_grade": getattr(r, "min_quality_grade", None) or r.quality or "Grade A",
            "max_price": r.max_price,
            "target_price_min": getattr(r, "target_price_min", None) or round(r.max_price * 0.9, 1),
            "target_price_max": getattr(r, "target_price_max", None) or r.max_price,
            "preferred_district": r.preferred_district,
            "preferred_mandal": r.preferred_mandal,
            "procurement_location": getattr(r, "procurement_location", None) or r.preferred_district or "Direct Procurement Hub",
            "required_by_date": r.required_by_date,
            "pickup_delivery": r.pickup_delivery,
            "payment_terms": getattr(r, "payment_terms", "100% on Quality Confirmation") or "100% on Quality Confirmation",
            "additional_reqs": r.additional_reqs,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None
        })
    return result

@router.post("/requirements")
def add_requirement(payload: AddRequirementSchema, current_user: User = Depends(require_role("buyer")), db: Session = Depends(get_db)):
    buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer profile not found.")

    target_min = payload.target_price_min or round(payload.max_price * 0.9, 1)
    target_max = payload.target_price_max or payload.max_price

    req = BuyerRequirement(
        buyer_id=buyer.id,
        crop_name=payload.crop_name,
        variety=payload.variety,
        required_quantity=payload.required_quantity,
        quality=payload.quality,
        min_quality_grade=payload.min_quality_grade or payload.quality,
        max_price=payload.max_price,
        target_price_min=target_min,
        target_price_max=target_max,
        preferred_district=payload.preferred_district,
        preferred_mandal=payload.preferred_mandal,
        procurement_location=payload.procurement_location or payload.preferred_district or "Direct Procurement Hub",
        required_by_date=payload.required_by_date,
        pickup_delivery=payload.pickup_delivery,
        payment_terms=payload.payment_terms or "100% on Quality Confirmation",
        additional_reqs=payload.additional_reqs,
        status="Active"
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"message": "Procurement requirement posted successfully!", "requirement_id": req.id}

@router.get("/farmers")
def search_farmers(
    crop: Optional[str] = None,
    district: Optional[str] = None,
    quality: Optional[str] = None,
    max_price: Optional[float] = None,
    current_user: User = Depends(require_role("buyer")),
    db: Session = Depends(get_db)
):
    buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
    query = db.query(Produce).filter(Produce.status == "Available")

    if crop:
        query = query.filter(Produce.crop_name.ilike(f"%{crop}%"))
    if district:
        query = query.filter(Produce.district.ilike(f"%{district}%"))
    if quality:
        query = query.filter(Produce.quality == quality)
    if max_price:
        query = query.filter(Produce.expected_price <= max_price)

    produces = query.order_by(Produce.id.desc()).all()
    result = []

    for p in produces:
        farmer = db.query(FarmerProfile).filter(FarmerProfile.id == p.farmer_id).first()
        if not farmer:
            continue
        
        dist_km = 45.0
        if buyer and buyer.district.lower() == farmer.district.lower():
            dist_km = 15.0

        ai_eval = score_farmer_for_buyer({
            "quantity": p.quantity,
            "price": p.expected_price,
            "quality": p.quality,
            "reliability_score": farmer.reliability_score
        }, {"quality": quality or "Grade A"}, distance_km=dist_km)

        result.append({
            "produce_id": p.id,
            "lot_code": getattr(p, "lot_code", None) or f"LOT-{p.id:05d}",
            "is_fpo": getattr(p, "is_fpo", False) or False,
            "fpo_name": getattr(p, "fpo_name", None),
            "aggregated_farmers_count": getattr(p, "aggregated_farmers_count", 1) or 1,
            "quality_parameters": getattr(p, "quality_parameters", "Standard APMC Quality"),
            "farmer_id": farmer.id,
            "farmer_name": farmer.full_name,
            "location": f"{p.village}, {p.mandal}, {p.district}",
            "village": p.village,
            "mandal": p.mandal,
            "district": p.district,
            "farm_size": farmer.farm_size,
            "rating": farmer.rating,
            "completed_transactions": farmer.completed_transactions,
            "reliability_score": farmer.reliability_score,
            "crop_name": p.crop_name,
            "variety": p.variety,
            "quantity": p.quantity,
            "unit": p.unit,
            "quality": p.quality,
            "expected_price": p.expected_price,
            "harvest_date": p.harvest_date,
            "available_from": p.available_from,
            "description": p.description,
            "images": p.images,
            "match_score": ai_eval["match_score"],
            "explanation": ai_eval["explanation"]
        })

    result.sort(key=lambda x: x["match_score"], reverse=True)
    return result
