import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    mobile_number = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False) # 'farmer', 'buyer', 'admin'
    status = Column(String, default="ACTIVE") # 'ACTIVE', 'INACTIVE', 'SUSPENDED'
    preferred_language = Column(String, default="en") # 'en', 'te', 'hi'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    farmer_profile = relationship("FarmerProfile", back_populates="user", uselist=False)
    buyer_profile = relationship("BuyerProfile", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="user")

class FarmerProfile(Base):
    __tablename__ = "farmer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    address = Column(String, nullable=True)
    village = Column(String, nullable=False)
    mandal = Column(String, nullable=False)
    district = Column(String, nullable=False)
    state = Column(String, default="Telangana")
    pincode = Column(String, nullable=False)
    aadhaar_masked = Column(String, nullable=False)
    crops_grown = Column(String, nullable=True) # JSON or comma separated
    farm_size = Column(String, nullable=True) # e.g. "5 Acres"
    status = Column(String, default="verified") # 'verified', 'pending', 'suspended'
    kyc_status = Column(String, default="verified") # 'verified', 'pending', 'rejected'
    land_records_status = Column(String, default="verified") # 'verified', 'pending', 'rejected'
    rating = Column(Float, default=4.8)
    completed_transactions = Column(Integer, default=12)
    reliability_score = Column(Float, default=95.0)

    user = relationship("User", back_populates="farmer_profile")
    produces = relationship("Produce", back_populates="farmer")

class Crop(Base):
    __tablename__ = "crops"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    category = Column(String, default="Agriculture")

class BuyerProfile(Base):
    __tablename__ = "buyer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    company_name = Column(String, nullable=False)
    company_id = Column(String, nullable=False)
    contact_person = Column(String, nullable=False)
    address = Column(String, nullable=True)
    city = Column(String, nullable=False)
    district = Column(String, nullable=False)
    state = Column(String, default="Telangana")
    pincode = Column(String, nullable=False)
    gstin = Column(String, nullable=True)
    pan = Column(String, nullable=True)
    gstin_masked = Column(String, nullable=False)
    pan_masked = Column(String, nullable=False)
    udyam_number = Column(String, nullable=True)
    buyer_category = Column(String, nullable=False)
    procurement_categories = Column(String, nullable=True)
    verification_status = Column(String, default="verified") # 'pending', 'verified', 'rejected', 'suspended'
    business_reg_status = Column(String, default="verified") # 'pending', 'verified', 'rejected'
    trade_license_status = Column(String, default="verified") # 'pending', 'verified', 'rejected'
    gst_doc_url = Column(String, nullable=True)
    rating = Column(Float, default=4.7)
    completed_transactions = Column(Integer, default=24)
    reliability_score = Column(Float, default=94.0)
    response_time = Column(String, default="< 2 hours")

    user = relationship("User", back_populates="buyer_profile")
    requirements = relationship("BuyerRequirement", back_populates="buyer")

class Produce(Base):
    __tablename__ = "produce"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmer_profiles.id"), nullable=False)
    crop_name = Column(String, nullable=False)
    variety = Column(String, nullable=True)
    quantity = Column(Float, nullable=False)
    unit = Column(String, default="kg")
    quality = Column(String, default="Grade A") # 'Premium', 'Grade A', 'Grade B', 'Grade C'
    expected_price = Column(Float, nullable=False)
    harvest_date = Column(String, nullable=False)
    available_from = Column(String, nullable=False)
    state = Column(String, default="Telangana")
    district = Column(String, nullable=False)
    mandal = Column(String, nullable=False)
    village = Column(String, nullable=False)
    pincode = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    images = Column(Text, nullable=True) # comma separated or JSON string
    status = Column(String, default="Available") # 'Available', 'In Negotiation', 'Agreed', 'Deactivated', 'Flagged'
    flagged_reason = Column(String, nullable=True)
    lot_code = Column(String, unique=True, index=True, nullable=True) # e.g. 'LOT-00125'
    is_fpo = Column(Boolean, default=False)
    fpo_name = Column(String, nullable=True)
    aggregated_farmers_count = Column(Integer, default=1)
    quality_parameters = Column(Text, nullable=True) # e.g. "Moisture: 12%, Uniformity: 95%"
    storage_available = Column(Boolean, default=False)
    storage_cost_per_day = Column(Float, default=1.5)
    spoilage_risk_percent = Column(Float, default=3.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    farmer = relationship("FarmerProfile", back_populates="produces")

class Market(Base):
    __tablename__ = "markets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    district = Column(String, nullable=False)
    state = Column(String, default="Telangana")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

class MarketPrice(Base):
    __tablename__ = "market_prices"

    id = Column(Integer, primary_key=True, index=True)
    market_id = Column(Integer, ForeignKey("markets.id"), nullable=False)
    crop_name = Column(String, nullable=False)
    min_price = Column(Float, nullable=False)
    max_price = Column(Float, nullable=False)
    modal_price = Column(Float, nullable=False)
    avg_price = Column(Float, nullable=False)
    price_change = Column(Float, default=0.0)
    price_date = Column(String, nullable=False)
    data_source = Column(String, default="APMC Market Intelligence Network")
    arrival_volume_tonnes = Column(Float, default=125.0)
    data_status = Column(String, default="VERIFIED") # 'VERIFIED', 'LIVE', 'HISTORICAL'
    last_updated = Column(String, default="Today 08:30 AM")

    market = relationship("Market")

class BuyerRequirement(Base):
    __tablename__ = "buyer_requirements"

    id = Column(Integer, primary_key=True, index=True)
    buyer_id = Column(Integer, ForeignKey("buyer_profiles.id"), nullable=False)
    crop_name = Column(String, nullable=False)
    variety = Column(String, nullable=True)
    required_quantity = Column(Float, nullable=False)
    quality = Column(String, default="Grade A")
    min_quality_grade = Column(String, default="Grade A")
    max_price = Column(Float, nullable=False)
    target_price_min = Column(Float, nullable=True)
    target_price_max = Column(Float, nullable=True)
    preferred_district = Column(String, nullable=False)
    preferred_mandal = Column(String, nullable=True)
    procurement_location = Column(String, nullable=True)
    required_by_date = Column(String, nullable=False)
    pickup_delivery = Column(String, default="Pickup") # 'Pickup' or 'Delivery'
    payment_terms = Column(String, default="100% on Quality Confirmation")
    additional_reqs = Column(Text, nullable=True)
    status = Column(String, default="Active") # 'Active', 'Fulfilled', 'Closed'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    buyer = relationship("BuyerProfile", back_populates="requirements")

class FarmerRequest(Base):
    __tablename__ = "farmer_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_code = Column(String, unique=True, index=True, nullable=True)
    farmer_id = Column(Integer, ForeignKey("farmer_profiles.id"), nullable=False)
    buyer_id = Column(Integer, ForeignKey("buyer_profiles.id"), nullable=False)
    produce_id = Column(Integer, ForeignKey("produce.id"), nullable=True)
    requirement_id = Column(Integer, ForeignKey("buyer_requirements.id"), nullable=True)
    crop_name = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    quality = Column(String, default="Grade A")
    expected_price = Column(Float, nullable=False)
    message = Column(Text, nullable=True)
    status = Column(String, default="PENDING") # 'PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED'
    offer_id = Column(Integer, ForeignKey("offers.id"), nullable=True)
    accepted_at = Column(DateTime, nullable=True)
    accepted_by = Column(Integer, nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    rejected_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    farmer = relationship("FarmerProfile")
    buyer = relationship("BuyerProfile")
    produce = relationship("Produce")
    offer = relationship("Offer", foreign_keys=[offer_id])

class Offer(Base):
    __tablename__ = "offers"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("farmer_requests.id"), nullable=True)
    produce_id = Column(Integer, ForeignKey("produce.id"), nullable=True)
    requirement_id = Column(Integer, ForeignKey("buyer_requirements.id"), nullable=True)
    farmer_id = Column(Integer, ForeignKey("farmer_profiles.id"), nullable=False)
    buyer_id = Column(Integer, ForeignKey("buyer_profiles.id"), nullable=False)
    crop_name = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    quality = Column(String, default="Grade A")
    price_per_kg = Column(Float, nullable=False)
    total_value = Column(Float, nullable=False)
    transport_cost = Column(Float, default=0.0)
    storage_cost = Column(Float, default=0.0)
    cold_storage_required = Column(Boolean, default=False)
    storage_duration = Column(String, nullable=True)
    net_realisation = Column(Float, default=0.0)
    pickup_date = Column(String, nullable=False)
    delivery_location = Column(String, nullable=False)
    payment_terms = Column(String, default="Within 3 Days")
    message = Column(Text, nullable=True)
    status = Column(String, default="ACTIVE") # 'ACTIVE', 'BUYER_PENDING', 'FARMER_PENDING', 'OFFER_SENT', 'ACCEPTED', 'REJECTED', 'CANCELLED'
    sender_role = Column(String, nullable=False) # 'buyer' or 'farmer'
    current_offer_by = Column(String, default="farmer") # 'farmer' or 'buyer'
    agreement_id = Column(Integer, nullable=True)
    agreed_price = Column(Float, nullable=True)
    agreed_quantity = Column(Float, nullable=True)
    accepted_by = Column(String, nullable=True)
    accepted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    farmer = relationship("FarmerProfile")
    buyer = relationship("BuyerProfile")
    produce = relationship("Produce")
    request = relationship("FarmerRequest", foreign_keys=[request_id])
    negotiations = relationship("Negotiation", back_populates="offer", cascade="all, delete-orphan")

class Negotiation(Base):
    __tablename__ = "negotiations"

    id = Column(Integer, primary_key=True, index=True)
    offer_id = Column(Integer, ForeignKey("offers.id"), nullable=False)
    request_id = Column(Integer, nullable=True)
    sender_id = Column(Integer, nullable=True)
    sender_role = Column(String, nullable=False) # 'buyer' or 'farmer'
    sender_name = Column(String, nullable=False)
    receiver_id = Column(Integer, nullable=True)
    price_per_kg = Column(Float, nullable=False)
    quantity = Column(Float, nullable=False)
    payment_terms = Column(String, default="Within 3 Days")
    cold_storage_required = Column(Boolean, default=False)
    storage_cost = Column(Float, default=0.0)
    storage_duration = Column(String, nullable=True)
    message = Column(Text, nullable=True)
    status = Column(String, default="ACTIVE")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    offer = relationship("Offer", back_populates="negotiations")

class Agreement(Base):
    __tablename__ = "agreements"

    id = Column(Integer, primary_key=True, index=True)
    agreement_code = Column(String, unique=True, index=True, nullable=False)
    offer_id = Column(Integer, ForeignKey("offers.id"), nullable=False)
    request_id = Column(Integer, nullable=True)
    produce_id = Column(Integer, ForeignKey("produce.id"), nullable=True)
    farmer_id = Column(Integer, ForeignKey("farmer_profiles.id"), nullable=False)
    buyer_id = Column(Integer, ForeignKey("buyer_profiles.id"), nullable=False)
    crop_name = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    quality = Column(String, nullable=False)
    final_price = Column(Float, nullable=False)
    total_value = Column(Float, nullable=False)
    transport_cost = Column(Float, default=0.0)
    storage_cost = Column(Float, default=0.0)
    cold_storage_required = Column(Boolean, default=False)
    storage_duration = Column(String, nullable=True)
    other_costs = Column(Float, default=0.0)
    net_realisation = Column(Float, nullable=False)
    procurement_date = Column(String, nullable=False)
    last_tx_date = Column(String, nullable=False)
    payment_terms = Column(String, default="Payment as per Negotiation")
    payment_deadline = Column(String, nullable=False)
    pickup_deadline = Column(String, nullable=False)
    terms_and_conditions = Column(Text, nullable=False)
    farmer_signed = Column(Boolean, default=False)
    buyer_signed = Column(Boolean, default=False)
    signed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="Draft") # 'Draft', 'Signed', 'Cancelled'

    farmer = relationship("FarmerProfile")
    buyer = relationship("BuyerProfile")

class ProcurementSlot(Base):
    __tablename__ = "procurement_slots"

    id = Column(Integer, primary_key=True, index=True)
    agreement_id = Column(Integer, ForeignKey("agreements.id"), nullable=False)
    slot_code = Column(String, unique=True, nullable=False)
    slot_date = Column(String, nullable=False)
    time_window = Column(String, nullable=False) # e.g. "10:00 AM – 12:00 PM"
    location = Column(String, nullable=True)
    crop_name = Column(String, nullable=True)
    quantity = Column(Float, nullable=True)
    farmer_id = Column(Integer, ForeignKey("farmer_profiles.id"), nullable=True)
    buyer_id = Column(Integer, ForeignKey("buyer_profiles.id"), nullable=True)
    booked_by = Column(String, nullable=False)
    status = Column(String, default="Booked")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    agreement = relationship("Agreement")
    farmer = relationship("FarmerProfile")
    buyer = relationship("BuyerProfile")

class Procurement(Base):
    __tablename__ = "procurements"

    id = Column(Integer, primary_key=True, index=True)
    agreement_id = Column(Integer, ForeignKey("agreements.id"), nullable=False)
    slot_id = Column(Integer, ForeignKey("procurement_slots.id"), nullable=True)
    farmer_id = Column(Integer, ForeignKey("farmer_profiles.id"), nullable=False)
    buyer_id = Column(Integer, ForeignKey("buyer_profiles.id"), nullable=False)
    produce_id = Column(Integer, ForeignKey("produce.id"), nullable=True)
    status = Column(String, default="Agreement Signed")
    pickup_location = Column(String, nullable=False)
    delivery_location = Column(String, nullable=False)
    distance_km = Column(Float, default=45.0)
    transport_cost = Column(Float, default=0.0)
    handover_notes = Column(Text, nullable=True)
    handover_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    agreement = relationship("Agreement")
    farmer = relationship("FarmerProfile")
    buyer = relationship("BuyerProfile")

class QualityConfirmation(Base):
    __tablename__ = "quality_confirmations"

    id = Column(Integer, primary_key=True, index=True)
    procurement_id = Column(Integer, ForeignKey("procurements.id"), nullable=False)
    expected_quantity = Column(Float, nullable=False)
    received_quantity = Column(Float, nullable=False)
    diff_quantity = Column(Float, default=0.0)
    quality_received = Column(String, nullable=False)
    status = Column(String, default="Accepted") # 'Accepted', 'Accepted with Adjustment', 'Rejected'
    adjustment_reason = Column(Text, nullable=True)
    confirmed_at = Column(DateTime, default=datetime.datetime.utcnow)

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    procurement_id = Column(Integer, ForeignKey("procurements.id"), nullable=False)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    transaction_code = Column(String, unique=True, nullable=False)
    amount = Column(Float, nullable=False)
    amount_due = Column(Float, nullable=True)
    status = Column(String, default="Pending") # 'Pending', 'Processing', 'Completed', 'Failed'
    payment_method = Column(String, default="UPI")
    upi_id = Column(String, nullable=True)
    labour_charges = Column(Float, default=0.0)
    delay_amount = Column(Float, default=0.0)
    payment_reference = Column(String, nullable=True)
    payment_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    procurement = relationship("Procurement")
    transaction = relationship("Transaction", back_populates="payments")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_code = Column(String, unique=True, nullable=False)
    agreement_id = Column(Integer, ForeignKey("agreements.id"), nullable=False)
    farmer_id = Column(Integer, ForeignKey("farmer_profiles.id"), nullable=False)
    buyer_id = Column(Integer, ForeignKey("buyer_profiles.id"), nullable=False)
    produce_id = Column(Integer, ForeignKey("produce.id"), nullable=True)
    booking_id = Column(Integer, ForeignKey("procurement_slots.id"), nullable=True)
    procurement_id = Column(Integer, ForeignKey("procurements.id"), nullable=True)
    crop_name = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    price_per_kg = Column(Float, nullable=False)
    gross_value = Column(Float, nullable=False)
    transport_cost = Column(Float, default=0.0)
    storage_cost = Column(Float, default=0.0)
    cold_storage_required = Column(Boolean, default=False)
    storage_duration = Column(String, nullable=True)
    other_costs = Column(Float, default=0.0)
    net_realisation = Column(Float, nullable=False)
    net_price_per_kg = Column(Float, nullable=False)
    payment_terms = Column(String, default="Payment as per Negotiation")
    payment_due_date = Column(String, nullable=True)
    labour_charges = Column(Float, default=0.0)
    labour_notes = Column(String, nullable=True)
    labour_status = Column(String, default="PENDING") # 'PENDING', 'PROPOSED', 'AGREED'
    labour_proposed_by = Column(String, nullable=True) # 'farmer' or 'buyer'
    delay_amount = Column(Float, default=0.0)
    delay_days = Column(Integer, default=0)
    total_payable_amount = Column(Float, nullable=True)
    payment_method = Column(String, default="UPI")
    upi_id = Column(String, nullable=True)
    procurement_status = Column(String, default="HANDOVER_COMPLETED")
    payment_status = Column(String, default="PENDING") # 'PENDING', 'RELEASED', 'VERIFIED', 'COMPLETED'
    final_status = Column(String, default="HANDOVER_COMPLETED")
    quality_status = Column(String, default="PENDING")
    quantity_status = Column(String, default="PENDING")
    quality_grade = Column(String, nullable=True)
    payment_amount = Column(Float, nullable=True)
    released_by = Column(Integer, nullable=True)
    released_at = Column(DateTime, nullable=True)
    verified_by = Column(Integer, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    agreement = relationship("Agreement")
    farmer = relationship("FarmerProfile")
    buyer = relationship("BuyerProfile")
    produce = relationship("Produce")
    booking = relationship("ProcurementSlot")
    procurement = relationship("Procurement")
    payments = relationship("Payment", back_populates="transaction")
    feedbacks = relationship("RatingFeedback", back_populates="transaction")

class RatingFeedback(Base):
    __tablename__ = "ratings_feedback"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reviewee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False) # 1 to 5
    communication_rating = Column(Integer, default=5)
    payment_reliability = Column(Integer, default=5)
    quality_accuracy = Column(Integer, default=5)
    pickup_reliability = Column(Integer, default=5)
    professionalism = Column(Integer, default=5)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    transaction = relationship("Transaction", back_populates="feedbacks")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    reviewee = relationship("User", foreign_keys=[reviewee_id])

class Grievance(Base):
    __tablename__ = "grievances"

    id = Column(Integer, primary_key=True, index=True)
    grievance_code = Column(String, unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    transaction_code = Column(String, nullable=True)
    category = Column(String, nullable=False) # 'Payment Issue', 'Quality Dispute', etc.
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String, default="Open") # 'Open', 'Under Review', 'Resolved', 'Escalated', 'Closed'
    admin_remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")
    transaction = relationship("Transaction")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    notification_type = Column(String, default="info")
    related_id = Column(String, nullable=True)
    related_type = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="notifications")

class StorageFacility(Base):
    __tablename__ = "storage_facilities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    district = Column(String, nullable=False)
    capacity_tn = Column(Float, nullable=False)
    available_capacity_tn = Column(Float, nullable=False)
    cost_per_kg = Column(Float, default=0.5)
    status = Column(String, default="Operational")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String, nullable=False, default="admin")
    role = Column(String, nullable=False, default="admin")
    action = Column(String, nullable=False)
    related_record = Column(String, nullable=False)
    entity_type = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")

class AdminMessage(Base):
    __tablename__ = "admin_messages"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    conversation_id = Column(String, nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    sender_role = Column(String, nullable=False, default="admin")
    sender_name = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    read_status = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    admin = relationship("User", foreign_keys=[admin_id])
    user = relationship("User", foreign_keys=[user_id])
    sender = relationship("User", foreign_keys=[sender_id])


