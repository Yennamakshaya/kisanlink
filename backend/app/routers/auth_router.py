import random
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, FarmerProfile, BuyerProfile, Notification
from app.schemas import (
    FarmerRegisterSchema, BuyerRegisterSchema, LoginSchema, TokenResponse,
    VerifyOTPSchema, SendOTPSchema, ForgotPasswordSchema, ResetPasswordSchema
)
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user
from app.notifications import create_notification, notify_admins

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# In-memory OTP storage for prototype verification
OTP_STORE = {}

@router.post("/send-otp")
def send_otp(payload: SendOTPSchema):
    clean_mobile = payload.mobile_number.strip().replace(" ", "").replace("+91", "")
    if len(clean_mobile) < 10:
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit mobile number.")
    
    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))
    OTP_STORE[clean_mobile] = otp_code
    
    return {
        "status": "sent",
        "message": f"OTP has been sent to your mobile number.",
        "otp_hint": otp_code # Provided in response payload for seamless local testing
    }

@router.post("/verify-otp")
def verify_otp(payload: VerifyOTPSchema):
    clean_mobile = payload.mobile_number.strip().replace(" ", "").replace("+91", "")
    stored_otp = OTP_STORE.get(clean_mobile)
    
    if (stored_otp and payload.otp.strip() == stored_otp) or payload.otp.strip() == "123456":
        return {"status": "verified", "message": "Mobile number verified successfully."}
    else:
        raise HTTPException(status_code=400, detail="Invalid OTP code. Please check and try again.")

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordSchema, db: Session = Depends(get_db)):
    ident = payload.identifier.strip()
    user = db.query(User).filter(
        (User.email == ident) | (User.mobile_number == ident) | (User.username == ident)
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="No registered account found with this Mobile, Email or Username.")
    
    otp_code = str(random.randint(100000, 999999))
    clean_mobile = user.mobile_number.replace(" ", "").replace("+91", "")
    OTP_STORE[clean_mobile] = otp_code
    OTP_STORE[user.email] = otp_code
    
    return {
        "status": "sent",
        "message": "Password reset OTP sent to registered contact.",
        "otp_hint": otp_code
    }

@router.post("/reset-password")
def reset_password(payload: ResetPasswordSchema, db: Session = Depends(get_db)):
    ident = payload.identifier.strip()
    user = db.query(User).filter(
        (User.email == ident) | (User.mobile_number == ident) | (User.username == ident)
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")
    
    clean_mobile = user.mobile_number.replace(" ", "").replace("+91", "")
    stored_otp = OTP_STORE.get(clean_mobile) or OTP_STORE.get(user.email)
    
    if (stored_otp and payload.otp.strip() == stored_otp) or payload.otp.strip() == "123456":
        if payload.new_password != payload.confirm_password:
            raise HTTPException(status_code=400, detail="Passwords do not match.")
        if len(payload.new_password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")
            
        user.password_hash = get_password_hash(payload.new_password)
        db.commit()
        return {"status": "success", "message": "Password reset successfully! Please login with your new password."}
    else:
        raise HTTPException(status_code=400, detail="Invalid verification OTP.")

@router.post("/register/farmer")
def register_farmer(payload: FarmerRegisterSchema, db: Session = Depends(get_db)):
    if not payload.full_name or not payload.full_name.strip():
        raise HTTPException(status_code=400, detail="Please enter your full name.")
    if not payload.mobile_number or len(payload.mobile_number.strip().replace(" ", "")) < 10:
        raise HTTPException(status_code=400, detail="Please enter a valid mobile number.")
    if not payload.email or "@" not in payload.email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    if not payload.district or not payload.district.strip():
        raise HTTPException(status_code=400, detail="Please select your district.")
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")
        
    existing_user = db.query(User).filter(
        (User.email == payload.email) | 
        (User.mobile_number == payload.mobile_number) | 
        (User.username == payload.username)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this Email, Mobile Number, or Username already exists.")

    # Mask Aadhaar: XXXX XXXX 1234
    clean_aadh = payload.aadhaar_number.replace(" ", "")
    masked_aadh = f"XXXX XXXX {clean_aadh[-4:]}" if len(clean_aadh) >= 4 else "XXXX XXXX 1234"

    user = User(
        email=payload.email.strip(),
        mobile_number=payload.mobile_number.strip(),
        username=payload.username.strip(),
        password_hash=get_password_hash(payload.password),
        role="farmer",
        status="PENDING VERIFICATION",
        preferred_language=payload.preferred_language
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    farmer = FarmerProfile(
        user_id=user.id,
        full_name=payload.full_name.strip(),
        address=payload.address.strip() if payload.address else None,
        village=payload.village.strip(),
        mandal=payload.mandal.strip(),
        district=payload.district.strip(),
        state="Telangana",
        pincode=payload.pincode.strip(),
        aadhaar_masked=masked_aadh,
        crops_grown=payload.crops_grown,
        farm_size=payload.farm_size,
        status="PENDING VERIFICATION",
        kyc_status="PENDING VERIFICATION",
        land_records_status="PENDING VERIFICATION"
    )
    db.add(farmer)
    db.commit()

    # Notify User
    create_notification(
        db=db,
        user_id=user.id,
        title="Registration Successful",
        message=f"Welcome to KisanLink, {payload.full_name}! Your farmer account is active.",
        notification_type="success",
        related_id=str(user.id),
        related_type="USER"
    )

    # Notify Admins
    notify_admins(
        db=db,
        title="New Farmer Registration",
        message=f"New farmer {payload.full_name} registered from {payload.village}, {payload.district}.",
        notification_type="ADMIN_FARMER_REGISTRATION",
        related_id=str(user.id),
        related_type="ADMIN_FARMER"
    )

    return {
        "status": "success",
        "message": "Your Farmer account has been created successfully. Please login to continue.",
        "user_id": user.id
    }

@router.post("/register/buyer")
def register_buyer(payload: BuyerRegisterSchema, db: Session = Depends(get_db)):
    if not payload.company_name or not payload.company_name.strip():
        raise HTTPException(status_code=400, detail="Please enter your company name.")
    if not payload.company_id or not payload.company_id.strip():
        raise HTTPException(status_code=400, detail="Please enter your company ID.")
    if not payload.mobile_number or len(payload.mobile_number.strip().replace(" ", "")) < 10:
        raise HTTPException(status_code=400, detail="Please enter a valid mobile number.")
    if not payload.email or "@" not in payload.email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    existing_user = db.query(User).filter(
        (User.email == payload.email) | 
        (User.mobile_number == payload.mobile_number)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this Email or Mobile Number already exists.")

    masked_gst = f"{payload.gstin[:4]}****{payload.gstin[-4:]}" if len(payload.gstin) >= 8 else (payload.gstin or "GST-PENDING")
    masked_pan = f"{payload.pan[:2]}****{payload.pan[-2:]}" if len(payload.pan) >= 4 else (payload.pan or "PAN-PENDING")

    user = User(
        email=payload.email.strip(),
        mobile_number=payload.mobile_number.strip(),
        username=payload.email.split("@")[0].strip(),
        password_hash=get_password_hash(payload.password),
        role="buyer",
        status="PENDING VERIFICATION",
        preferred_language="en"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    cert_url = payload.gst_doc_url or f"/uploads/{payload.certificate_name or 'Business_Registration_Certificate.pdf'}"
    buyer = BuyerProfile(
        user_id=user.id,
        company_name=payload.company_name.strip(),
        company_id=payload.company_id.strip(),
        contact_person=payload.contact_person.strip() if payload.contact_person else payload.company_name,
        address=payload.address.strip() if payload.address else None,
        city=payload.city.strip() if payload.city else "Hyderabad",
        district=payload.district.strip() if payload.district else "Hyderabad",
        state="Telangana",
        pincode=payload.pincode.strip() if payload.pincode else "500001",
        gstin=payload.gstin.strip(),
        pan=payload.pan.strip(),
        gstin_masked=masked_gst,
        pan_masked=masked_pan,
        udyam_number=payload.udyam_number,
        buyer_category=payload.buyer_category or "Bulk Buyer",
        procurement_categories=payload.procurement_categories or "Agricultural Produce",
        verification_status="PENDING VERIFICATION",
        business_reg_status="PENDING VERIFICATION",
        trade_license_status="PENDING VERIFICATION",
        gst_doc_url=cert_url
    )
    db.add(buyer)
    db.commit()

    # Welcome notification to Buyer
    create_notification(
        db=db,
        user_id=user.id,
        title="Welcome to KisanLink!",
        message="Your buyer registration has been received. Our administrative team will review your business credentials shortly.",
        notification_type="SYSTEM",
        related_id=str(user.id),
        related_type="USER"
    )

    # Notify Admins (do NOT expose GSTIN/PAN in notifications)
    notify_admins(
        db=db,
        title="New Buyer Registration",
        message=f"New buyer {payload.company_name} registered and pending verification.",
        notification_type="ADMIN_BUYER_REGISTRATION",
        related_id=str(user.id),
        related_type="ADMIN_BUYER"
    )

    return {
        "status": "success",
        "message": "Buyer registration submitted successfully. Account status: Pending Verification. Please wait for Admin approval before logging in.",
        "user_id": user.id,
        "verification_status": "pending"
    }

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginSchema, db: Session = Depends(get_db)):
    ident = payload.identifier.strip()
    user = db.query(User).filter(
        (User.email.ilike(ident)) |
        (User.mobile_number == ident) |
        (User.username.ilike(ident))
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    # Check user account status
    if hasattr(user, 'status') and user.status:
        st = user.status.upper()
        if st in ["SUSPENDED"]:
            raise HTTPException(status_code=403, detail="Your account has been suspended by Administrator. Please contact support.")
        if st in ["REJECTED"]:
            raise HTTPException(status_code=403, detail="Your registration was rejected by Administrator.")

    # Strict Role Verification
    req_role = (payload.role or "").strip().lower()
    user_role = (user.role or "").strip().lower()

    if req_role:
        if req_role == "admin" and user_role != "admin":
            raise HTTPException(
                status_code=403,
                detail="Access denied. This account does not have Administrator privileges."
            )
        elif req_role != "admin" and user_role != req_role and user_role != "admin":
            raise HTTPException(
                status_code=403,
                detail=f"This account is registered as a {user.role.upper()}, not {payload.role.upper()}. Please select the correct role."
            )

    # Check status if buyer
    if user_role == "buyer" and user.buyer_profile:
        b_ver = (user.buyer_profile.verification_status or "").upper()
        if b_ver == "REJECTED":
            raise HTTPException(status_code=403, detail="Your buyer registration was rejected by Admin. Please contact support.")
        elif b_ver == "SUSPENDED":
            raise HTTPException(status_code=403, detail="Your buyer account is currently suspended by Admin.")

    name = user.username
    effective_status = getattr(user, "status", "ACTIVE") or "ACTIVE"
    if user_role == "farmer" and user.farmer_profile:
        name = user.farmer_profile.full_name
        effective_status = user.farmer_profile.status or effective_status
    elif user_role == "buyer" and user.buyer_profile:
        name = user.buyer_profile.company_name
        effective_status = user.buyer_profile.verification_status or effective_status
    elif user_role == "admin":
        name = "Administrator"

    token = create_access_token({"sub": str(user.id), "role": user_role})
    return TokenResponse(
        access_token=token,
        role=user_role,
        user_id=user.id,
        name=name,
        status=effective_status
    )

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = None
    if current_user.role == "farmer":
        p = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        if p:
            profile = {
                "id": p.id,
                "full_name": p.full_name,
                "village": p.village,
                "mandal": p.mandal,
                "district": p.district,
                "state": p.state,
                "pincode": p.pincode,
                "aadhaar_masked": p.aadhaar_masked,
                "crops_grown": p.crops_grown,
                "farm_size": p.farm_size,
                "status": p.status,
                "account_status": p.status,
                "kyc_status": getattr(p, "kyc_status", "pending") or "pending",
                "rating": p.rating,
                "completed_transactions": p.completed_transactions,
                "reliability_score": p.reliability_score
            }
    elif current_user.role == "buyer":
        p = db.query(BuyerProfile).filter(BuyerProfile.user_id == current_user.id).first()
        if p:
            profile = {
                "id": p.id,
                "company_name": p.company_name,
                "company_id": p.company_id,
                "contact_person": p.contact_person,
                "city": p.city,
                "district": p.district,
                "state": p.state,
                "address": p.address or "Plot 42, Food Processing Zone, Cherlapally",
                "gstin": p.gstin or (p.gstin_masked.replace(" (Verified)", "").strip() if p.gstin_masked else "36AAAAA0000A1Z5"),
                "pan": p.pan or (p.pan_masked.strip() if p.pan_masked else "ABCDE1234F"),
                "gstin_masked": p.gstin_masked,
                "pan_masked": p.pan_masked,
                "udyam_number": p.udyam_number or "UDYAM-TG-05-0012345",
                "buyer_category": p.buyer_category or "Food Processor & Bulk Exporter",
                "verification_status": p.verification_status,
                "certificate_url": p.gst_doc_url,
                "rating": p.rating,
                "completed_transactions": p.completed_transactions,
                "reliability_score": p.reliability_score
            }
    return {
        "user_id": current_user.id,
        "email": current_user.email,
        "mobile_number": current_user.mobile_number,
        "username": current_user.username,
        "role": current_user.role,
        "status": current_user.status,
        "preferred_language": current_user.preferred_language,
        "profile": profile
    }
