from pydantic import BaseModel
from typing import Optional, List
import datetime

# Auth Schemas
class FarmerRegisterSchema(BaseModel):
    full_name: str
    mobile_number: str
    username: str
    email: str
    password: str
    confirm_password: str
    address: Optional[str] = None
    village: str
    mandal: str
    district: str
    state: str = "Telangana"
    pincode: str
    aadhaar_number: str
    preferred_language: str = "en"
    crops_grown: Optional[str] = None
    farm_size: Optional[str] = None

class BuyerRegisterSchema(BaseModel):
    company_name: str
    company_id: str
    contact_person: str
    mobile_number: str
    email: str
    password: str
    confirm_password: str
    address: Optional[str] = None
    city: str
    district: str
    state: str = "Telangana"
    pincode: str
    gstin: str
    pan: str
    udyam_number: Optional[str] = None
    buyer_category: str
    procurement_categories: Optional[str] = None
    certificate_name: Optional[str] = None
    gst_doc_url: Optional[str] = None

class LoginSchema(BaseModel):
    identifier: str # Email / Mobile / Username
    password: str
    role: str # 'farmer', 'buyer', 'admin'

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    name: str
    status: Optional[str] = "ACTIVE"

class VerifyOTPSchema(BaseModel):
    mobile_number: str
    otp: str

class SendOTPSchema(BaseModel):
    mobile_number: str

class ForgotPasswordSchema(BaseModel):
    identifier: str # Mobile or Email

class ResetPasswordSchema(BaseModel):
    identifier: str
    otp: str
    new_password: str
    confirm_password: str

# Produce Schemas
class AddProduceSchema(BaseModel):
    crop_name: str
    variety: Optional[str] = None
    quantity: float
    unit: str = "kg"
    quality: str = "Grade A"
    expected_price: float
    harvest_date: str
    available_from: str
    state: str = "Telangana"
    district: str
    mandal: str
    village: str
    pincode: str
    description: Optional[str] = None
    images: Optional[str] = None
    lot_code: Optional[str] = None
    is_fpo: bool = False
    fpo_name: Optional[str] = None
    aggregated_farmers_count: int = 1
    quality_parameters: Optional[str] = None
    storage_available: bool = False
    storage_cost_per_day: float = 1.5
    spoilage_risk_percent: float = 3.0

# Requirement Schemas
class AddRequirementSchema(BaseModel):
    crop_name: str
    variety: Optional[str] = None
    required_quantity: float
    quality: str = "Grade A"
    min_quality_grade: str = "Grade A"
    max_price: float
    target_price_min: Optional[float] = None
    target_price_max: Optional[float] = None
    preferred_district: str
    preferred_mandal: Optional[str] = None
    procurement_location: Optional[str] = None
    required_by_date: str
    pickup_delivery: str = "Pickup"
    payment_terms: str = "100% on Quality Confirmation"
    additional_reqs: Optional[str] = None

# Farmer Request Schemas
class CreateFarmerRequestSchema(BaseModel):
    buyer_id: int
    produce_id: Optional[int] = None
    requirement_id: Optional[int] = None
    crop_name: str
    quantity: float
    quality: str = "Grade A"
    farmer_expected_price: float
    message: Optional[str] = None

class SendOfferOnRequestSchema(BaseModel):
    offered_price: float
    quantity: Optional[float] = None
    message: Optional[str] = None
    pickup_date: Optional[str] = None
    delivery_location: Optional[str] = None
    payment_terms: Optional[str] = "Within 3 Days"
    cold_storage_required: Optional[bool] = False
    storage_cost: Optional[float] = 0.0
    storage_duration: Optional[str] = None

# Offer & Negotiation Schemas
class SendOfferSchema(BaseModel):
    request_id: Optional[int] = None
    produce_id: Optional[int] = None
    requirement_id: Optional[int] = None
    farmer_id: Optional[int] = None
    buyer_id: Optional[int] = None
    crop_name: str
    quantity: float
    quality: str = "Grade A"
    price_per_kg: float
    pickup_date: Optional[str] = None
    delivery_location: Optional[str] = None
    payment_terms: str = "Within 3 Days"
    cold_storage_required: Optional[bool] = False
    storage_cost: Optional[float] = 0.0
    storage_duration: Optional[str] = None
    message: Optional[str] = None

class CounterOfferSchema(BaseModel):
    offer_id: Optional[int] = None
    price_per_kg: float
    quantity: Optional[float] = None
    payment_terms: Optional[str] = None
    cold_storage_required: Optional[bool] = False
    storage_cost: Optional[float] = 0.0
    storage_duration: Optional[str] = None
    message: Optional[str] = None

# Agreement Sign Schema
class SignAgreementSchema(BaseModel):
    accepted_tc: bool

# Slot Booking Schema
class BookSlotSchema(BaseModel):
    agreement_id: Optional[int] = None
    slot_id: Optional[int] = None
    slot_date: Optional[str] = None
    time_window: Optional[str] = None
    location: Optional[str] = None
    crop: Optional[str] = None
    quantity: Optional[float] = None

# Quality Confirmation Schema
class QualityConfirmSchema(BaseModel):
    procurement_id: Optional[int] = None
    transaction_id: Optional[int] = None
    agreement_id: Optional[int] = None
    received_quantity: float
    quality_received: str = "Grade A"
    status: str = "Accepted" # 'Accepted', 'Accepted with Adjustment', 'Rejected', 'CONFIRMED'
    adjustment_reason: Optional[str] = None

# Payment Schema
class ProcessPaymentSchema(BaseModel):
    procurement_id: Optional[int] = None
    transaction_id: Optional[int] = None
    payment_method: str = "UPI"
    upi_id: Optional[str] = None
    payment_reference: Optional[str] = None
    labour_charges: Optional[float] = None
    delay_amount: Optional[float] = None

# Labour Charges Negotiation Schema
class NegotiateLabourSchema(BaseModel):
    labour_charges: float
    labour_notes: Optional[str] = None
    action: Optional[str] = "agree" # 'propose', 'agree'

# Rating Feedback Schema
class AddFeedbackSchema(BaseModel):
    transaction_id: int
    rating: int
    communication_rating: int = 5
    payment_reliability: int = 5
    quality_accuracy: int = 5
    pickup_reliability: int = 5
    professionalism: int = 5
    comments: Optional[str] = None

# Grievance Schema
class AddGrievanceSchema(BaseModel):
    category: str
    title: str
    description: str
    transaction_id: Optional[int] = None
    transaction_code: Optional[str] = None

# Assistant Schema
class AssistantQuerySchema(BaseModel):
    query: str
    language: str = "en"
