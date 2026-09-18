import datetime
import random
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.models import (
    User, FarmerProfile, BuyerProfile, Produce, BuyerRequirement, FarmerRequest, Offer, Negotiation,
    Agreement, ProcurementSlot, Procurement, QualityConfirmation, Payment, Transaction,
    RatingFeedback, Grievance, Notification
)
from app.schemas import (
    CreateFarmerRequestSchema, SendOfferOnRequestSchema,
    SendOfferSchema, CounterOfferSchema, SignAgreementSchema, BookSlotSchema,
    QualityConfirmSchema, ProcessPaymentSchema, AddFeedbackSchema, AddGrievanceSchema,
    NegotiateLabourSchema
)
from app.auth import get_current_user
from app.recommendation import calculate_net_realisation
from app.notifications import create_notification, notify_admins

router = APIRouter(prefix="/api/workflow", tags=["Workflow & Lifecycle"])

def format_iso(dt):
    if not dt:
        return None
    if isinstance(dt, str):
        return dt
    if hasattr(dt, "isoformat"):
        s = dt.isoformat()
        if not s.endswith("Z") and "+" not in s:
            s += "Z"
        return s
    return str(dt)

def compute_payment_due_date(base_dt: datetime.datetime, payment_terms_str: Optional[str]) -> str:
    terms = (payment_terms_str or "Within 3 Days").strip().lower()
    if "immediate" in terms:
        due = base_dt
    elif "1 day" in terms:
        due = base_dt + datetime.timedelta(days=1)
    elif "2 day" in terms:
        due = base_dt + datetime.timedelta(days=2)
    elif "3 day" in terms:
        due = base_dt + datetime.timedelta(days=3)
    elif "7 day" in terms:
        due = base_dt + datetime.timedelta(days=7)
    else:
        import re
        m = re.search(r'(\d+)\s*day', terms)
        if m:
            days = int(m.group(1))
            due = base_dt + datetime.timedelta(days=days)
        else:
            due = base_dt + datetime.timedelta(days=3)
    return due.strftime("%Y-%m-%d")

def calculate_delay_details(due_date_str: Optional[str], base_amount: float, as_of_date: Optional[datetime.date] = None) -> tuple:
    """
    If payment is delayed beyond the agreed time, the buyer must pay an additional delay amount to the farmer.
    Standard: ₹250/day or 0.5% of transaction amount per day (whichever is greater).
    """
    if not due_date_str:
        return 0.0, 0
    try:
        due_date = datetime.datetime.strptime(due_date_str.split("T")[0], "%Y-%m-%d").date()
        current_date = as_of_date or datetime.datetime.utcnow().date()
        if current_date > due_date:
            days_delayed = (current_date - due_date).days
            if days_delayed > 0:
                daily_charge = max(250.0, round((base_amount or 0.0) * 0.005, 2))
                delay_amount = round(days_delayed * daily_charge, 2)
                return delay_amount, days_delayed
    except Exception:
        pass
    return 0.0, 0

def get_farmer_mobile_and_upi(farmer, default_mobile="9876543210"):
    if not farmer:
        return None, "farmer@upi"
    user = getattr(farmer, "user", None)
    mobile = getattr(user, "mobile_number", None) if user else None
    mobile_val = mobile or default_mobile
    return mobile, f"{mobile_val}@upi"

def format_farmer_request(req: FarmerRequest, db: Session):
    f = req.farmer
    b = req.buyer
    p = req.produce
    est_value = round((req.quantity or 0) * (req.expected_price or 0), 2)
    return {
        "id": req.id,
        "request_id": req.id,
        "request_code": req.request_code or f"REQ-2026-{req.id:04d}",
        "farmer_id": req.farmer_id,
        "farmer_user_id": f.user_id if f else None,
        "farmer_name": f.full_name if f else "Farmer",
        "farmer_location": f"{f.village}, {f.district}" if f else "Local Farm",
        "farmer_district": f.district if f else "District",
        "farmer_rating": f.rating if f else 4.8,
        "farmer_reliability": f.reliability_score if f else 95.0,
        "buyer_id": req.buyer_id,
        "buyer_profile_id": b.id if b else req.buyer_id,
        "buyer_user_id": b.user_id if b else None,
        "buyer_company": b.company_name if b else "Buyer",
        "buyer_name": b.contact_person if b else "Manager",
        "buyer_location": f"{b.city}, {b.district}" if b else "Procurement Hub",
        "buyer_district": b.district if b else "Regional Hub",
        "buyer_rating": b.rating if b else 4.7,
        "buyer_reliability": b.reliability_score if b else 94.0,
        "produce_id": req.produce_id,
        "requirement_id": req.requirement_id,
        "crop_name": req.crop_name,
        "quantity": req.quantity,
        "quality": req.quality or "Grade A",
        "expected_price": req.expected_price,
        "farmer_expected_price": req.expected_price,
        "estimated_value": est_value,
        "message": req.message,
        "status": req.status,
        "offer_id": req.offer_id,
        "negotiation_id": f"NEG-{req.offer_id:04d}" if req.offer_id else None,
        "accepted_at": format_iso(getattr(req, "accepted_at", None)),
        "accepted_by": getattr(req, "accepted_by", None),
        "rejected_at": format_iso(getattr(req, "rejected_at", None)),
        "rejected_by": getattr(req, "rejected_by", None),
        "created_at": format_iso(req.created_at),
        "updated_at": format_iso(req.updated_at)
    }

# 0. FARMER PROCUREMENT REQUESTS
@router.post("/requests")
def create_farmer_request(payload: CreateFarmerRequestSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "farmer":
        raise HTTPException(status_code=403, detail="Only farmers can send procurement requests.")
    farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if not farmer:
        raise HTTPException(status_code=400, detail="Farmer profile not found for this user.")

    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero.")
    if payload.farmer_expected_price <= 0:
        raise HTTPException(status_code=400, detail="Expected price must be greater than zero.")

    # Resolve buyer
    buyer = db.query(BuyerProfile).filter((BuyerProfile.id == payload.buyer_id) | (BuyerProfile.user_id == payload.buyer_id)).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Selected buyer not found.")

    # Duplicate check: check if pending request already exists between farmer and buyer for this crop/lot
    existing_req = None
    if payload.produce_id:
        existing_req = db.query(FarmerRequest).filter(
            FarmerRequest.farmer_id == farmer.id,
            FarmerRequest.buyer_id == buyer.id,
            FarmerRequest.produce_id == payload.produce_id,
            FarmerRequest.status == "PENDING"
        ).first()

    if not existing_req:
        existing_req = db.query(FarmerRequest).filter(
            FarmerRequest.farmer_id == farmer.id,
            FarmerRequest.buyer_id == buyer.id,
            FarmerRequest.crop_name.ilike(f"%{payload.crop_name}%"),
            FarmerRequest.status == "PENDING"
        ).first()

    if existing_req:
        raise HTTPException(status_code=400, detail="An active request already exists for this buyer.")

    req_count = db.query(FarmerRequest).count() + 1
    req_code = f"REQ-2026-{req_count:04d}"

    farmer_req = FarmerRequest(
        request_code=req_code,
        farmer_id=farmer.id,
        buyer_id=buyer.id,
        produce_id=payload.produce_id,
        requirement_id=payload.requirement_id,
        crop_name=payload.crop_name,
        quantity=payload.quantity,
        quality=payload.quality or "Grade A",
        expected_price=payload.farmer_expected_price,
        message=payload.message or f"Request for {payload.crop_name} ({payload.quantity} kg) at expected ₹{payload.farmer_expected_price}/kg.",
        status="PENDING"
    )
    db.add(farmer_req)
    db.commit()
    db.refresh(farmer_req)

    # Real notification for buyer
    if buyer.user_id:
        create_notification(
            db=db,
            user_id=buyer.user_id,
            title="New Procurement Request",
            message=f"Farmer {farmer.full_name} submitted a procurement request for {payload.crop_name} ({payload.quantity} kg) at ₹{payload.farmer_expected_price}/kg.",
            notification_type="FARMER_REQUEST",
            related_id=str(farmer_req.id),
            related_type="FARMER_REQUEST"
        )

    return {
        "message": "Request sent successfully!",
        "request_id": farmer_req.id,
        "request_code": farmer_req.request_code,
        "status": farmer_req.status
    }

@router.get("/requests")
def get_farmer_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "farmer":
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        farmer_ids = [current_user.id]
        if farmer:
            farmer_ids.append(farmer.id)
        requests = db.query(FarmerRequest).filter(FarmerRequest.farmer_id.in_(farmer_ids)).order_by(FarmerRequest.id.desc()).all()
    elif current_user.role == "buyer":
        buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
        buyer_ids = [current_user.id]
        if buyer:
            buyer_ids.append(buyer.id)
        requests = db.query(FarmerRequest).filter(FarmerRequest.buyer_id.in_(buyer_ids)).order_by(FarmerRequest.id.desc()).all()
    else:
        requests = db.query(FarmerRequest).order_by(FarmerRequest.id.desc()).all()

    return [format_farmer_request(r, db) for r in requests]

@router.get("/requests/{request_id}")
def get_single_farmer_request(request_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    req = db.query(FarmerRequest).filter(FarmerRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    return format_farmer_request(req, db)

@router.post("/requests/{request_id}/accept")
def accept_farmer_request(request_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "buyer":
        raise HTTPException(status_code=403, detail="Only buyers can accept requests.")
    buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
    if not buyer:
        raise HTTPException(status_code=400, detail="Buyer profile not found for this user.")

    req = db.query(FarmerRequest).filter(FarmerRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    if req.buyer_id != buyer.id and req.buyer_id != buyer.user_id and req.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to accept this request.")
    if req.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Request is already {req.status.lower()}.")

    # Update the SAME request record
    now = datetime.datetime.utcnow()
    req.status = "ACCEPTED"
    req.accepted_at = now
    req.accepted_by = buyer.id
    req.updated_at = now

    qty = req.quantity
    price = req.expected_price
    gross_val = round(qty * price, 2)
    transport_cost = 0.0
    storage_cost = 0.0
    net_calc = calculate_net_realisation(qty, price, transport_cost=transport_cost, storage_cost=storage_cost)
    net_realisation = net_calc.get("net_realisation", gross_val)
    pickup_date = (datetime.date.today() + datetime.timedelta(days=2)).isoformat()
    delivery_location = f"Farmer Farm Site ({req.farmer.village}, {req.farmer.district})" if req.farmer else "Farmer Farm Site"
    payment_terms = "Within 3 Days"

    # Create or activate the negotiation using the SAME:
    # requestId, farmerId, buyerId, produceId
    offer = Offer(
        request_id=req.id,
        produce_id=req.produce_id,
        requirement_id=req.requirement_id,
        farmer_id=req.farmer_id,
        buyer_id=buyer.id,
        crop_name=req.crop_name,
        quantity=qty,
        quality=req.quality or "Grade A",
        price_per_kg=price,
        total_value=gross_val,
        transport_cost=transport_cost,
        storage_cost=storage_cost,
        cold_storage_required=False,
        storage_duration=None,
        net_realisation=net_realisation,
        pickup_date=pickup_date,
        delivery_location=delivery_location,
        payment_terms=payment_terms,
        message=f"Request Accepted! Terms agreed at ₹{price}/kg for {qty} kg {req.crop_name}.",
        status="FARMER_PENDING",
        sender_role="buyer",
        current_offer_by="buyer"
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)

    # Add initial negotiation record
    neg = Negotiation(
        offer_id=offer.id,
        request_id=req.id,
        sender_id=current_user.id,
        sender_role="buyer",
        sender_name=buyer.company_name,
        receiver_id=req.farmer.user_id if req.farmer else None,
        price_per_kg=price,
        quantity=qty,
        payment_terms=payment_terms,
        cold_storage_required=False,
        storage_cost=storage_cost,
        storage_duration=None,
        message=f"Procurement Request Accepted by {buyer.company_name}: ₹{price}/kg for {qty} kg {req.crop_name}.",
        status="ACTIVE"
    )
    db.add(neg)

    # Link offer back to the request
    req.offer_id = offer.id
    db.commit()

    # Real-time notification for Farmer
    if req.farmer and req.farmer.user_id:
        create_notification(
            db=db,
            user_id=req.farmer.user_id,
            title="Procurement Request Accepted",
            message=f"Buyer {buyer.company_name} ACCEPTED your procurement request for {req.crop_name} ({qty} kg) at ₹{price}/kg. Negotiation is now active!",
            notification_type="NEGOTIATION_OFFER",
            related_id=f"NEG-{offer.id:04d}",
            related_type="NEGOTIATION"
        )

    return {
        "message": "Request Accepted",
        "status": "ACCEPTED",
        "request_id": req.id,
        "offer_id": offer.id,
        "negotiation_id": f"NEG-{offer.id:04d}"
    }

@router.post("/requests/{request_id}/offer")
def send_offer_on_request(request_id: int, payload: SendOfferOnRequestSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "buyer":
        raise HTTPException(status_code=403, detail="Only buyers can respond with an official offer.")
    buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
    if not buyer:
        raise HTTPException(status_code=400, detail="Buyer profile not found for this user.")

    req = db.query(FarmerRequest).filter(FarmerRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    if req.buyer_id != buyer.id and req.buyer_id != buyer.user_id and req.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to respond to this request.")
    if req.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Request is already {req.status.lower()}.")

    if payload.offered_price <= 0:
        raise HTTPException(status_code=400, detail="Offered price must be greater than zero.")

    qty = payload.quantity if (payload.quantity and payload.quantity > 0) else req.quantity
    gross_val = round(qty * payload.offered_price, 2)
    transport_cost = 0.0
    cold_storage_req = bool(payload.cold_storage_required)
    storage_cost = float(payload.storage_cost or 0.0) if cold_storage_req else 0.0
    storage_duration = payload.storage_duration if cold_storage_req else None
    payment_terms = payload.payment_terms or "Within 3 Days"

    net_calc = calculate_net_realisation(qty, payload.offered_price, transport_cost=transport_cost, storage_cost=storage_cost)
    net_realisation = net_calc.get("net_realisation", max(0.0, round(gross_val - storage_cost, 2)))

    pickup_date = payload.pickup_date or (datetime.date.today() + datetime.timedelta(days=2)).isoformat()
    delivery_location = payload.delivery_location or (f"Farmer Farm Site ({req.farmer.village}, {req.farmer.district})" if req.farmer else "Farmer Farm Site")

    # Create the Offer
    offer = Offer(
        request_id=req.id,
        produce_id=req.produce_id,
        requirement_id=req.requirement_id,
        farmer_id=req.farmer_id,
        buyer_id=buyer.id,
        crop_name=req.crop_name,
        quantity=qty,
        quality=req.quality or "Grade A",
        price_per_kg=payload.offered_price,
        total_value=gross_val,
        transport_cost=transport_cost,
        storage_cost=storage_cost,
        cold_storage_required=cold_storage_req,
        storage_duration=storage_duration,
        net_realisation=net_realisation,
        pickup_date=pickup_date,
        delivery_location=delivery_location,
        payment_terms=payment_terms,
        message=payload.message or f"Official Offer: ₹{payload.offered_price}/kg for {qty} kg {req.crop_name}.",
        status="FARMER_PENDING",
        sender_role="buyer",
        current_offer_by="buyer"
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)

    # Create initial negotiation history step
    neg = Negotiation(
        offer_id=offer.id,
        request_id=req.id,
        sender_id=current_user.id,
        sender_role="buyer",
        sender_name=buyer.company_name,
        receiver_id=req.farmer.user_id if req.farmer else None,
        price_per_kg=payload.offered_price,
        quantity=qty,
        payment_terms=payment_terms,
        cold_storage_required=cold_storage_req,
        storage_cost=storage_cost,
        storage_duration=storage_duration,
        message=payload.message or f"Official Offer: ₹{payload.offered_price}/kg for {qty} kg {req.crop_name} by {buyer.company_name}.",
        status="ACTIVE"
    )
    db.add(neg)

    # Link offer back to the request and mark request as ACCEPTED
    now = datetime.datetime.utcnow()
    req.status = "ACCEPTED"
    req.accepted_at = now
    req.accepted_by = buyer.id
    req.offer_id = offer.id
    req.updated_at = now
    db.commit()

    # Notify Farmer
    if req.farmer and req.farmer.user_id:
        create_notification(
            db=db,
            user_id=req.farmer.user_id,
            title="Official Offer Received",
            message=f"Buyer {buyer.company_name} made an official offer of ₹{payload.offered_price}/kg for {req.crop_name} ({qty} kg).",
            notification_type="NEGOTIATION_OFFER",
            related_id=f"NEG-{offer.id:04d}",
            related_type="NEGOTIATION"
        )

    return {
        "message": "Offer sent to farmer successfully!",
        "offer_id": offer.id,
        "negotiation_id": f"NEG-{offer.id:04d}",
        "request_id": req.id,
        "status": offer.status
    }

@router.post("/requests/{request_id}/reject")
def reject_farmer_request(request_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "buyer":
        raise HTTPException(status_code=403, detail="Only buyers can reject requests.")
    buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
    if not buyer:
        raise HTTPException(status_code=400, detail="Buyer profile not found.")

    req = db.query(FarmerRequest).filter(FarmerRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    if req.buyer_id != buyer.id and req.buyer_id != buyer.user_id and req.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to reject this request.")
    if req.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Request is already {req.status.lower()}.")

    now = datetime.datetime.utcnow()
    req.status = "REJECTED"
    req.rejected_at = now
    req.rejected_by = buyer.id
    req.updated_at = now
    db.commit()

    if req.farmer and req.farmer.user_id:
        create_notification(
            db=db,
            user_id=req.farmer.user_id,
            title="Procurement Request Declined",
            message=f"Buyer {buyer.company_name} declined your procurement request for {req.crop_name}.",
            notification_type="REQUEST_REJECTED",
            related_id=str(req.id),
            related_type="FARMER_REQUEST"
        )

    return {
        "message": "Request Rejected",
        "status": "REJECTED",
        "request_id": req.id,
        "rejected_at": req.rejected_at.strftime("%I:%M %p, %b %d") if req.rejected_at else None,
        "rejected_by": req.rejected_by
    }

# 1. OFFERS & NEGOTIATION
@router.post("/offers")
def send_offer(payload: SendOfferSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.price_per_kg <= 0:
        raise HTTPException(status_code=400, detail="Price per kg must be greater than zero.")
    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero.")

    farmer_id = payload.farmer_id
    buyer_id = payload.buyer_id
    sender_name = "User"

    if current_user.role == "farmer":
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        if not farmer:
            raise HTTPException(status_code=400, detail="Farmer profile not found for this user.")
        farmer_id = farmer.id
        sender_name = farmer.full_name
        initial_status = "BUYER_PENDING"
        current_offer_by = "farmer"
        
        # Resolve target buyer
        if buyer_id:
            b = db.query(BuyerProfile).filter((BuyerProfile.id == buyer_id) | (BuyerProfile.user_id == buyer_id)).first()
            buyer_id = b.id if b else buyer_id
        if not buyer_id:
            b = db.query(BuyerProfile).filter(BuyerProfile.verification_status == "verified").first()
            buyer_id = b.id if b else 1
    elif current_user.role == "buyer":
        buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
        if not buyer:
            raise HTTPException(status_code=400, detail="Buyer profile not found for this user.")
        buyer_id = buyer.id
        sender_name = buyer.company_name
        initial_status = "FARMER_PENDING"
        current_offer_by = "buyer"
        
        # Resolve target farmer
        if farmer_id:
            f = db.query(FarmerProfile).filter((FarmerProfile.id == farmer_id) | (FarmerProfile.user_id == farmer_id)).first()
            farmer_id = f.id if f else farmer_id
        if not farmer_id:
            f = db.query(FarmerProfile).first()
            farmer_id = f.id if f else 1
    else:
        initial_status = "BUYER_PENDING"
        current_offer_by = "farmer"
        sender_name = "Admin"
        farmer_id = farmer_id or 1
        buyer_id = buyer_id or 1

    total_val = round(payload.quantity * payload.price_per_kg, 2)
    transport_cost = 0.0
    cold_storage_req = bool(payload.cold_storage_required)
    storage_cost = float(payload.storage_cost or 0.0) if cold_storage_req else 0.0
    storage_duration = payload.storage_duration if cold_storage_req else None
    payment_terms = payload.payment_terms or "Within 3 Days"

    net_calc = calculate_net_realisation(payload.quantity, payload.price_per_kg, transport_cost=transport_cost, storage_cost=storage_cost)
    net_realisation = net_calc.get("net_realisation", max(0.0, round(total_val - storage_cost, 2)))

    pickup_date = payload.pickup_date or (datetime.date.today() + datetime.timedelta(days=2)).isoformat()
    delivery_location = payload.delivery_location or "Farmer Farm Site"

    # Check if an active negotiation ALREADY EXISTS between this farmer and buyer for this crop/lot
    existing_offer = None
    if payload.produce_id:
        existing_offer = db.query(Offer).filter(
            Offer.farmer_id == farmer_id,
            Offer.buyer_id == buyer_id,
            Offer.produce_id == payload.produce_id,
            Offer.status.in_(["ACTIVE", "BUYER_PENDING", "FARMER_PENDING", "Pending", "Negotiating", "Draft"])
        ).first()

    if not existing_offer:
        existing_offer = db.query(Offer).filter(
            Offer.farmer_id == farmer_id,
            Offer.buyer_id == buyer_id,
            Offer.crop_name.ilike(f"%{payload.crop_name}%"),
            Offer.status.in_(["ACTIVE", "BUYER_PENDING", "FARMER_PENDING", "Pending", "Negotiating", "Draft"])
        ).first()

    if existing_offer:
        # Re-use existing negotiation container so both participants remain in ONE conversation
        offer = existing_offer
        offer.price_per_kg = payload.price_per_kg
        offer.quantity = payload.quantity
        offer.quality = payload.quality or offer.quality or "Grade A"
        if payload.request_id:
            offer.request_id = payload.request_id
        offer.total_value = total_val
        offer.transport_cost = 0.0
        offer.storage_cost = storage_cost
        offer.cold_storage_required = cold_storage_req
        offer.storage_duration = storage_duration
        offer.payment_terms = payment_terms
        offer.net_realisation = net_realisation
        offer.status = initial_status
        offer.current_offer_by = current_offer_by
        offer.updated_at = datetime.datetime.utcnow()
        if payload.message:
            offer.message = payload.message
        db.commit()
    else:
        # Create single negotiation record
        offer = Offer(
            request_id=payload.request_id,
            produce_id=payload.produce_id,
            requirement_id=payload.requirement_id,
            farmer_id=farmer_id,
            buyer_id=buyer_id,
            crop_name=payload.crop_name,
            quantity=payload.quantity,
            quality=payload.quality or "Grade A",
            price_per_kg=payload.price_per_kg,
            total_value=total_val,
            transport_cost=transport_cost,
            storage_cost=storage_cost,
            cold_storage_required=cold_storage_req,
            storage_duration=storage_duration,
            net_realisation=net_realisation,
            pickup_date=pickup_date,
            delivery_location=delivery_location,
            payment_terms=payment_terms,
            message=payload.message or f"Initial offer: ₹{payload.price_per_kg}/kg for {payload.quantity} kg {payload.crop_name}",
            status=initial_status,
            sender_role=current_user.role,
            current_offer_by=current_offer_by
        )
        db.add(offer)
        db.commit()
        db.refresh(offer)

    # Link request if provided
    if payload.request_id:
        req = db.query(FarmerRequest).filter(FarmerRequest.id == payload.request_id).first()
        if req:
            req.status = "ACCEPTED"
            req.offer_id = offer.id
            req.updated_at = datetime.datetime.utcnow()
            db.commit()

    # Append offer entry to the negotiation history with the SAME negotiation_id
    recipient_user_id = offer.buyer.user_id if current_user.role == "farmer" and offer.buyer else (offer.farmer.user_id if offer.farmer else None)
    neg = Negotiation(
        offer_id=offer.id,
        request_id=payload.request_id or offer.request_id,
        sender_id=current_user.id,
        sender_role=current_user.role,
        sender_name=sender_name,
        receiver_id=recipient_user_id,
        price_per_kg=payload.price_per_kg,
        quantity=payload.quantity,
        payment_terms=payment_terms,
        cold_storage_required=cold_storage_req,
        storage_cost=storage_cost,
        storage_duration=storage_duration,
        message=payload.message or f"Offer: ₹{payload.price_per_kg}/kg for {payload.quantity} kg",
        status="ACTIVE"
    )
    db.add(neg)
    db.commit()
    
    # Notify recipient (Buyer if farmer sent offer, Farmer if buyer sent offer)
    if recipient_user_id:
        create_notification(
            db=db,
            user_id=recipient_user_id,
            title="New Offer Received",
            message=f"{('A farmer' if current_user.role == 'farmer' else 'A buyer')} has sent you a new offer for {payload.crop_name}: ₹{payload.price_per_kg}/kg for {payload.quantity} kg.",
            notification_type="NEGOTIATION_OFFER",
            related_id=f"NEG-{offer.id:04d}",
            related_type="NEGOTIATION"
        )

    return {
        "message": "Offer sent successfully!",
        "offer_id": offer.id,
        "negotiation_id": f"NEG-{offer.id:04d}",
        "negotiation_code": f"NEG-{offer.id:04d}",
        "status": offer.status
    }

def format_negotiation_payload(o: Offer, current_user: User, db: Session):
    negs = db.query(Negotiation).filter(Negotiation.offer_id == o.id).order_by(Negotiation.id.asc()).all()

    # Benchmark prices for crops
    benchmark_map = {
        "tomato": 28.0,
        "paddy": 23.5,
        "cotton": 70.0,
        "maize": 20.5,
        "chilli": 190.0,
        "turmeric": 140.0,
        "onion": 22.0,
        "red gram": 66.0
    }
    
    crop_lower = (o.crop_name or "").lower().strip()
    market_benchmark = benchmark_map.get(crop_lower, 28.0)
    
    gross_val = round(o.quantity * o.price_per_kg, 2)
    trans_cost = 0.0 # Platform transport cost is ₹0 (handled by farmer, not deducted by KisanLink)
    stor_cost = getattr(o, "storage_cost", 0.0) or 0.0
    net_real = max(0.0, round(gross_val - stor_cost, 2))
    net_per_kg = round(net_real / o.quantity, 2) if o.quantity > 0 else o.price_per_kg

    target_rec_price = round(max(market_benchmark, o.price_per_kg * 1.05), 1)
    ai_reason = f"Based on APMC market benchmark rate (₹{market_benchmark}/kg), farmgate procurement, and optimal net profit margin with zero transport deductions."

    # Turn calculation
    user_role = (current_user.role or "").lower()
    offer_status = o.status.upper() if o.status else "ACTIVE"
    is_my_turn = False
    
    last_sender_role = (negs[-1].sender_role.lower() if negs and negs[-1].sender_role else (o.current_offer_by or "buyer")).lower()
    effective_current_offer_by = (o.current_offer_by or last_sender_role).lower()

    if offer_status in ["ACCEPTED", "REJECTED"]:
        is_my_turn = False
        turn_status = "Accepted" if offer_status == "ACCEPTED" else "Rejected"
    elif offer_status == "BUYER_PENDING":
        is_my_turn = (user_role == "buyer")
        turn_status = "Your Response Required" if is_my_turn else "Waiting for Buyer Response"
    elif offer_status == "FARMER_PENDING":
        is_my_turn = (user_role == "farmer")
        turn_status = "Your Response Required" if is_my_turn else "Waiting for Farmer Response"
    else:
        is_my_turn = (effective_current_offer_by != user_role)
        turn_status = "Your Response Required" if is_my_turn else f"Waiting for {('Buyer' if user_role == 'farmer' else 'Farmer')} Response"

    agr = None
    if o.agreement_id:
        agr = db.query(Agreement).filter(Agreement.id == o.agreement_id).first()

    first_buyer_offer = o.price_per_kg
    for n in negs:
        if n.sender_role == "buyer":
            first_buyer_offer = n.price_per_kg
            break

    formatted_negotiations = [
        {
            "id": n.id,
            "offer_id": n.id,
            "negotiation_id": f"NEG-{o.id:04d}",
            "sender_id": n.sender_id,
            "sender_role": n.sender_role,
            "sender_name": n.sender_name,
            "price_per_kg": n.price_per_kg,
            "offered_price": n.price_per_kg,
            "quantity": n.quantity,
            "gross_value": round(n.quantity * n.price_per_kg, 2),
            "payment_terms": getattr(n, "payment_terms", "Within 3 Days") or o.payment_terms or "Within 3 Days",
            "cold_storage_required": getattr(n, "cold_storage_required", False) or False,
            "storage_cost": getattr(n, "storage_cost", 0.0) or 0.0,
            "storage_duration": getattr(n, "storage_duration", None),
            "message": n.message,
            "status": n.status,
            "created_at": format_iso(n.created_at)
        } for n in negs
    ]

    return {
        "id": o.id,
        "offer_id": o.id,
        "negotiation_id": f"NEG-{o.id:04d}",
        "negotiation_code": f"NEG-{o.id:04d}",
        "produce_id": o.produce_id,
        "lot_id": o.produce_id,
        "request_id": o.request_id,
        "requirement_id": o.requirement_id,
        "crop": o.crop_name,
        "crop_name": o.crop_name,
        "quality": getattr(o, "quality", "Grade A") or "Grade A",
        "farmer_id": o.farmer_id,
        "farmer_name": o.farmer.full_name if o.farmer else "Farmer",
        "farmer_location": f"{o.farmer.village}, {o.farmer.district}" if o.farmer else "Local Market",
        "farmer_district": o.farmer.district if o.farmer else "Local District",
        "farmer_rating": o.farmer.rating if o.farmer else 4.8,
        "farmer_reliability": o.farmer.reliability_score if o.farmer else 95.0,
        "buyer_id": o.buyer_id,
        "buyer_company": o.buyer.company_name if o.buyer else "Buyer",
        "buyer_name": o.buyer.contact_person if o.buyer else "Manager",
        "buyer_contact": o.buyer.contact_person if o.buyer else "Manager",
        "buyer_location": f"{o.buyer.city}, {o.buyer.district}" if o.buyer else "Procurement Center",
        "buyer_district": o.buyer.district if o.buyer else "Regional Hub",
        "buyer_rating": o.buyer.rating if o.buyer else 4.7,
        "buyer_reliability": o.buyer.reliability_score if o.buyer else 94.0,
        "quantity": o.quantity,
        "price_per_kg": o.price_per_kg,
        "current_offer": o.price_per_kg,
        "current_offer_by": effective_current_offer_by,
        "latest_offer_from": "Farmer" if effective_current_offer_by == "farmer" else "Buyer",
        "total_value": gross_val,
        "transport_cost": 0.0,
        "storage_cost": stor_cost,
        "cold_storage_required": getattr(o, "cold_storage_required", False) or False,
        "storage_duration": getattr(o, "storage_duration", None),
        "net_realisation": net_real,
        "net_price_per_kg": net_per_kg,
        "market_price_benchmark": market_benchmark,
        "buyer_initial_offer": first_buyer_offer,
        "ai_target_price": target_rec_price,
        "ai_explanation": ai_reason,
        "pickup_date": o.pickup_date,
        "delivery_location": o.delivery_location,
        "payment_terms": o.payment_terms or "Within 3 Days",
        "status": o.status,
        "sender_role": o.sender_role,
        "is_my_turn": is_my_turn,
        "turn_status": turn_status,
        "agreed_price": o.agreed_price,
        "agreed_quantity": o.agreed_quantity,
        "accepted_at": format_iso(getattr(o, "accepted_at", None)),
        "agreement_id": o.agreement_id,
        "agreement_code": agr.agreement_code if agr else None,
        "created_at": format_iso(o.created_at),
        "updated_at": format_iso(o.updated_at) or format_iso(o.created_at),
        "negotiations": formatted_negotiations,
        "offers": formatted_negotiations
    }

@router.get("/offers")
def get_user_offers(offer_id: Optional[int] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if offer_id:
        offers = db.query(Offer).filter(Offer.id == offer_id).all()
    elif current_user.role == "farmer":
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        if not farmer:
            return []
        offers = db.query(Offer).filter((Offer.farmer_id == farmer.id) | (Offer.farmer_id == current_user.id)).order_by(Offer.id.desc()).all()
    elif current_user.role == "buyer":
        buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
        if not buyer:
            return []
        offers = db.query(Offer).filter((Offer.buyer_id == buyer.id) | (Offer.buyer_id == buyer.user_id)).order_by(Offer.id.desc()).all()
    else:
        offers = db.query(Offer).order_by(Offer.id.desc()).all()

    return [format_negotiation_payload(o, current_user, db) for o in offers]

@router.get("/offers/{offer_id}")
def get_single_offer(offer_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Negotiation not found.")
    
    # Authorization check
    if current_user.role == "farmer":
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        if not farmer or (offer.farmer_id != farmer.id and offer.farmer_id != current_user.id):
            raise HTTPException(status_code=403, detail="Unauthorized to view this negotiation.")
    elif current_user.role == "buyer":
        buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
        if not buyer or (offer.buyer_id != buyer.id and offer.buyer_id != buyer.user_id):
            raise HTTPException(status_code=403, detail="Unauthorized to view this negotiation.")

    return format_negotiation_payload(offer, current_user, db)

@router.get("/negotiations/{negotiation_id}")
def get_single_negotiation(negotiation_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_single_offer(offer_id=negotiation_id, current_user=current_user, db=db)

@router.post("/offers/{offer_id}/counter")
def counter_offer(offer_id: int, payload: CounterOfferSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.price_per_kg <= 0:
        raise HTTPException(status_code=400, detail="Counter price must be greater than zero.")

    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Negotiation not found.")

    if offer.status in ["ACCEPTED", "Accepted"]:
        raise HTTPException(status_code=400, detail="Negotiation has already been accepted and locked.")
    if offer.status in ["REJECTED", "Rejected"]:
        raise HTTPException(status_code=400, detail="Negotiation has been rejected.")

    qty = payload.quantity if (payload.quantity and payload.quantity > 0) else offer.quantity
    gross_val = round(qty * payload.price_per_kg, 2)
    trans_cost = 0.0 # Platform transport cost is ₹0 (handled by farmer, not deducted by KisanLink)
    cold_storage_req = payload.cold_storage_required if payload.cold_storage_required is not None else getattr(offer, "cold_storage_required", False)
    stor_cost = float(payload.storage_cost or 0.0) if cold_storage_req else 0.0
    storage_dur = payload.storage_duration if cold_storage_req else None
    payment_terms = payload.payment_terms or offer.payment_terms or "Within 3 Days"
    net_real = max(0.0, round(gross_val - stor_cost, 2))

    offer.price_per_kg = payload.price_per_kg
    offer.quantity = qty
    offer.total_value = gross_val
    offer.transport_cost = 0.0
    offer.storage_cost = stor_cost
    offer.cold_storage_required = bool(cold_storage_req)
    offer.storage_duration = storage_dur
    offer.payment_terms = payment_terms
    offer.net_realisation = net_real
    offer.updated_at = datetime.datetime.utcnow()

    user_role = (current_user.role or "").lower()
    if user_role == "farmer":
        offer.status = "BUYER_PENDING"
        offer.current_offer_by = "farmer"
        sender_name = offer.farmer.full_name if offer.farmer else "Farmer"
        recipient_user_id = offer.buyer.user_id if offer.buyer else None
    else:
        offer.status = "FARMER_PENDING"
        offer.current_offer_by = "buyer"
        sender_name = offer.buyer.company_name if offer.buyer else "Buyer"
        recipient_user_id = offer.farmer.user_id if offer.farmer else None

    # CRITICAL: Append new offer record to SAME negotiation_id
    neg = Negotiation(
        offer_id=offer.id,
        sender_id=current_user.id,
        sender_role=user_role,
        sender_name=sender_name,
        price_per_kg=payload.price_per_kg,
        quantity=qty,
        payment_terms=payment_terms,
        cold_storage_required=bool(cold_storage_req),
        storage_cost=stor_cost,
        storage_duration=storage_dur,
        message=payload.message or f"Counter offer: ₹{payload.price_per_kg}/kg for {qty} kg ({sender_name})",
        status="ACTIVE"
    )
    db.add(neg)
    db.commit()

    # Notify recipient
    if recipient_user_id:
        create_notification(
            db=db,
            user_id=recipient_user_id,
            title="New Counter Offer",
            message=f"The {('farmer' if user_role == 'farmer' else 'buyer')} has sent you a counter-offer: ₹{payload.price_per_kg}/kg ({qty} kg) for {offer.crop_name}.",
            notification_type="NEGOTIATION_COUNTER",
            related_id=f"NEG-{offer.id:04d}",
            related_type="NEGOTIATION"
        )

    return {
        "message": "Counter offer submitted successfully.",
        "offer_id": offer.id,
        "negotiation_id": f"NEG-{offer.id:04d}",
        "status": offer.status
    }

@router.post("/offers/{offer_id}/accept")
def accept_offer(offer_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Negotiation not found.")

    if offer.status in ["REJECTED", "Rejected"]:
        raise HTTPException(status_code=400, detail="Cannot accept a rejected negotiation.")

    offer.status = "ACCEPTED"
    offer.agreed_price = offer.price_per_kg
    offer.agreed_quantity = offer.quantity
    offer.accepted_by = current_user.role
    offer.accepted_at = datetime.datetime.utcnow()
    offer.updated_at = datetime.datetime.utcnow()
    
    # Financial calculation
    transport_cost = 0.0 # Platform transport cost is ₹0 (handled by farmer, not deducted by KisanLink)
    cold_storage_req = getattr(offer, "cold_storage_required", False) or False
    storage_cost = float(getattr(offer, "storage_cost", 0.0) or 0.0) if cold_storage_req else 0.0
    storage_dur = getattr(offer, "storage_duration", None) if cold_storage_req else None
    negotiated_timing = getattr(offer, "payment_terms", "Within 3 Days") or "Within 3 Days"
    payment_terms = "Payment as per Negotiation"

    gross_val = round(offer.quantity * offer.price_per_kg, 2)
    net_real = max(0.0, round(gross_val - storage_cost, 2))
    offer.net_realisation = net_real
    offer.transport_cost = 0.0
    offer.storage_cost = storage_cost

    agr_code = f"AGR-KL-2026-{offer.id:04d}"
    farmer_name = offer.farmer.full_name if offer.farmer else "Farmer"
    farmer_loc = f"{offer.farmer.village}, {offer.farmer.district}" if offer.farmer else "Local Market"
    buyer_name = offer.buyer.company_name if offer.buyer else "Buyer"
    buyer_gst = offer.buyer.gstin_masked if offer.buyer else "Verified"
    buyer_loc = f"{offer.buyer.city}, {offer.buyer.district}" if offer.buyer else "Procurement Center"

    # Generate or retrieve Digital Agreement
    agreement = None
    if offer.agreement_id:
        agreement = db.query(Agreement).filter(Agreement.id == offer.agreement_id).first()
    if not agreement:
        agreement = db.query(Agreement).filter(Agreement.offer_id == offer.id).first()

    lot_id = f"LOT-PROD-{offer.produce_id}" if offer.produce_id else f"LOT-{offer.id:04d}"
    today_date = datetime.date.today().isoformat()
    quality_str = getattr(offer, "quality", "Grade A") or "Grade A"
    storage_note_str = f"₹{storage_cost:,.2f} ({'Required - ' + storage_dur if (cold_storage_req and storage_dur) else ('Required' if cold_storage_req else '₹0 - Not Required')})"
    terms_text = f"""KISANLINK DIGITAL PROCUREMENT CONTRACT

1. AGREEMENT DETAILS
• Agreement ID: {agr_code}
• Date: {today_date}

2. PARTIES
• Farmer (Seller): {farmer_name} ({farmer_loc})
• Buyer (Purchaser): {buyer_name} (GST: {buyer_gst}, {buyer_loc})

3. PRODUCE DETAILS
• Crop: {offer.crop_name}
• Quantity: {offer.quantity:,.0f} kg
• Grade / Quality: {quality_str}
• Lot ID: {lot_id}

4. COMMERCIAL TERMS
• Final Agreed Price / kg: ₹{offer.price_per_kg:,.2f} / kg
• Quantity: {offer.quantity:,.0f} kg
• Gross Value: ₹{gross_val:,.2f}
• Cold Storage Cost: {storage_note_str}
• Expected Net Realisation: ₹{net_real:,.2f}
• Agreed Payment Term: Payment as per Negotiation ({negotiated_timing})
• Settlement Mode: UPI Only

5. PROCUREMENT
• Pickup Location: {farmer_loc}
• Procurement Date: {offer.pickup_date}
• Time Slot: Morning (09:00 AM - 12:00 PM)
• Transport Responsibility: Handled by Farmer (Zero platform transport deduction)

6. QUALITY & QUANTITY
Buyer can verify the agreed quantity and quality at handover.
Any mismatch must be recorded through KisanLink before transaction completion.

7. PAYMENT & SETTLEMENT TERMS
• Agreed Produce Amount: ₹{net_real:,.2f}
• Payment Term: Payment as per Negotiation
• Agreed Payment Timeline: {negotiated_timing}
• Settlement Mode: UPI Only (All transactions are settled strictly via UPI)
• Delay Penalty Clause: If payment is delayed beyond agreed timeline ({negotiated_timing}), buyer must pay an additional delay amount to the farmer (₹250/day or 0.5%/day, whichever is greater).
• Labour / Unloading Charges: Actual labour/unloading charges will be negotiated between buyer and farmer post-handover and added to the final UPI settlement.
• Payment Status: Pending Produce Handover & UPI Settlement

8. CANCELLATION
If the Buyer cancels after procurement has been booked, applicable actual documented cancellation costs will be handled according to the agreed terms.

If the Farmer cancels a confirmed procurement, the cancellation will be recorded and handled according to the agreed terms.

9. DISPUTES
Quality, quantity, payment, and cancellation disputes can be raised through KisanLink Help & Grievances.

10. FINAL AGREEMENT
The final accepted offer becomes the agreed commercial terms.
All previous offers and counter-offers remain available in the negotiation history.

11. DIGITAL RECORD
This agreement records the terms accepted by the Farmer and Buyer through KisanLink."""

    if not agreement:
        agreement = Agreement(
            agreement_code=agr_code,
            offer_id=offer.id,
            request_id=offer.request_id,
            produce_id=offer.produce_id,
            farmer_id=offer.farmer_id,
            buyer_id=offer.buyer_id,
            crop_name=offer.crop_name,
            quantity=offer.quantity,
            quality=getattr(offer, "quality", "Grade A") or "Grade A",
            final_price=offer.price_per_kg,
            total_value=gross_val,
            transport_cost=0.0,
            storage_cost=storage_cost,
            cold_storage_required=cold_storage_req,
            storage_duration=storage_dur,
            payment_terms="Payment as per Negotiation",
            other_costs=0.0,
            net_realisation=net_real,
            procurement_date=offer.pickup_date,
            last_tx_date=offer.pickup_date,
            payment_deadline=negotiated_timing,
            pickup_deadline=offer.pickup_date,
            terms_and_conditions=terms_text,
            farmer_signed=False,
            buyer_signed=False,
            status="Draft"
        )
        db.add(agreement)
    else:
        agreement.final_price = offer.price_per_kg
        agreement.quantity = offer.quantity
        agreement.total_value = gross_val
        agreement.transport_cost = 0.0
        agreement.storage_cost = storage_cost
        agreement.cold_storage_required = cold_storage_req
        agreement.storage_duration = storage_dur
        agreement.payment_terms = "Payment as per Negotiation"
        agreement.payment_deadline = negotiated_timing
        agreement.net_realisation = net_real
        agreement.terms_and_conditions = terms_text
        db.commit()
        db.refresh(agreement)

    offer.agreement_id = agreement.id

    # Append acceptance entry in negotiation history
    user_name = farmer_name if current_user.role == "farmer" else buyer_name
    neg = Negotiation(
        offer_id=offer.id,
        sender_id=current_user.id,
        sender_role=current_user.role,
        sender_name=user_name,
        price_per_kg=offer.price_per_kg,
        quantity=offer.quantity,
        message=f"Offer Accepted at ₹{offer.price_per_kg}/kg ({offer.quantity} kg) by {user_name}. Digital Agreement generated.",
        status="ACCEPTED"
    )
    db.add(neg)

    # Notify both participants with appropriate type
    if current_user.role == "farmer":
        if offer.buyer and offer.buyer.user_id:
            create_notification(
                db=db,
                user_id=offer.buyer.user_id,
                title="Negotiation Accepted",
                message=f"The farmer has accepted your offer of ₹{offer.price_per_kg}/kg for {offer.crop_name} ({offer.quantity} kg).",
                notification_type="NEGOTIATION_ACCEPTED",
                related_id=f"NEG-{offer.id:04d}",
                related_type="NEGOTIATION"
            )
        if offer.farmer and offer.farmer.user_id:
            create_notification(
                db=db,
                user_id=offer.farmer.user_id,
                title="Negotiation Accepted & Agreement Ready",
                message=f"Offer agreed at ₹{offer.price_per_kg}/kg. Digital Agreement {agr_code} generated.",
                notification_type="AGREEMENT_CREATED",
                related_id=str(agreement.id),
                related_type="AGREEMENT"
            )
    else:
        if offer.farmer and offer.farmer.user_id:
            create_notification(
                db=db,
                user_id=offer.farmer.user_id,
                title="Negotiation Accepted",
                message=f"The buyer has accepted your offer of ₹{offer.price_per_kg}/kg for {offer.crop_name} ({offer.quantity} kg).",
                notification_type="NEGOTIATION_ACCEPTED",
                related_id=f"NEG-{offer.id:04d}",
                related_type="NEGOTIATION"
            )
        if offer.buyer and offer.buyer.user_id:
            create_notification(
                db=db,
                user_id=offer.buyer.user_id,
                title="Negotiation Accepted & Agreement Ready",
                message=f"Offer agreed at ₹{offer.price_per_kg}/kg. Digital Agreement {agr_code} generated.",
                notification_type="AGREEMENT_CREATED",
                related_id=str(agreement.id),
                related_type="AGREEMENT"
            )

    return {
        "message": "Offer accepted! Digital Agreement generated.",
        "offer_id": offer.id,
        "negotiation_id": f"NEG-{offer.id:04d}",
        "agreement_id": agreement.id,
        "agreement_code": agr_code,
        "agreed_price": offer.price_per_kg,
        "agreed_quantity": offer.quantity,
        "status": "ACCEPTED"
    }

@router.post("/offers/{offer_id}/reject")
def reject_offer(offer_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found.")

    if offer.status in ["ACCEPTED", "Accepted"]:
        raise HTTPException(status_code=400, detail="Cannot reject an already accepted negotiation.")

    offer.status = "REJECTED"
    offer.updated_at = datetime.datetime.utcnow()

    user_role = (current_user.role or "").lower()
    sender_name = offer.farmer.full_name if user_role == "farmer" and offer.farmer else (offer.buyer.company_name if offer.buyer else "User")
    recipient_user_id = offer.buyer.user_id if user_role == "farmer" and offer.buyer else (offer.farmer.user_id if offer.farmer else None)

    neg = Negotiation(
        offer_id=offer.id,
        sender_id=current_user.id,
        sender_role=user_role,
        sender_name=sender_name,
        price_per_kg=offer.price_per_kg,
        quantity=offer.quantity,
        message=f"Negotiation was declined/rejected by {sender_name}.",
        status="REJECTED"
    )
    db.add(neg)
    db.commit()

    if recipient_user_id:
        create_notification(
            db=db,
            user_id=recipient_user_id,
            title="Negotiation Rejected",
            message=f"The price negotiation for {offer.crop_name} was declined by {sender_name}.",
            notification_type="NEGOTIATION_REJECTED",
            related_id=f"NEG-{offer.id:04d}",
            related_type="NEGOTIATION"
        )

    return {
        "message": "Negotiation rejected.",
        "offer_id": offer.id,
        "negotiation_id": f"NEG-{offer.id:04d}",
        "status": "REJECTED"
    }

# 2. AGREEMENT & DIGITAL SIGNING
@router.get("/agreements")
def get_user_agreements(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "farmer":
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        if not farmer:
            return []
        agrs = db.query(Agreement).filter(Agreement.farmer_id == farmer.id).order_by(Agreement.id.desc()).all()
    elif current_user.role == "buyer":
        buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
        if not buyer:
            return []
        agrs = db.query(Agreement).filter(Agreement.buyer_id == buyer.id).order_by(Agreement.id.desc()).all()
    else:
        agrs = db.query(Agreement).order_by(Agreement.id.desc()).all()

    return [
        {
            "id": agr.id,
            "agreement_code": agr.agreement_code,
            "offer_id": agr.offer_id,
            "request_id": agr.request_id,
            "produce_id": agr.produce_id,
            "farmer_id": agr.farmer_id,
            "buyer_id": agr.buyer_id,
            "farmer_name": agr.farmer.full_name if agr.farmer else "Farmer",
            "buyer_company": agr.buyer.company_name if agr.buyer else "Buyer",
            "crop_name": agr.crop_name,
            "quantity": agr.quantity,
            "quality": agr.quality,
            "final_price": agr.final_price,
            "total_value": agr.total_value,
            "transport_cost": 0.0,
            "storage_cost": agr.storage_cost or 0.0,
            "cold_storage_required": getattr(agr, "cold_storage_required", False) or False,
            "storage_duration": getattr(agr, "storage_duration", None),
            "payment_terms": getattr(agr, "payment_terms", "Payment as per Negotiation") or "Payment as per Negotiation",
            "negotiated_payment_terms": agr.payment_deadline or getattr(agr, "payment_terms", "Within 3 Days"),
            "settlement_mode": "UPI Only",
            "other_costs": agr.other_costs or 0.0,
            "net_realisation": agr.net_realisation,
            "procurement_date": agr.procurement_date,
            "payment_deadline": agr.payment_deadline or getattr(agr, "payment_terms", "Within 3 Days"),
            "terms_and_conditions": agr.terms_and_conditions,
            "farmer_signed": agr.farmer_signed,
            "buyer_signed": agr.buyer_signed,
            "both_signed": bool(agr.farmer_signed and agr.buyer_signed),
            "status": "Both Sides Signed" if (agr.farmer_signed and agr.buyer_signed) else ("Waiting for Buyer to sign" if agr.farmer_signed else ("Waiting for Farmer to sign" if agr.buyer_signed else "Draft")),
            "created_at": format_iso(getattr(agr, "created_at", None)),
            "signed_at": format_iso(agr.signed_at)
        } for agr in agrs
    ]

@router.get("/agreements/{agreement_id}")
def get_agreement(agreement_id: int, db: Session = Depends(get_db)):
    agr = db.query(Agreement).filter(Agreement.id == agreement_id).first()
    if not agr:
        raise HTTPException(status_code=404, detail="Agreement not found.")
    
    both_signed = bool(agr.farmer_signed and agr.buyer_signed)
    calc_status = "Both Sides Signed" if both_signed else (
        "Waiting for Buyer to sign" if agr.farmer_signed else (
            "Waiting for Farmer to sign" if agr.buyer_signed else (agr.status or "Draft")
        )
    )

    return {
        "id": agr.id,
        "agreement_code": agr.agreement_code,
        "offer_id": agr.offer_id,
        "request_id": agr.request_id,
        "produce_id": agr.produce_id,
        "farmer_id": agr.farmer_id,
        "buyer_id": agr.buyer_id,
        "farmer_name": agr.farmer.full_name if agr.farmer else "Farmer",
        "buyer_company": agr.buyer.company_name if agr.buyer else "Buyer",
        "crop_name": agr.crop_name,
        "quantity": agr.quantity,
        "quality": agr.quality,
        "final_price": agr.final_price,
        "total_value": agr.total_value,
        "transport_cost": 0.0,
        "storage_cost": agr.storage_cost or 0.0,
        "cold_storage_required": getattr(agr, "cold_storage_required", False) or False,
        "storage_duration": getattr(agr, "storage_duration", None),
        "payment_terms": getattr(agr, "payment_terms", "Payment as per Negotiation") or "Payment as per Negotiation",
        "negotiated_payment_terms": agr.payment_deadline or getattr(agr, "payment_terms", "Within 3 Days"),
        "settlement_mode": "UPI Only",
        "other_costs": agr.other_costs or 0.0,
        "net_realisation": agr.net_realisation,
        "procurement_date": agr.procurement_date,
        "payment_deadline": agr.payment_deadline or getattr(agr, "payment_terms", "Within 3 Days"),
        "terms_and_conditions": agr.terms_and_conditions,
        "farmer_signed": bool(agr.farmer_signed),
        "buyer_signed": bool(agr.buyer_signed),
        "both_signed": both_signed,
        "status": calc_status,
        "created_at": format_iso(getattr(agr, "created_at", None)),
        "signed_at": format_iso(agr.signed_at)
    }

@router.post("/agreements/{agreement_id}/sign")
def sign_agreement(agreement_id: int, payload: SignAgreementSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not payload.accepted_tc:
        raise HTTPException(status_code=400, detail="You must read and agree to the Terms & Conditions before signing.")

    agr = db.query(Agreement).filter(Agreement.id == agreement_id).first()
    if not agr:
        raise HTTPException(status_code=404, detail="Agreement not found.")

    now = datetime.datetime.utcnow()
    user_role = (current_user.role or "").lower()

    # Determine if current_user is farmer or buyer for this specific agreement
    is_farmer_party = False
    is_buyer_party = False

    farmer_profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if farmer_profile and farmer_profile.id == agr.farmer_id:
        is_farmer_party = True

    buyer_profile = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
    if buyer_profile and buyer_profile.id == agr.buyer_id:
        is_buyer_party = True

    if not is_farmer_party and not is_buyer_party:
        if user_role == "farmer":
            is_farmer_party = True
        elif user_role == "buyer":
            is_buyer_party = True
        elif user_role == "admin":
            is_farmer_party = True
            is_buyer_party = True

    if is_farmer_party:
        agr.farmer_signed = True
    if is_buyer_party:
        agr.buyer_signed = True

    both_signed = bool(agr.farmer_signed and agr.buyer_signed)
    proc_id = None

    if both_signed:
        agr.status = "Both Sides Signed"
        agr.signed_at = now

        # Create or update Procurement Record (strictly only when BOTH sides have signed)
        proc = db.query(Procurement).filter(Procurement.agreement_id == agr.id).first()
        if not proc:
            proc = Procurement(
                agreement_id=agr.id,
                farmer_id=agr.farmer_id,
                buyer_id=agr.buyer_id,
                produce_id=agr.produce_id,
                status="Agreement Signed",
                pickup_location=f"{agr.farmer.village}, {agr.farmer.district}" if agr.farmer else "Farmgate Pickup",
                delivery_location=f"{agr.buyer.city}, {agr.buyer.district}" if agr.buyer else "APMC Delivery Hub",
                distance_km=45.0,
                transport_cost=agr.transport_cost or 0.0,
                created_at=now
            )
            db.add(proc)
        else:
            proc.status = "Agreement Signed"
            if agr.transport_cost is not None:
                proc.transport_cost = agr.transport_cost

        db.flush()
        proc_id = proc.id

        # Notify both parties
        if agr.buyer and agr.buyer.user_id:
            create_notification(
                db=db,
                user_id=agr.buyer.user_id,
                title="Both Sides Signed",
                message=f"Digital Agreement {agr.agreement_code} for {agr.crop_name} is now signed by both sides. Procurement slots are unlocked.",
                notification_type="AGREEMENT_ACCEPTED",
                related_id=str(agr.id),
                related_type="AGREEMENT"
            )
        if agr.farmer and agr.farmer.user_id:
            create_notification(
                db=db,
                user_id=agr.farmer.user_id,
                title="Both Sides Signed",
                message=f"Digital Agreement {agr.agreement_code} for {agr.crop_name} is now signed by both sides. Procurement slots are unlocked.",
                notification_type="AGREEMENT_ACCEPTED",
                related_id=str(agr.id),
                related_type="AGREEMENT"
            )
        msg = "Agreement signed by both sides! Procurement slots are now open."
    elif agr.farmer_signed:
        agr.status = "Waiting for Buyer to sign"
        msg = "You have signed the agreement. Waiting for Buyer to sign."
        if agr.buyer and agr.buyer.user_id:
            create_notification(
                db=db,
                user_id=agr.buyer.user_id,
                title="Agreement Signed by Farmer",
                message=f"Farmer has signed Digital Agreement {agr.agreement_code}. Please sign to complete the agreement.",
                notification_type="AGREEMENT_PENDING",
                related_id=str(agr.id),
                related_type="AGREEMENT"
            )
    else:
        agr.status = "Waiting for Farmer to sign"
        msg = "You have signed the agreement. Waiting for Farmer to sign."
        if agr.farmer and agr.farmer.user_id:
            create_notification(
                db=db,
                user_id=agr.farmer.user_id,
                title="Agreement Signed by Buyer",
                message=f"Buyer has signed Digital Agreement {agr.agreement_code}. Please sign to complete the agreement.",
                notification_type="AGREEMENT_PENDING",
                related_id=str(agr.id),
                related_type="AGREEMENT"
            )

    db.commit()
    db.refresh(agr)

    return {
        "message": msg,
        "agreement_code": agr.agreement_code,
        "agreement_id": agr.id,
        "status": agr.status,
        "farmer_signed": bool(agr.farmer_signed),
        "buyer_signed": bool(agr.buyer_signed),
        "both_signed": both_signed,
        "signed_at": format_iso(agr.signed_at),
        "procurement_id": proc_id
    }

# 3. SLOT BOOKING & HANDOVER
@router.get("/procurement/available-slots")
def get_available_procurement_slots(agreement_id: Optional[int] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    agr = None
    if agreement_id:
        agr = db.query(Agreement).filter(Agreement.id == agreement_id).first()

    today = datetime.date.today()
    # Baseline: Agreement completed date or today
    signed_date = agr.signed_at.date() if (agr and agr.signed_at) else today
    # Procurement slots must start from ONE DAY AFTER the negotiation/agreement is completed (and at least tomorrow)
    start_date = max(signed_date + datetime.timedelta(days=1), today + datetime.timedelta(days=1))

    slot_definitions = [
        {"day_offset": 0, "time_window": "08:00 AM – 10:00 AM", "location": "Shadnagar APMC Collection Center, Rangareddy", "type": "APMC Collection Yard", "capacity_kg": 15000.0},
        {"day_offset": 0, "time_window": "10:00 AM – 12:00 PM", "location": "Shadnagar APMC Collection Center, Rangareddy", "type": "APMC Collection Yard", "capacity_kg": 12000.0},
        {"day_offset": 0, "time_window": "02:00 PM – 04:00 PM", "location": "Direct Farmgate Pickup", "type": "Direct Farm Pickup", "capacity_kg": 8000.0},
        {"day_offset": 1, "time_window": "08:00 AM – 10:00 AM", "location": "Khammam APMC Yard Hub, Khammam", "type": "APMC Collection Yard", "capacity_kg": 20000.0},
        {"day_offset": 1, "time_window": "10:00 AM – 12:00 PM", "location": "Khammam APMC Yard Hub, Khammam", "type": "APMC Collection Yard", "capacity_kg": 18000.0},
        {"day_offset": 1, "time_window": "03:00 PM – 05:00 PM", "location": "Warangal Enkoor Hub, Warangal", "type": "APMC Collection Yard", "capacity_kg": 15000.0},
        {"day_offset": 2, "time_window": "09:00 AM – 11:00 AM", "location": "Suryapet Logistics Park, Suryapet", "type": "Logistics Park Hub", "capacity_kg": 25000.0},
        {"day_offset": 2, "time_window": "02:00 PM – 04:00 PM", "location": "Nizamabad Integrated Market Center", "type": "APMC Collection Yard", "capacity_kg": 10000.0},
        {"day_offset": 3, "time_window": "08:00 AM – 10:00 AM", "location": "Karimnagar Central Market Yard Hub", "type": "APMC Collection Yard", "capacity_kg": 15000.0},
        {"day_offset": 3, "time_window": "11:00 AM – 01:00 PM", "location": "Direct Farmgate Pickup", "type": "Direct Farm Pickup", "capacity_kg": 10000.0},
    ]

    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    booked_slots = db.query(ProcurementSlot).filter(ProcurementSlot.status.in_(["Booked", "CONFIRMED"])).all()
    booked_vol_map = {}
    for s in booked_slots:
        key = (s.slot_date, s.time_window, s.location)
        booked_vol_map[key] = booked_vol_map.get(key, 0.0) + (s.quantity or 500.0)

    results = []
    slot_id = 1
    for item in slot_definitions:
        target_d = start_date + datetime.timedelta(days=item["day_offset"])
        raw_date = target_d.isoformat()
        date_str = f"{target_d.day} {months[target_d.month - 1]} {target_d.year}"

        booked_kg = (
            booked_vol_map.get((date_str, item["time_window"], item["location"]), 0.0) or
            booked_vol_map.get((raw_date, item["time_window"], item["location"]), 0.0)
        )
        total_kg = item["capacity_kg"]
        rem_kg = max(0.0, total_kg - booked_kg)
        is_full = (rem_kg <= 0.0)
        cap_mt = f"{int(total_kg / 1000)} MT"

        results.append({
            "id": slot_id,
            "date": date_str,
            "raw_date": raw_date,
            "slot_date": raw_date,
            "time_window": item["time_window"],
            "location": item["location"],
            "type": item["type"],
            "capacity": cap_mt,
            "capacity_kg": total_kg,
            "booked_capacity_kg": booked_kg,
            "remaining_capacity_kg": rem_kg,
            "is_available": not is_full,
            "status": "Capacity Full" if is_full else f"Available ({int(rem_kg)} kg left)"
        })
        slot_id += 1

    return results

@router.get("/procurement/active-agreement")
def get_active_procurement_agreement(agreement_id: Optional[int] = None, transaction_id: Optional[int] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    agr = None
    tx = None
    if transaction_id:
        tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
        if tx and tx.agreement:
            agr = tx.agreement

    if not agr and agreement_id:
        agr = db.query(Agreement).filter(Agreement.id == agreement_id).first()

    if not agr and current_user.role == "farmer":
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        if farmer:
            agr = db.query(Agreement).filter(Agreement.farmer_id == farmer.id).order_by(Agreement.id.desc()).first()

    if not agr and current_user.role == "buyer":
        buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
        if buyer:
            agr = db.query(Agreement).filter(Agreement.buyer_id == buyer.id).order_by(Agreement.id.desc()).first()

    if not agr:
        agr = db.query(Agreement).order_by(Agreement.id.desc()).first()

    if not agr:
        raise HTTPException(status_code=404, detail="No active agreement found.")

    proc = db.query(Procurement).filter(Procurement.agreement_id == agr.id).first()
    existing_slot = db.query(ProcurementSlot).filter(ProcurementSlot.agreement_id == agr.id).first()
    if not tx:
        tx = db.query(Transaction).filter(Transaction.agreement_id == agr.id).first()

    labour_chg = (tx.labour_charges or 0.0) if tx else 0.0
    if tx and tx.payment_status in ["RELEASED", "PAYMENT_RELEASED", "VERIFIED", "COMPLETED"] and tx.delay_amount is not None:
        delay_amt = tx.delay_amount or 0.0
        delay_days = tx.delay_days or 0
    else:
        delay_amt, delay_days = calculate_delay_details(tx.payment_due_date if tx else None, tx.net_realisation if tx else agr.net_realisation)

    base_amt = (tx.net_realisation if tx else agr.net_realisation) or 0.0
    total_payable = round(base_amt + labour_chg + delay_amt, 2)
    farmer_phone, default_farmer_upi = get_farmer_mobile_and_upi(agr.farmer)
    farmer_upi = (tx.upi_id if tx and tx.upi_id else None) or default_farmer_upi

    return {
        "id": agr.id,
        "agreement_code": agr.agreement_code,
        "crop_name": agr.crop_name,
        "quantity": agr.quantity,
        "quality": agr.quality,
        "final_price": agr.final_price,
        "total_value": agr.total_value,
        "transport_cost": 0.0,
        "storage_cost": agr.storage_cost or 0.0,
        "cold_storage_required": getattr(agr, "cold_storage_required", False) or False,
        "storage_duration": getattr(agr, "storage_duration", None),
        "payment_terms": getattr(agr, "payment_terms", "Payment as per Negotiation") or "Payment as per Negotiation",
        "negotiated_payment_terms": agr.payment_deadline or getattr(agr, "payment_terms", "Within 3 Days"),
        "payment_due_date": getattr(tx, "payment_due_date", None) if tx else None,
        "net_realisation": agr.net_realisation,
        "agreed_amount": base_amt,
        "labour_charges": labour_chg,
        "labour_notes": tx.labour_notes if tx else None,
        "labour_status": tx.labour_status or "PENDING" if tx else "PENDING",
        "delay_amount": delay_amt,
        "delay_days": delay_days,
        "total_payable_amount": total_payable,
        "payment_method": "UPI",
        "upi_id": farmer_upi,
        "farmer_name": agr.farmer.full_name if agr.farmer else "Farmer",
        "farmer_phone": farmer_phone,
        "buyer_company": agr.buyer.company_name if agr.buyer else "Verified Buyer",
        "pickup_location": f"{agr.farmer.village}, {agr.farmer.district}" if agr.farmer else "Farmgate Pickup",
        "delivery_location": f"{agr.buyer.city}, {agr.buyer.district}" if agr.buyer else "APMC Delivery Hub",
        "status": "Both Sides Signed" if (agr.farmer_signed and agr.buyer_signed) else ("Waiting for Buyer to sign" if agr.farmer_signed else ("Waiting for Farmer to sign" if agr.buyer_signed else (agr.status or "Draft"))),
        "farmer_signed": bool(agr.farmer_signed),
        "buyer_signed": bool(agr.buyer_signed),
        "both_signed": bool(agr.farmer_signed and agr.buyer_signed),
        "signed_at": format_iso(agr.signed_at),
        "procurement_id": proc.id if proc else None,
        "procurement_status": proc.status if proc else (tx.procurement_status if tx else None),
        "transaction_id": tx.id if tx else None,
        "transaction_code": tx.transaction_code if tx else None,
        "quality_status": tx.quality_status if tx else "PENDING",
        "quantity_status": tx.quantity_status if tx else "PENDING",
        "quality_grade": tx.quality_grade if tx else (agr.quality or "Grade A"),
        "payment_status": tx.payment_status if tx else "PENDING",
        "final_status": tx.final_status if tx else None,
        "transaction_status": tx.final_status if tx else None,
        "payment_amount": total_payable,
        "released_by": tx.released_by if tx else None,
        "released_at": format_iso(tx.released_at) if tx else None,
        "verified_by": tx.verified_by if tx else None,
        "verified_at": format_iso(tx.verified_at) if tx else None,
        "slot_booking": {
            "id": existing_slot.id,
            "slot_code": existing_slot.slot_code,
            "slot_date": existing_slot.slot_date,
            "time_window": existing_slot.time_window,
            "location": existing_slot.location,
            "status": existing_slot.status
        } if existing_slot else None
    }

@router.post("/procurement/book-slot")
def book_procurement_slot(payload: BookSlotSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. Locate Agreement
    agr = None
    if payload.agreement_id and payload.agreement_id > 0:
        agr = db.query(Agreement).filter(Agreement.id == payload.agreement_id).first()
        if not agr:
            raise HTTPException(status_code=404, detail=f"Agreement #{payload.agreement_id} not found.")
    else:
        if current_user.role == "farmer":
            farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
            if farmer:
                agr = db.query(Agreement).filter(Agreement.farmer_id == farmer.id).order_by(Agreement.id.desc()).first()

        if not agr:
            agr = db.query(Agreement).order_by(Agreement.id.desc()).first()

    if not agr:
        raise HTTPException(
            status_code=400,
            detail="No agreement found for slot booking. Please initiate and accept an agreement first."
        )

    # Strictly enforce that BOTH parties have signed the agreement
    if not (agr.farmer_signed and agr.buyer_signed):
        pending_party = "Buyer" if agr.farmer_signed else ("Farmer" if agr.buyer_signed else "both Farmer and Buyer")
        raise HTTPException(
            status_code=400,
            detail=f"Cannot book a procurement slot because Agreement {agr.agreement_code} is not yet signed by both parties. Current status: '{agr.status}'. Waiting for {pending_party} to sign."
        )

    tomorrow_str = (datetime.date.today() + datetime.timedelta(days=1)).strftime("%d %b %Y")
    slot_date = payload.slot_date or tomorrow_str
    time_window = payload.time_window or "10:00 AM – 12:00 PM"
    location = payload.location or (f"{agr.farmer.village}, {agr.farmer.district}" if agr.farmer else "Farmgate Collection Center, Shadnagar")

    # 2. Check for slot capacity limits (Capacity Tracking)
    booked_slots = db.query(ProcurementSlot).filter(
        ProcurementSlot.slot_date == slot_date,
        ProcurementSlot.time_window == time_window,
        ProcurementSlot.location == location,
        ProcurementSlot.agreement_id != agr.id,
        ProcurementSlot.status.in_(["Booked", "CONFIRMED"])
    ).all()

    total_booked_kg = sum(s.quantity or 500.0 for s in booked_slots)
    requested_kg = payload.quantity or agr.quantity or 500.0
    slot_capacity_kg = 15000.0 # Standard 15 MT Collection Window Capacity

    if total_booked_kg + requested_kg > slot_capacity_kg:
        raise HTTPException(
            status_code=409,
            detail=f"This slot window has reached maximum capacity ({int(total_booked_kg)}/{int(slot_capacity_kg)} kg booked). Please select another slot or time window."
        )

    # 3. Unique slot code generation
    rand_suffix = random.randint(100, 999)
    ts_fragment = int(datetime.datetime.utcnow().timestamp()) % 100000
    slot_code = f"SLOT-TS-{agr.id:03d}-{ts_fragment:05d}-{rand_suffix}"

    # Check if agreement already has a slot
    existing_slot = db.query(ProcurementSlot).filter(ProcurementSlot.agreement_id == agr.id).first()
    if existing_slot:
        existing_slot.slot_code = slot_code
        existing_slot.slot_date = slot_date
        existing_slot.time_window = time_window
        existing_slot.location = location
        existing_slot.crop_name = payload.crop or agr.crop_name
        existing_slot.quantity = payload.quantity or agr.quantity
        existing_slot.farmer_id = agr.farmer_id
        existing_slot.buyer_id = agr.buyer_id
        existing_slot.booked_by = current_user.username
        existing_slot.status = "CONFIRMED"
        slot = existing_slot
    else:
        slot = ProcurementSlot(
            agreement_id=agr.id,
            slot_code=slot_code,
            slot_date=slot_date,
            time_window=time_window,
            location=location,
            crop_name=payload.crop or agr.crop_name,
            quantity=payload.quantity or agr.quantity,
            farmer_id=agr.farmer_id,
            buyer_id=agr.buyer_id,
            booked_by=current_user.username,
            status="CONFIRMED",
            created_at=datetime.datetime.utcnow()
        )
        db.add(slot)

    db.commit()
    db.refresh(slot)

    # 4. Link with Procurement record
    proc = db.query(Procurement).filter(Procurement.agreement_id == agr.id).first()
    if not proc:
        proc = Procurement(
            agreement_id=agr.id,
            slot_id=slot.id,
            farmer_id=agr.farmer_id,
            buyer_id=agr.buyer_id,
            produce_id=agr.produce_id,
            status="Slot Booked",
            pickup_location=location,
            delivery_location=f"{agr.buyer.city}, {agr.buyer.district}" if agr.buyer else "APMC Delivery Hub",
            distance_km=45.0,
            transport_cost=agr.transport_cost
        )
        db.add(proc)
    else:
        proc.slot_id = slot.id
        proc.status = "Slot Booked"
        proc.pickup_location = location

    # 5. Add notifications
    if agr.farmer and agr.farmer.user_id:
        create_notification(
            db=db,
            user_id=agr.farmer.user_id,
            title="Slot Confirmed",
            message=f"Your procurement slot {slot.slot_code} has been confirmed for {agr.crop_name} ({agr.quantity} kg) on {slot.slot_date} ({slot.time_window}).",
            notification_type="SLOT_BOOKED",
            related_id=str(slot.id),
            related_type="SLOT"
        )
    if agr.buyer and agr.buyer.user_id:
        create_notification(
            db=db,
            user_id=agr.buyer.user_id,
            title="Procurement Slot Booked",
            message=f"A procurement slot {slot.slot_code} has been booked for your order by {agr.farmer.full_name if agr.farmer else 'Farmer'} for {agr.crop_name} on {slot.slot_date}.",
            notification_type="SLOT_BOOKED",
            related_id=str(slot.id),
            related_type="SLOT"
        )

    if proc:
        db.refresh(proc)

    return {
        "message": "Procurement slot booked successfully!",
        "slot_id": slot.id,
        "slot_code": slot.slot_code,
        "slot_date": slot.slot_date,
        "time_window": slot.time_window,
        "location": slot.location,
        "crop_name": agr.crop_name,
        "quantity": agr.quantity,
        "buyer_company": agr.buyer.company_name if agr.buyer else "Verified Buyer",
        "farmer_name": agr.farmer.full_name if agr.farmer else "Farmer",
        "status": "CONFIRMED",
        "procurement_id": proc.id if proc else None,
        "agreement_id": agr.id
    }

@router.post("/procurement/{procurement_id}/handover")
def produce_handover(procurement_id: int, notes: Optional[str] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    proc = db.query(Procurement).filter(Procurement.id == procurement_id).first()
    if not proc:
        # Fallback to latest procurement for current farmer if not found
        if current_user.role == "farmer":
            farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
            if farmer:
                proc = db.query(Procurement).filter(Procurement.farmer_id == farmer.id).order_by(Procurement.id.desc()).first()
        if not proc:
            proc = db.query(Procurement).order_by(Procurement.id.desc()).first()

    if not proc:
        raise HTTPException(status_code=404, detail="Procurement record not found. Please complete agreement and slot booking first.")

    agr = proc.agreement
    if not agr:
        raise HTTPException(status_code=404, detail="Associated agreement not found for this procurement.")

    # Enforce dual signing requirement
    if not (agr.farmer_signed and agr.buyer_signed):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot perform produce handover before Agreement {agr.agreement_code} is signed by both Farmer and Buyer."
        )

    # Enforce slot booking requirement
    if not proc.slot_id:
        existing_slot = db.query(ProcurementSlot).filter(ProcurementSlot.agreement_id == agr.id).first()
        if existing_slot:
            proc.slot_id = existing_slot.id
        else:
            raise HTTPException(
                status_code=400,
                detail="Cannot perform produce handover before a valid procurement slot is booked. Please book a procurement slot first."
            )

    # 1. Update Procurement Status
    proc.status = "Produce Picked Up"
    proc.handover_notes = notes or "Produce physical handover completed at farm site in good order."
    proc.handover_at = datetime.datetime.utcnow()

    # 2. Check if a transaction already exists for this agreement to prevent duplicate records
    tx = db.query(Transaction).filter(Transaction.agreement_id == agr.id).first()

    # Accurate financial calculation
    gross_value = round(float(agr.final_price) * float(agr.quantity), 2)
    transport_cost = 0.0 # Platform transport cost is ₹0 (handled by farmer, not deducted by KisanLink)
    cold_storage_req = getattr(agr, "cold_storage_required", False) or False
    storage_cost = round(float(agr.storage_cost), 2) if hasattr(agr, 'storage_cost') and agr.storage_cost is not None else 0.0
    storage_dur = getattr(agr, "storage_duration", None)
    other_costs = 0.0
    net_realisation = round(gross_value - storage_cost, 2)
    net_price_per_kg = round(net_realisation / float(agr.quantity), 2) if float(agr.quantity) > 0 else agr.final_price

    payment_terms = getattr(agr, "payment_terms", "Payment as per Negotiation") or "Payment as per Negotiation"
    payment_due_date = compute_payment_due_date(datetime.datetime.utcnow(), getattr(agr, "payment_deadline", None) or payment_terms)
    _, farmer_upi = get_farmer_mobile_and_upi(agr.farmer)

    if not tx:
        # Generate clean guaranteed unique transaction code
        rand_suffix = random.randint(100, 999)
        ts_suffix = int(datetime.datetime.utcnow().timestamp()) % 10000
        txn_code = f"TXN-KL-2026-{agr.id:03d}-{ts_suffix:04d}-{rand_suffix}"

        tx = Transaction(
            transaction_code=txn_code,
            agreement_id=agr.id,
            farmer_id=agr.farmer_id,
            buyer_id=agr.buyer_id,
            produce_id=agr.produce_id,
            booking_id=proc.slot_id,
            procurement_id=proc.id,
            crop_name=agr.crop_name,
            quantity=agr.quantity,
            price_per_kg=agr.final_price,
            gross_value=gross_value,
            transport_cost=0.0,
            storage_cost=storage_cost,
            cold_storage_required=cold_storage_req,
            storage_duration=storage_dur,
            payment_terms=payment_terms,
            payment_due_date=payment_due_date,
            other_costs=0.0,
            net_realisation=net_realisation,
            net_price_per_kg=net_price_per_kg,
            labour_charges=0.0,
            labour_notes="To be negotiated post-handover based on actual labour amount.",
            labour_status="PENDING",
            delay_amount=0.0,
            delay_days=0,
            total_payable_amount=net_realisation,
            payment_method="UPI",
            upi_id=farmer_upi,
            procurement_status="HANDOVER_COMPLETED",
            payment_status="PENDING",
            final_status="HANDOVER_COMPLETED",
            quality_status="PENDING",
            quantity_status="PENDING",
            quality_grade=agr.quality or "Grade A",
            payment_amount=net_realisation,
            created_at=datetime.datetime.utcnow()
        )
        db.add(tx)
        db.commit()
        db.refresh(tx)

        # Create/Link Payment Tracking Record
        existing_pmt = db.query(Payment).filter(Payment.procurement_id == proc.id).first()
        if not existing_pmt:
            pmt = Payment(
                procurement_id=proc.id,
                transaction_id=tx.id,
                transaction_code=txn_code,
                amount=net_realisation,
                amount_due=net_realisation,
                labour_charges=0.0,
                delay_amount=0.0,
                status="Pending",
                payment_method="UPI",
                upi_id=farmer_upi,
                payment_reference=f"UPI/KL/{random.randint(100000000000, 999999999999)}"
            )
            db.add(pmt)
            db.commit()
        else:
            existing_pmt.transaction_id = tx.id
            existing_pmt.transaction_code = txn_code
            existing_pmt.amount = net_realisation
            existing_pmt.amount_due = net_realisation
            existing_pmt.payment_method = "UPI"
            existing_pmt.upi_id = farmer_upi
            existing_pmt.labour_charges = 0.0
            existing_pmt.delay_amount = 0.0
            db.commit()

    else:
        # Update existing transaction
        tx.procurement_status = "HANDOVER_COMPLETED"
        tx.transport_cost = 0.0
        tx.storage_cost = storage_cost
        tx.cold_storage_required = cold_storage_req
        tx.storage_duration = storage_dur
        tx.payment_terms = payment_terms
        tx.payment_due_date = payment_due_date
        tx.net_realisation = net_realisation
        tx.net_price_per_kg = net_price_per_kg
        tx.gross_value = gross_value
        if tx.labour_charges is None:
            tx.labour_charges = 0.0
        if not tx.labour_status:
            tx.labour_status = "PENDING"
        if tx.delay_amount is None:
            tx.delay_amount = 0.0
        if not tx.payment_method:
            tx.payment_method = "UPI"
        if not tx.upi_id:
            tx.upi_id = farmer_upi
        tx.total_payable_amount = round(tx.net_realisation + (tx.labour_charges or 0.0) + (tx.delay_amount or 0.0), 2)
        if not tx.quality_status:
            tx.quality_status = "PENDING"
        if not tx.quantity_status:
            tx.quantity_status = "PENDING"
        if not tx.quality_grade:
            tx.quality_grade = agr.quality or "Grade A"
        if not tx.payment_amount:
            tx.payment_amount = tx.total_payable_amount
        if not tx.booking_id:
            tx.booking_id = proc.slot_id
        if not tx.procurement_id:
            tx.procurement_id = proc.id
        db.commit()

    # Send Notifications to Farmer and Buyer
    txn_ref_code = tx.transaction_code
    if agr.farmer and agr.farmer.user_id:
        create_notification(
            db=db,
            user_id=agr.farmer.user_id,
            title="Produce Handover Completed",
            message=f"Produce handover completed successfully. Transaction {txn_ref_code} has been created for {agr.crop_name} ({agr.quantity} kg). You can now agree on actual labour/unloading charges.",
            notification_type="HANDOVER_COMPLETED",
            related_id=str(tx.id),
            related_type="TRANSACTION"
        )
        create_notification(
            db=db,
            user_id=agr.farmer.user_id,
            title="Feedback Requested",
            message=f"Please provide your rating and feedback for transaction {txn_ref_code}.",
            notification_type="FEEDBACK_REQUEST",
            related_id=str(tx.id),
            related_type="FEEDBACK"
        )
    if agr.buyer and agr.buyer.user_id:
        create_notification(
            db=db,
            user_id=agr.buyer.user_id,
            title="Produce Handover Completed",
            message=f"The farmer's produce handover for {agr.crop_name} has been completed. Transaction {txn_ref_code} created. Please verify produce, agree on labour charges, and confirm quality & quantity.",
            notification_type="HANDOVER_COMPLETED",
            related_id=str(tx.id),
            related_type="TRANSACTION"
        )
        create_notification(
            db=db,
            user_id=agr.buyer.user_id,
            title="Feedback Requested",
            message=f"Please provide your rating and feedback for completed transaction {txn_ref_code}.",
            notification_type="FEEDBACK_REQUEST",
            related_id=str(tx.id),
            related_type="FEEDBACK"
        )

    return {
        "message": "Produce handover completed successfully. Quality and Quantity verification unlocked.",
        "procurement_id": proc.id,
        "status": proc.status,
        "transaction_id": tx.id,
        "transaction_code": tx.transaction_code,
        "gross_value": tx.gross_value,
        "net_realisation": tx.net_realisation,
        "agreed_amount": tx.net_realisation,
        "labour_charges": tx.labour_charges or 0.0,
        "labour_notes": tx.labour_notes,
        "labour_status": tx.labour_status or "PENDING",
        "delay_amount": tx.delay_amount or 0.0,
        "delay_days": tx.delay_days or 0,
        "total_payable_amount": tx.total_payable_amount or tx.net_realisation,
        "payment_method": "UPI",
        "upi_id": tx.upi_id,
        "transport_cost": 0.0,
        "storage_cost": tx.storage_cost or 0.0,
        "cold_storage_required": tx.cold_storage_required or False,
        "storage_duration": tx.storage_duration,
        "payment_terms": tx.payment_terms,
        "payment_due_date": tx.payment_due_date,
        "payment_status": tx.payment_status,
        "quality_status": tx.quality_status,
        "quantity_status": tx.quantity_status
    }

# 4. QUALITY CONFIRMATION & PAYMENT
@router.post("/procurement/quality-confirm")
def confirm_quality(payload: QualityConfirmSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    proc = None
    tx = None
    if payload.transaction_id:
        tx = db.query(Transaction).filter(Transaction.id == payload.transaction_id).first()
        if tx:
            proc = tx.procurement or db.query(Procurement).filter(Procurement.agreement_id == tx.agreement_id).first()

    if not proc and payload.procurement_id:
        proc = db.query(Procurement).filter(Procurement.id == payload.procurement_id).first()
        if proc:
            tx = db.query(Transaction).filter((Transaction.procurement_id == proc.id) | (Transaction.agreement_id == proc.agreement_id)).first()

    if not proc and payload.agreement_id:
        proc = db.query(Procurement).filter(Procurement.agreement_id == payload.agreement_id).first()
        tx = db.query(Transaction).filter(Transaction.agreement_id == payload.agreement_id).first()

    if not proc and not tx:
        if current_user.role == "buyer":
            buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
            if buyer:
                tx = db.query(Transaction).filter(Transaction.buyer_id == buyer.id).order_by(Transaction.id.desc()).first()
                if tx:
                    proc = tx.procurement or db.query(Procurement).filter(Procurement.agreement_id == tx.agreement_id).first()

    if not proc and not tx:
        raise HTTPException(status_code=404, detail="Procurement or transaction not found.")

    agr = tx.agreement if tx else proc.agreement
    if not agr:
        raise HTTPException(status_code=404, detail="Associated agreement not found.")

    # Guard check: Handover must be completed
    is_handover_done = (
        (proc and proc.status in ["Produce Picked Up", "Quality Confirmed", "Quality Rejected / Dispute Raised", "Payment Completed", "HANDOVER_COMPLETED"]) or
        (tx and tx.procurement_status in ["HANDOVER_COMPLETED", "QUALITY_CONFIRMED", "COMPLETED"])
    )
    if not is_handover_done:
        raise HTTPException(
            status_code=400,
            detail="Produce handover has not been completed yet. Quality audit can only be performed after produce handover."
        )

    diff_qty = float(agr.quantity) - float(payload.received_quantity)

    qconf = QualityConfirmation(
        procurement_id=proc.id if proc else 1,
        expected_quantity=agr.quantity,
        received_quantity=payload.received_quantity,
        diff_quantity=diff_qty,
        quality_received=payload.quality_received,
        status=payload.status,
        adjustment_reason=payload.adjustment_reason or "Verified and confirmed."
    )
    db.add(qconf)

    if payload.status == "Rejected":
        if proc:
            proc.status = "Quality Rejected / Dispute Raised"
        grv_code = f"GRV-DISP-{random.randint(10000, 99999)}"
        grv = Grievance(
            grievance_code=grv_code,
            user_id=current_user.id,
            transaction_id=tx.id if tx else None,
            transaction_code=tx.transaction_code if tx else None,
            category="Quality Dispute",
            title=f"Produce Quality Rejection Dispute: {agr.crop_name}",
            description=(
                f"Consignment rejected upon arrival. Expected quality: '{agr.quality}', "
                f"Received quality: '{payload.quality_received}'. "
                f"Inspector notes: {payload.adjustment_reason or 'Fails agreed standards.'}"
            ),
            status="OPEN"
        )
        db.add(grv)
        if tx:
            tx.procurement_status = "QUALITY_DISPUTED"
            tx.final_status = "DISPUTED"
            tx.quality_status = "REJECTED"
            tx.quantity_status = "REJECTED"
        db.commit()

        if agr.farmer and agr.farmer.user_id:
            create_notification(
                db=db,
                user_id=agr.farmer.user_id,
                title="Quality Dispute Raised",
                message=f"Buyer rejected consignment of {agr.crop_name} ({payload.received_quantity} kg). Dispute case {grv_code} opened.",
                notification_type="QUALITY_DISPUTE",
                related_id=str(grv.id),
                related_type="GRIEVANCE"
            )

        return {
            "message": "Quality audit recorded as REJECTED. Formal dispute registered and flagged for resolution.",
            "quality_status": "Rejected",
            "qualityStatus": "REJECTED",
            "quantityStatus": "REJECTED",
            "dispute_raised": True,
            "grievance_code": grv_code
        }
    else:
        if proc:
            proc.status = "Quality Confirmed"
        if tx:
            tx.quality_status = "CONFIRMED"
            tx.quantity_status = "CONFIRMED"
            tx.quality_grade = payload.quality_received or (agr.quality or "Grade A")
            tx.procurement_status = "QUALITY_CONFIRMED"
        db.commit()

        # Notify Farmer
        if agr.farmer and agr.farmer.user_id:
            create_notification(
                db=db,
                user_id=agr.farmer.user_id,
                title="Quality & Quantity Confirmed",
                message=f"Buyer has confirmed the quality ({payload.quality_received}) and quantity ({payload.received_quantity} kg) for {agr.crop_name}. Awaiting payment release.",
                notification_type="QUALITY_CONFIRMED",
                related_id=str(tx.id if tx else (proc.id if proc else 1)),
                related_type="TRANSACTION"
            )

        return {
            "message": "Quality and quantity confirmed successfully!",
            "quality_status": "CONFIRMED",
            "quantity_status": "CONFIRMED",
            "qualityStatus": "CONFIRMED",
            "quantityStatus": "CONFIRMED",
            "quality_received": payload.quality_received,
            "received_quantity": payload.received_quantity,
            "transaction_id": tx.id if tx else None,
            "transaction_code": tx.transaction_code if tx else None,
            "dispute_raised": False
        }

# 3b. POST-HANDOVER LABOUR CHARGES NEGOTIATION
@router.post("/transactions/{transaction_id}/negotiate-labour")
def negotiate_labour(
    transaction_id: int,
    payload: NegotiateLabourSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    if tx.payment_status in ["RELEASED", "PAYMENT_RELEASED", "VERIFIED", "COMPLETED"]:
        raise HTTPException(
            status_code=400,
            detail="Labour charges cannot be modified after payment has already been released or completed."
        )

    action = (payload.action or "agree").strip().lower()
    amount = round(float(payload.labour_charges or 0.0), 2)
    if amount < 0:
        raise HTTPException(status_code=400, detail="Labour charges cannot be negative.")

    tx.labour_charges = amount
    tx.labour_notes = payload.labour_notes or f"Actual labour/unloading amount ₹{amount:,.2f} agreed post-handover."
    tx.labour_status = "PROPOSED" if action == "propose" else "AGREED"
    tx.labour_proposed_by = current_user.role

    # Dynamically calculate delay details
    delay_amt, delay_days = calculate_delay_details(tx.payment_due_date, tx.net_realisation)
    tx.delay_amount = delay_amt
    tx.delay_days = delay_days
    tx.total_payable_amount = round((tx.net_realisation or 0.0) + tx.labour_charges + delay_amt, 2)
    tx.payment_amount = tx.total_payable_amount

    # Sync Payment record
    pmt = db.query(Payment).filter((Payment.transaction_id == tx.id) | (Payment.transaction_code == tx.transaction_code)).first()
    if pmt:
        pmt.labour_charges = tx.labour_charges
        pmt.delay_amount = tx.delay_amount
        pmt.amount = tx.total_payable_amount
        if pmt.status not in ["RELEASED", "Completed"]:
            pmt.amount_due = tx.total_payable_amount

    # Send Notification to other party
    other_user_id = None
    role_label = "Buyer" if current_user.role == "buyer" else "Farmer"
    if current_user.role == "buyer":
        other_user_id = tx.farmer.user_id if tx.farmer else None
    else:
        other_user_id = tx.buyer.user_id if tx.buyer else None

    if other_user_id:
        status_word = "proposed" if tx.labour_status == "PROPOSED" else "agreed upon"
        create_notification(
            db=db,
            user_id=other_user_id,
            title="Labour Charges Update",
            message=f"{role_label} {status_word} actual labour/unloading charges of ₹{tx.labour_charges:,.2f} for {tx.crop_name} ({tx.transaction_code}). Total payable via UPI: ₹{tx.total_payable_amount:,.2f}.",
            notification_type="LABOUR_UPDATE",
            related_id=str(tx.id),
            related_type="TRANSACTION"
        )

    db.commit()
    db.refresh(tx)

    return {
        "message": f"Labour charges {tx.labour_status.lower()} successfully at ₹{tx.labour_charges:,.2f}.",
        "transaction_id": tx.id,
        "transaction_code": tx.transaction_code,
        "agreed_amount": tx.net_realisation,
        "labour_charges": tx.labour_charges,
        "labour_notes": tx.labour_notes,
        "labour_status": tx.labour_status,
        "labour_proposed_by": tx.labour_proposed_by,
        "delay_amount": tx.delay_amount,
        "delay_days": tx.delay_days,
        "total_payable_amount": tx.total_payable_amount,
        "payment_method": tx.payment_method or "UPI",
        "upi_id": tx.upi_id,
        "payment_status": tx.payment_status
    }

@router.post("/procurement/release-payment")
@router.post("/procurement/process-payment")
def process_payment(payload: ProcessPaymentSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tx = None
    proc = None
    if payload.transaction_id:
        tx = db.query(Transaction).filter(Transaction.id == payload.transaction_id).first()
        if tx:
            proc = tx.procurement or db.query(Procurement).filter(Procurement.agreement_id == tx.agreement_id).first()

    if not proc and payload.procurement_id:
        proc = db.query(Procurement).filter(Procurement.id == payload.procurement_id).first()
        if proc:
            tx = db.query(Transaction).filter(Transaction.agreement_id == proc.agreement_id).first()

    if not tx and not proc:
        tx = db.query(Transaction).order_by(Transaction.id.desc()).first()
        if tx:
            proc = tx.procurement

    if not tx and not proc:
        raise HTTPException(status_code=404, detail="No transaction or procurement found to process payment.")

    if proc and proc.status not in ["Produce Picked Up", "Quality Confirmed", "Payment Completed", "HANDOVER_COMPLETED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot release payment before produce handover is completed. Current procurement status: '{proc.status}'."
        )

    # Enforce quality & quantity confirmation before payment release
    if tx and (tx.quality_status != "CONFIRMED" or tx.quantity_status != "CONFIRMED"):
        # If proc is Quality Confirmed, auto-heal tx quality_status
        if proc and proc.status == "Quality Confirmed":
            tx.quality_status = "CONFIRMED"
            tx.quantity_status = "CONFIRMED"
        else:
            raise HTTPException(
                status_code=400,
                detail="Quality and quantity must be confirmed by the buyer before releasing payment."
            )

    agr = tx.agreement if tx else proc.agreement
    now = datetime.datetime.utcnow()

    # Calculate live delay penalty
    calc_delay_amt, calc_delay_days = calculate_delay_details(tx.payment_due_date if tx else None, tx.net_realisation if tx else 0.0)
    delay_amt = max(float(payload.delay_amount) if payload.delay_amount is not None else 0.0, calc_delay_amt)
    delay_days = calc_delay_days

    # Labour charges
    labour_chg = tx.labour_charges if (tx and tx.labour_charges is not None) else 0.0
    if payload.labour_charges is not None:
        labour_chg = round(float(payload.labour_charges), 2)
        if tx:
            tx.labour_charges = labour_chg
            tx.labour_status = "AGREED"
    elif tx:
        tx.labour_status = "AGREED"

    base_amt = tx.net_realisation if tx else (agr.total_value if agr else 0.0)
    total_settlement = round(base_amt + labour_chg + delay_amt, 2)

    # Beneficiary UPI ID
    farmer_upi = payload.upi_id or (tx.upi_id if tx else None)
    if not farmer_upi:
        _, default_farmer_upi = get_farmer_mobile_and_upi(agr.farmer if agr else None)
        farmer_upi = default_farmer_upi

    upi_ref = f"UPI/KL/{random.randint(100000000000, 999999999999)}"

    # Update or create payment record (UPI only)
    pmt = None
    if proc:
        pmt = db.query(Payment).filter(Payment.procurement_id == proc.id).first()
    if not pmt and tx:
        pmt = db.query(Payment).filter(Payment.transaction_id == tx.id).first()

    if pmt:
        pmt.status = "RELEASED"
        pmt.amount = total_settlement
        pmt.amount_due = 0.0
        pmt.payment_date = now
        pmt.payment_method = "UPI"
        pmt.upi_id = farmer_upi
        pmt.labour_charges = labour_chg
        pmt.delay_amount = delay_amt
        pmt.payment_reference = getattr(payload, 'payment_reference', None) or pmt.payment_reference or upi_ref
    else:
        pmt = Payment(
            procurement_id=proc.id if proc else 1,
            transaction_id=tx.id if tx else None,
            transaction_code=tx.transaction_code if tx else f"TXN-KL-2026-{agr.id * 10 + 1023}",
            amount=total_settlement,
            amount_due=0.0,
            status="RELEASED",
            payment_method="UPI",
            upi_id=farmer_upi,
            labour_charges=labour_chg,
            delay_amount=delay_amt,
            payment_reference=getattr(payload, 'payment_reference', None) or upi_ref,
            payment_date=now
        )
        db.add(pmt)

    if tx:
        tx.payment_status = "RELEASED"
        tx.released_by = current_user.id
        tx.released_at = now
        tx.payment_method = "UPI"
        tx.upi_id = farmer_upi
        tx.labour_charges = labour_chg
        tx.delay_amount = delay_amt
        tx.delay_days = delay_days
        tx.total_payable_amount = total_settlement
        tx.payment_amount = total_settlement
        tx.final_status = "PAYMENT_RELEASED"

    # Notify Farmer that payment was released by Buyer via UPI
    delay_note = f" (Includes ₹{delay_amt:,.2f} delay charge)" if delay_amt > 0 else ""
    labour_note = f" (Includes ₹{labour_chg:,.2f} labour charges)" if labour_chg > 0 else ""
    if agr and agr.farmer and agr.farmer.user_id:
        create_notification(
            db=db,
            user_id=agr.farmer.user_id,
            title="Payment Released via UPI",
            message=f"UPI Payment of ₹{total_settlement:,.2f}{delay_note}{labour_note} for {tx.crop_name if tx else agr.crop_name} ({tx.transaction_code if tx else pmt.transaction_code}) to UPI ID {farmer_upi} has been released by Buyer. Please verify payment receipt in your Transactions ledger.",
            notification_type="PAYMENT_RELEASED",
            related_id=str(tx.id if tx else pmt.id),
            related_type="TRANSACTION"
        )
    if agr and agr.buyer and agr.buyer.user_id:
        create_notification(
            db=db,
            user_id=agr.buyer.user_id,
            title="Payment Released Successfully via UPI",
            message=f"UPI Payment of ₹{total_settlement:,.2f} for transaction {tx.transaction_code if tx else pmt.transaction_code} has been released to {farmer_upi}. Awaiting verification by the farmer.",
            notification_type="PAYMENT_RELEASED",
            related_id=str(tx.id if tx else pmt.id),
            related_type="TRANSACTION"
        )

    db.commit()

    return {
        "message": "Payment Released Successfully via UPI",
        "transaction_code": tx.transaction_code if tx else pmt.transaction_code,
        "transaction_id": tx.id if tx else None,
        "agreed_amount": base_amt,
        "amount": total_settlement,
        "net_realisation": base_amt,
        "labour_charges": labour_chg,
        "delay_amount": delay_amt,
        "delay_days": delay_days,
        "total_payable_amount": total_settlement,
        "payment_amount": total_settlement,
        "paymentAmount": total_settlement,
        "payment_method": "UPI",
        "upi_id": farmer_upi,
        "payment_status": "RELEASED",
        "paymentStatus": "RELEASED",
        "released_by": tx.released_by if tx else current_user.id,
        "releasedBy": tx.released_by if tx else current_user.id,
        "released_at": format_iso(tx.released_at) if tx else format_iso(now),
        "releasedAt": format_iso(tx.released_at) if tx else format_iso(now),
        "payment_reference": pmt.payment_reference,
        "payment_date": now.strftime("%Y-%m-%d %H:%M")
    }

@router.post("/transactions/{transaction_id}/release-payment")
@router.post("/transactions/{transaction_id}/pay")
def release_transaction_payment(transaction_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return process_payment(ProcessPaymentSchema(transaction_id=transaction_id), current_user=current_user, db=db)

# 4b. FARMER PAYMENT VERIFICATION & COMPLETION
@router.post("/transactions/{transaction_id}/verify-payment")
@router.post("/procurement/verify-payment")
def verify_payment(transaction_id: Optional[int] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tx = None
    if transaction_id:
        tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()

    if not tx and current_user.role == "farmer":
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        if farmer:
            tx = db.query(Transaction).filter(
                Transaction.farmer_id == farmer.id,
                Transaction.payment_status.in_(["RELEASED", "PAYMENT_RELEASED"])
            ).order_by(Transaction.id.desc()).first()

    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found to verify payment.")

    if current_user.role == "farmer":
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        if farmer and tx.farmer_id != farmer.id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Unauthorized to verify payment for this transaction.")

    if tx.payment_status not in ["RELEASED", "PAYMENT_RELEASED", "VERIFIED", "COMPLETED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot verify payment before it has been released by the buyer. Current payment status: '{tx.payment_status}'."
        )

    now = datetime.datetime.utcnow()
    tx.payment_status = "VERIFIED"
    tx.final_status = "COMPLETED"
    tx.procurement_status = "COMPLETED"
    tx.verified_by = current_user.id
    tx.verified_at = now
    tx.completed_at = now

    if tx.procurement:
        tx.procurement.status = "Payment Completed"

    pmt = db.query(Payment).filter((Payment.transaction_id == tx.id) | (Payment.procurement_id == tx.procurement_id)).first()
    if pmt:
        pmt.status = "Completed"
        pmt.amount_due = 0.0

    agr = tx.agreement
    # Notify Buyer that Farmer verified payment and transaction is completed
    if agr and agr.buyer and agr.buyer.user_id:
        create_notification(
            db=db,
            user_id=agr.buyer.user_id,
            title="Transaction Completed Successfully",
            message=f"Farmer {tx.farmer.full_name if tx.farmer else 'Farmer'} has verified payment receipt for transaction {tx.transaction_code} ({tx.crop_name}). The transaction is now COMPLETED.",
            notification_type="TRANSACTION_COMPLETED",
            related_id=str(tx.id),
            related_type="TRANSACTION"
        )
    if agr and agr.farmer and agr.farmer.user_id:
        create_notification(
            db=db,
            user_id=agr.farmer.user_id,
            title="Transaction Completed Successfully",
            message=f"You verified payment receipt of ₹{tx.net_realisation:,.2f} for transaction {tx.transaction_code}. Transaction is now COMPLETED.",
            notification_type="TRANSACTION_COMPLETED",
            related_id=str(tx.id),
            related_type="TRANSACTION"
        )

    db.commit()

    return {
        "message": "Transaction Completed Successfully",
        "payment_status": "VERIFIED",
        "paymentStatus": "VERIFIED",
        "transaction_status": "COMPLETED",
        "transactionStatus": "COMPLETED",
        "final_status": "COMPLETED",
        "verified_by": tx.verified_by,
        "verifiedBy": tx.verified_by,
        "verified_at": format_iso(tx.verified_at),
        "verifiedAt": format_iso(tx.verified_at),
        "completed_at": format_iso(tx.completed_at),
        "completedAt": format_iso(tx.completed_at),
        "transaction_id": tx.id,
        "transaction_code": tx.transaction_code
    }

# 5. TRANSACTIONS LIST & DETAILS
@router.get("/transactions")
def get_transactions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "farmer":
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        if not farmer:
            return []
        txs = db.query(Transaction).filter(Transaction.farmer_id == farmer.id).order_by(Transaction.id.desc()).all()
    elif current_user.role == "buyer":
        buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
        if not buyer:
            return []
        txs = db.query(Transaction).filter(Transaction.buyer_id == buyer.id).order_by(Transaction.id.desc()).all()
    else:
        # Admin gets all transactions
        txs = db.query(Transaction).order_by(Transaction.id.desc()).all()

    result = []
    for t in txs:
        slot = t.booking or (db.query(ProcurementSlot).filter(ProcurementSlot.agreement_id == t.agreement_id).first())
        pmt = db.query(Payment).filter((Payment.transaction_id == t.id) | (Payment.transaction_code == t.transaction_code)).first()
        
        fb_list = db.query(RatingFeedback).filter(RatingFeedback.transaction_id == t.id).all()
        user_fb = next((f for f in fb_list if f.reviewer_id == current_user.id), None)
        other_fb = next((f for f in fb_list if f.reviewer_id != current_user.id), None)

        labour_chg = t.labour_charges or 0.0
        if t.payment_status in ["RELEASED", "PAYMENT_RELEASED", "VERIFIED", "COMPLETED"] and t.delay_amount is not None:
            delay_amt = t.delay_amount or 0.0
            delay_days = t.delay_days or 0
        else:
            delay_amt, delay_days = calculate_delay_details(t.payment_due_date, t.net_realisation)

        total_settlement = round((t.net_realisation or 0.0) + labour_chg + delay_amt, 2)
        _, default_farmer_upi = get_farmer_mobile_and_upi(t.farmer)
        farmer_upi = t.upi_id or default_farmer_upi

        result.append({
            "id": t.id,
            "transaction_code": t.transaction_code,
            "agreement_id": t.agreement_id,
            "agreement_code": t.agreement.agreement_code if t.agreement else f"AGR-{t.agreement_id}",
            "produce_id": t.produce_id,
            "booking_id": t.booking_id,
            "procurement_id": t.procurement_id,
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
            "labour_proposed_by": t.labour_proposed_by,
            "delay_amount": delay_amt,
            "delay_days": delay_days,
            "total_payable_amount": total_settlement,
            "net_price_per_kg": t.net_price_per_kg,
            "procurement_status": t.procurement_status,
            "payment_status": t.payment_status,
            "final_status": t.final_status,
            "transaction_status": t.final_status,
            "quality_status": t.quality_status or "PENDING",
            "quantity_status": t.quantity_status or "PENDING",
            "quality_grade": t.quality_grade or (t.agreement.quality if t.agreement else "Grade A"),
            "payment_amount": total_settlement,
            "payment_method": "UPI",
            "upi_id": farmer_upi,
            "released_by": t.released_by,
            "released_at": format_iso(t.released_at),
            "verified_by": t.verified_by,
            "verified_at": format_iso(t.verified_at),
            "created_at": format_iso(t.created_at),
            "completed_at": format_iso(t.completed_at),
            "farmer_name": t.farmer.full_name if t.farmer else "Farmer",
            "farmer_village": t.farmer.village if t.farmer else "Shadnagar",
            "farmer_district": t.farmer.district if t.farmer else "Rangareddy",
            "buyer_company": t.buyer.company_name if t.buyer else "Verified Buyer",
            "buyer_city": t.buyer.city if t.buyer else "Hyderabad",
            "buyer_district": t.buyer.district if t.buyer else "Regional Hub",
            "slot_date": slot.slot_date if slot else (format_iso(t.procurement.handover_at) if (t.procurement and t.procurement.handover_at) else format_iso(t.created_at)),
            "slot_window": slot.time_window if slot else "10:00 AM – 12:00 PM",
            "pickup_location": slot.location if (slot and slot.location) else (f"{t.farmer.village}, {t.farmer.district}" if t.farmer else "Farmgate Pickup"),
            "payment": {
                "id": pmt.id if pmt else None,
                "amount": pmt.amount if pmt else total_settlement,
                "amount_due": pmt.amount_due if pmt else (0.0 if t.payment_status in ["VERIFIED", "COMPLETED"] else total_settlement),
                "status": pmt.status if pmt else t.payment_status,
                "payment_method": "UPI",
                "upi_id": (pmt.upi_id if pmt and pmt.upi_id else farmer_upi),
                "labour_charges": (pmt.labour_charges if pmt and pmt.labour_charges is not None else labour_chg),
                "delay_amount": (pmt.delay_amount if pmt and pmt.delay_amount is not None else delay_amt),
                "payment_reference": pmt.payment_reference if pmt else f"UPI/KL/{t.id * 100000000 + 12345678}",
                "payment_date": format_iso(pmt.payment_date) if (pmt and pmt.payment_date) else None
            },
            "user_feedback": {
                "id": user_fb.id,
                "rating": user_fb.rating,
                "comments": user_fb.comments,
                "created_at": format_iso(user_fb.created_at)
            } if user_fb else None,
            "other_feedback": {
                "id": other_fb.id,
                "rating": other_fb.rating,
                "comments": other_fb.comments,
                "created_at": format_iso(other_fb.created_at)
            } if other_fb else None
        })
    return result

@router.get("/transactions/{transaction_id}")
def get_transaction_detail(transaction_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction record not found.")

    slot = t.booking
    pmt = db.query(Payment).filter(Payment.transaction_id == t.id).first()
    if not pmt:
        pmt = db.query(Payment).filter(Payment.procurement_id == t.procurement_id).first()

    user_fb = db.query(RatingFeedback).filter(
        RatingFeedback.transaction_id == t.id,
        RatingFeedback.reviewer_id == current_user.id
    ).first()

    other_fb = db.query(RatingFeedback).filter(
        RatingFeedback.transaction_id == t.id,
        RatingFeedback.reviewer_id != current_user.id
    ).first()

    labour_chg = t.labour_charges or 0.0
    if t.payment_status in ["RELEASED", "PAYMENT_RELEASED", "VERIFIED", "COMPLETED"] and t.delay_amount is not None:
        delay_amt = t.delay_amount or 0.0
        delay_days = t.delay_days or 0
    else:
        delay_amt, delay_days = calculate_delay_details(t.payment_due_date, t.net_realisation)

    total_settlement = round((t.net_realisation or 0.0) + labour_chg + delay_amt, 2)
    _, default_farmer_upi = get_farmer_mobile_and_upi(t.farmer)
    farmer_upi = t.upi_id or default_farmer_upi

    return {
        "id": t.id,
        "transaction_code": t.transaction_code,
        "agreement_id": t.agreement_id,
        "agreement_code": t.agreement.agreement_code if t.agreement else f"AGR-{t.agreement_id}",
        "produce_id": t.produce_id,
        "booking_id": t.booking_id,
        "procurement_id": t.procurement_id,
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
        "labour_proposed_by": t.labour_proposed_by,
        "delay_amount": delay_amt,
        "delay_days": delay_days,
        "total_payable_amount": total_settlement,
        "net_price_per_kg": t.net_price_per_kg,
        "procurement_status": t.procurement_status,
        "payment_status": t.payment_status,
        "final_status": t.final_status,
        "transaction_status": t.final_status,
        "quality_status": t.quality_status or "PENDING",
        "quantity_status": t.quantity_status or "PENDING",
        "quality_grade": t.quality_grade or (t.agreement.quality if t.agreement else "Grade A"),
        "payment_amount": total_settlement,
        "payment_method": "UPI",
        "upi_id": farmer_upi,
        "released_by": t.released_by,
        "released_at": format_iso(t.released_at),
        "verified_by": t.verified_by,
        "verified_at": format_iso(t.verified_at),
        "created_at": format_iso(t.created_at),
        "completed_at": format_iso(t.completed_at),
        "farmer_name": t.farmer.full_name if t.farmer else "Farmer",
        "farmer_village": t.farmer.village if t.farmer else "Shadnagar",
        "farmer_district": t.farmer.district if t.farmer else "Rangareddy",
        "buyer_company": t.buyer.company_name if t.buyer else "Verified Buyer",
        "buyer_city": t.buyer.city if t.buyer else "Hyderabad",
        "buyer_district": t.buyer.district if t.buyer else "Regional Hub",
        "slot_date": slot.slot_date if slot else (format_iso(t.procurement.handover_at) if (t.procurement and t.procurement.handover_at) else format_iso(t.created_at)),
        "slot_window": slot.time_window if slot else "10:00 AM – 12:00 PM",
        "pickup_location": slot.location if (slot and slot.location) else (f"{t.farmer.village}, {t.farmer.district}" if t.farmer else "Farmgate Pickup"),
        "payment": {
            "id": pmt.id if pmt else None,
            "amount": pmt.amount if pmt else total_settlement,
            "amount_due": pmt.amount_due if pmt else (0.0 if t.payment_status in ["VERIFIED", "COMPLETED"] else total_settlement),
            "status": pmt.status if pmt else t.payment_status,
            "payment_method": "UPI",
            "upi_id": (pmt.upi_id if pmt and pmt.upi_id else farmer_upi),
            "labour_charges": (pmt.labour_charges if pmt and pmt.labour_charges is not None else labour_chg),
            "delay_amount": (pmt.delay_amount if pmt and pmt.delay_amount is not None else delay_amt),
            "payment_reference": pmt.payment_reference if pmt else f"UPI/KL/{t.id * 100000000 + 12345678}",
            "payment_date": format_iso(pmt.payment_date) if (pmt and pmt.payment_date) else None
        },
        "user_feedback": {
            "id": user_fb.id,
            "rating": user_fb.rating,
            "comments": user_fb.comments,
            "created_at": format_iso(user_fb.created_at)
        } if user_fb else None,
        "other_feedback": {
            "id": other_fb.id,
            "rating": other_fb.rating,
            "comments": other_fb.comments,
            "created_at": format_iso(other_fb.created_at)
        } if other_fb else None
    }

# 6. FEEDBACK & GRIEVANCES
@router.post("/feedback")
def add_feedback(payload: AddFeedbackSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == payload.transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    reviewee_id = tx.buyer.user_id if current_user.role == "farmer" else tx.farmer.user_id
    if not reviewee_id:
        reviewee_id = current_user.id

    existing_fb = db.query(RatingFeedback).filter(
        RatingFeedback.transaction_id == payload.transaction_id,
        RatingFeedback.reviewer_id == current_user.id
    ).first()

    if existing_fb:
        existing_fb.rating = payload.rating
        existing_fb.comments = payload.comments
        existing_fb.communication_rating = payload.communication_rating
        existing_fb.payment_reliability = payload.payment_reliability
        existing_fb.quality_accuracy = payload.quality_accuracy
        existing_fb.pickup_reliability = payload.pickup_reliability
        existing_fb.professionalism = payload.professionalism
        fb = existing_fb
    else:
        fb = RatingFeedback(
            transaction_id=payload.transaction_id,
            reviewer_id=current_user.id,
            reviewee_id=reviewee_id,
            rating=payload.rating,
            communication_rating=payload.communication_rating,
            payment_reliability=payload.payment_reliability,
            quality_accuracy=payload.quality_accuracy,
            pickup_reliability=payload.pickup_reliability,
            professionalism=payload.professionalism,
            comments=payload.comments,
            created_at=datetime.datetime.utcnow()
        )
        db.add(fb)

    db.commit()
    db.refresh(fb)

    return {"message": "Feedback submitted successfully! Thank you.", "feedback_id": fb.id, "rating": fb.rating}

@router.post("/transactions/{transaction_id}/feedback")
def add_transaction_feedback(transaction_id: int, payload: AddFeedbackSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    payload.transaction_id = transaction_id
    return add_feedback(payload, current_user=current_user, db=db)

@router.post("/grievances")
def create_grievance(payload: AddGrievanceSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    grv_code = f"GRV-KL-{datetime.datetime.utcnow().strftime('%M%S')}-{random.randint(100, 999)}"
    grv = Grievance(
        grievance_code=grv_code,
        user_id=current_user.id,
        transaction_id=payload.transaction_id,
        transaction_code=payload.transaction_code,
        category=payload.category,
        title=payload.title,
        description=payload.description,
        status="OPEN"
    )
    db.add(grv)
    db.commit()

    # Notify Admins of new grievance
    notify_admins(
        db=db,
        title="New Grievance Registered",
        message=f"New grievance {grv_code} registered under category '{payload.category}': {payload.title}.",
        notification_type="ADMIN_GRIEVANCE",
        related_id=grv_code,
        related_type="ADMIN_GRIEVANCE"
    )

    return {"message": "Grievance registered successfully.", "grievance_code": grv_code}

@router.get("/grievances")
def get_grievances(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "admin":
        grvs = db.query(Grievance).order_by(Grievance.id.desc()).all()
    else:
        grvs = db.query(Grievance).filter(Grievance.user_id == current_user.id).order_by(Grievance.id.desc()).all()

    result = []
    for g in grvs:
        result.append({
            "id": g.id,
            "grievance_code": g.grievance_code,
            "transaction_id": g.transaction_id,
            "transaction_code": g.transaction_code,
            "category": g.category,
            "title": g.title,
            "description": g.description,
            "status": g.status,
            "admin_remarks": g.admin_remarks,
            "created_at": format_iso(g.created_at)
        })
    return result

@router.put("/grievances/{grievance_id}/respond")
def respond_to_grievance(
    grievance_id: int,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    grv = db.query(Grievance).filter(Grievance.id == grievance_id).first()
    if not grv:
        raise HTTPException(status_code=404, detail="Grievance not found.")
    
    status_val = payload.get("status", grv.status)
    remarks = payload.get("admin_remarks", payload.get("remarks", ""))

    grv.status = status_val.upper() if status_val else grv.status
    if remarks:
        grv.admin_remarks = remarks
    db.commit()

    # Notify the user who raised the grievance
    if grv.user_id:
        from app.notifications import create_notification
        create_notification(
            db=db,
            user_id=grv.user_id,
            title="Grievance Update",
            message=f"Your grievance {grv.grievance_code} status is now '{grv.status}'. Remarks: {grv.admin_remarks or 'No remarks'}.",
            notification_type="info",
            related_id=grv.grievance_code,
            related_type="GRIEVANCE"
        )

    return {"message": f"Grievance status updated to {grv.status}", "grievance_id": grv.id, "status": grv.status}

# 7. NOTIFICATIONS API
@router.get("/notifications")
def get_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notifs = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.id.desc()).all()
    unread_count = len([n for n in notifs if not n.is_read])
    return {
        "count": unread_count,
        "unread_count": unread_count,
        "notifications": [
            {
                "id": n.id,
                "notification_id": n.id,
                "user_id": n.user_id,
                "title": n.title,
                "message": n.message,
                "is_read": n.is_read,
                "type": n.notification_type,
                "notification_type": n.notification_type,
                "related_id": n.related_id,
                "related_type": n.related_type,
                "created_at": format_iso(n.created_at),
                "raw_created_at": format_iso(n.created_at)
            } for n in notifs
        ]
    }

@router.get("/notifications/unread-count")
def get_unread_notification_count(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    count = db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).count()
    return {"count": count, "unread_count": count}

@router.patch("/notifications/{notification_id}/read")
@router.post("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")
    notif.is_read = True
    db.commit()
    return {"status": "success", "message": "Notification marked as read", "notification_id": notification_id}

@router.patch("/notifications/read-all")
@router.post("/notifications/read-all")
def mark_all_notifications_read(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).update({Notification.is_read: True})
    db.commit()
    return {"status": "success", "message": "All notifications marked as read"}
