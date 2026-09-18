import os
import datetime
from sqlalchemy.orm import Session
from app.database import Base, engine, SessionLocal
from app.models import (
    User, FarmerProfile, BuyerProfile, Crop, Produce, Market, MarketPrice,
    BuyerRequirement, FarmerRequest, Offer, Negotiation, Agreement, ProcurementSlot,
    Procurement, QualityConfirmation, Payment, Transaction, RatingFeedback,
    Grievance, Notification, StorageFacility
)
from app.auth import get_password_hash

def load_env():
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip())
        except Exception:
            pass

def run_schema_migrations(db: Session):
    from sqlalchemy import text
    migrations = [
        "ALTER TABLE users ADD COLUMN status VARCHAR DEFAULT 'ACTIVE'",
        "ALTER TABLE offers ADD COLUMN transport_cost FLOAT DEFAULT 1500.0",
        "ALTER TABLE offers ADD COLUMN storage_cost FLOAT DEFAULT 0.0",
        "ALTER TABLE offers ADD COLUMN net_realisation FLOAT DEFAULT 0.0",
        "ALTER TABLE offers ADD COLUMN current_offer_by VARCHAR DEFAULT 'farmer'",
        "ALTER TABLE offers ADD COLUMN agreement_id INTEGER",
        "ALTER TABLE offers ADD COLUMN agreed_price FLOAT",
        "ALTER TABLE offers ADD COLUMN agreed_quantity FLOAT",
        "ALTER TABLE offers ADD COLUMN accepted_by VARCHAR",
        "ALTER TABLE offers ADD COLUMN accepted_at DATETIME",
        "ALTER TABLE offers ADD COLUMN updated_at DATETIME",
        "ALTER TABLE negotiations ADD COLUMN sender_id INTEGER",
        "ALTER TABLE negotiations ADD COLUMN status VARCHAR DEFAULT 'ACTIVE'",
        "ALTER TABLE agreements ADD COLUMN created_at DATETIME",
        "ALTER TABLE procurements ADD COLUMN created_at DATETIME",
        "ALTER TABLE payments ADD COLUMN created_at DATETIME",
        "ALTER TABLE procurement_slots ADD COLUMN location VARCHAR",
        "ALTER TABLE procurement_slots ADD COLUMN crop_name VARCHAR",
        "ALTER TABLE procurement_slots ADD COLUMN quantity FLOAT",
        "ALTER TABLE procurement_slots ADD COLUMN farmer_id INTEGER",
        "ALTER TABLE procurement_slots ADD COLUMN buyer_id INTEGER",
        "ALTER TABLE procurement_slots ADD COLUMN created_at DATETIME",
        "ALTER TABLE transactions ADD COLUMN produce_id INTEGER",
        "ALTER TABLE transactions ADD COLUMN booking_id INTEGER",
        "ALTER TABLE transactions ADD COLUMN procurement_id INTEGER",
        "ALTER TABLE transactions ADD COLUMN completed_at DATETIME",
        "ALTER TABLE payments ADD COLUMN transaction_id INTEGER",
        "ALTER TABLE payments ADD COLUMN amount_due FLOAT",
        "ALTER TABLE payments ADD COLUMN payment_reference VARCHAR",
        "ALTER TABLE notifications ADD COLUMN related_id VARCHAR",
        "ALTER TABLE notifications ADD COLUMN related_type VARCHAR",
        "ALTER TABLE produce ADD COLUMN lot_code VARCHAR",
        "ALTER TABLE produce ADD COLUMN is_fpo BOOLEAN DEFAULT 0",
        "ALTER TABLE produce ADD COLUMN fpo_name VARCHAR",
        "ALTER TABLE produce ADD COLUMN aggregated_farmers_count INTEGER DEFAULT 1",
        "ALTER TABLE produce ADD COLUMN quality_parameters TEXT",
        "ALTER TABLE produce ADD COLUMN storage_available BOOLEAN DEFAULT 0",
        "ALTER TABLE produce ADD COLUMN storage_cost_per_day FLOAT DEFAULT 1.5",
        "ALTER TABLE produce ADD COLUMN spoilage_risk_percent FLOAT DEFAULT 3.0",
        "ALTER TABLE market_prices ADD COLUMN arrival_volume_tonnes FLOAT DEFAULT 125.0",
        "ALTER TABLE market_prices ADD COLUMN data_status VARCHAR DEFAULT 'DEMO'",
        "ALTER TABLE market_prices ADD COLUMN last_updated VARCHAR DEFAULT 'Today 08:30 AM'",
        "ALTER TABLE buyer_requirements ADD COLUMN min_quality_grade VARCHAR DEFAULT 'Grade A'",
        "ALTER TABLE buyer_requirements ADD COLUMN target_price_min FLOAT",
        "ALTER TABLE buyer_requirements ADD COLUMN target_price_max FLOAT",
        "ALTER TABLE buyer_requirements ADD COLUMN procurement_location VARCHAR",
        "ALTER TABLE buyer_requirements ADD COLUMN payment_terms VARCHAR DEFAULT '100% on Quality Confirmation'",
        "ALTER TABLE grievances ADD COLUMN transaction_id INTEGER",
        "ALTER TABLE grievances ADD COLUMN transaction_code VARCHAR",
        "ALTER TABLE offers ADD COLUMN request_id INTEGER",
        "ALTER TABLE offers ADD COLUMN quality VARCHAR DEFAULT 'Grade A'",
        "ALTER TABLE negotiations ADD COLUMN request_id INTEGER",
        "ALTER TABLE negotiations ADD COLUMN receiver_id INTEGER",
        "ALTER TABLE agreements ADD COLUMN request_id INTEGER",
        "ALTER TABLE farmer_profiles ADD COLUMN kyc_status VARCHAR DEFAULT 'verified'",
        "ALTER TABLE farmer_profiles ADD COLUMN land_records_status VARCHAR DEFAULT 'verified'",
        "ALTER TABLE buyer_profiles ADD COLUMN business_reg_status VARCHAR DEFAULT 'verified'",
        "ALTER TABLE produce ADD COLUMN flagged_reason VARCHAR",
        "ALTER TABLE offers ADD COLUMN cold_storage_required BOOLEAN DEFAULT 0",
        "ALTER TABLE offers ADD COLUMN storage_duration VARCHAR",
        "ALTER TABLE negotiations ADD COLUMN payment_terms VARCHAR DEFAULT 'Within 3 Days'",
        "ALTER TABLE negotiations ADD COLUMN cold_storage_required BOOLEAN DEFAULT 0",
        "ALTER TABLE negotiations ADD COLUMN storage_cost FLOAT DEFAULT 0.0",
        "ALTER TABLE negotiations ADD COLUMN storage_duration VARCHAR",
        "ALTER TABLE agreements ADD COLUMN payment_terms VARCHAR DEFAULT 'Within 3 Days'",
        "ALTER TABLE agreements ADD COLUMN cold_storage_required BOOLEAN DEFAULT 0",
        "ALTER TABLE agreements ADD COLUMN storage_duration VARCHAR",
        "ALTER TABLE transactions ADD COLUMN payment_terms VARCHAR DEFAULT 'Within 3 Days'",
        "ALTER TABLE transactions ADD COLUMN payment_due_date VARCHAR",
        "ALTER TABLE transactions ADD COLUMN cold_storage_required BOOLEAN DEFAULT 0",
        "ALTER TABLE transactions ADD COLUMN storage_duration VARCHAR",
        "ALTER TABLE transactions ADD COLUMN labour_charges FLOAT DEFAULT 0.0",
        "ALTER TABLE transactions ADD COLUMN labour_notes VARCHAR",
        "ALTER TABLE transactions ADD COLUMN labour_status VARCHAR DEFAULT 'PENDING'",
        "ALTER TABLE transactions ADD COLUMN labour_proposed_by VARCHAR",
        "ALTER TABLE transactions ADD COLUMN delay_amount FLOAT DEFAULT 0.0",
        "ALTER TABLE transactions ADD COLUMN delay_days INTEGER DEFAULT 0",
        "ALTER TABLE transactions ADD COLUMN total_payable_amount FLOAT",
        "ALTER TABLE transactions ADD COLUMN payment_method VARCHAR DEFAULT 'UPI'",
        "ALTER TABLE transactions ADD COLUMN upi_id VARCHAR",
        "ALTER TABLE payments ADD COLUMN upi_id VARCHAR",
        "ALTER TABLE payments ADD COLUMN labour_charges FLOAT DEFAULT 0.0",
        "ALTER TABLE payments ADD COLUMN delay_amount FLOAT DEFAULT 0.0",
    ]
    for sql in migrations:
        try:
            db.execute(text(sql))
            db.commit()
        except Exception:
            db.rollback()

    # Ensure all tables (including audit_logs) exist
    Base.metadata.create_all(bind=engine)

    # Seed initial audit logs if empty
    from app.models import AuditLog
    if db.query(AuditLog).count() == 0:
        initial_logs = [
            AuditLog(
                username="admin",
                role="admin",
                action="SYSTEM_INITIALIZED",
                related_record="SYS-CORE-2026",
                entity_type="SYSTEM",
                details="KisanLink administrative oversight system initialized with full telemetry.",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=2)
            ),
            AuditLog(
                username="admin",
                role="admin",
                action="VERIFIED_BUYER",
                related_record="BUYER-001 (Balaji Trades)",
                entity_type="BUYER",
                details="Verified GST certificate and trade license documentation.",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=1, hours=4)
            ),
            AuditLog(
                username="admin",
                role="admin",
                action="VERIFIED_FARMER",
                related_record="FARMER-001 (Ramesh Reddy)",
                entity_type="FARMER",
                details="Verified Aadhaar KYC and Land Revenue passbook records for Shadnagar farmgate.",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=1)
            ),
            AuditLog(
                username="admin",
                role="admin",
                action="AUDITED_LOT",
                related_record="LOT-001 (Tomato Grade A)",
                entity_type="PRODUCE",
                details="Validated harvest parameters and perishability holding window.",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=6)
            ),
        ]
        db.add_all(initial_logs)
        db.commit()


def init_admin_account(db: Session):
    load_env()
    run_schema_migrations(db)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@kisanlink.telangana.gov.in").strip()
    admin_username = os.environ.get("ADMIN_USERNAME", "admin").strip()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@KisanLink2026!")
    admin_mobile = os.environ.get("ADMIN_MOBILE", "9999999999").strip()

    # Search for any existing admin account
    admin_user = db.query(User).filter(
        (User.role.ilike("admin")) |
        (User.email.ilike(admin_email)) |
        (User.username.ilike(admin_username))
    ).first()

    if not admin_user:
        admin_user = User(
            email=admin_email,
            mobile_number=admin_mobile,
            username=admin_username,
            password_hash=get_password_hash(admin_password),
            role="admin",
            status="ACTIVE",
            preferred_language="en"
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
    else:
        admin_user.role = "admin"
        admin_user.status = "ACTIVE"
        admin_user.password_hash = get_password_hash(admin_password)
        db.commit()

    print(f"Initial Admin account ready. Use ADMIN_EMAIL from your environment configuration to login. (Account: {admin_email})")
    return admin_user

def seed_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    
    try:
        print("Seeding KisanLink Database...")
        
        # 1. Initial Admin Account (Seeded safely)
        admin_user = init_admin_account(db)
        
        # 2. Primary Demo Farmer (Ramesh Reddy)
        farmer_user = User(
            email="farmer@kisanlink.demo",
            mobile_number="9876543210",
            username="ramesh_reddy",
            password_hash=get_password_hash("demo123"),
            role="farmer",
            preferred_language="te"
        )
        db.add(farmer_user)
        db.commit()
        db.refresh(farmer_user)
        
        farmer_profile = FarmerProfile(
            user_id=farmer_user.id,
            full_name="Ramesh Reddy",
            address="H.No 4-12, Main Road",
            village="Shadnagar",
            mandal="Farooqnagar",
            district="Rangareddy",
            state="Telangana",
            pincode="509216",
            aadhaar_masked="XXXX XXXX 1234",
            crops_grown="Tomato, Chilli, Maize, Paddy",
            farm_size="8 Acres",
            status="verified",
            rating=4.9,
            completed_transactions=15,
            reliability_score=96.5
        )
        db.add(farmer_profile)
        db.commit()
        db.refresh(farmer_profile)
        
        # Additional 9 Farmers across Telangana
        telangana_farmer_data = [
            ("Venkat Swamy", "Siddipet", "Siddipet Rural", "Siddipet", "Paddy, Maize", "12 Acres", "XXXX XXXX 5678", 4.8, 18, 95.0),
            ("Kishnaiah", "Jangaon", "Bachannapet", "Jangaon", "Cotton, Chilli", "6 Acres", "XXXX XXXX 8901", 4.7, 10, 92.0),
            ("Mallesh Goud", "Warangal", "Geesugonda", "Warangal", "Turmeric, Red Gram", "10 Acres", "XXXX XXXX 2345", 4.9, 22, 97.0),
            ("Anji Reddy", "Armoor", "Armoor", "Nizamabad", "Turmeric, Maize", "15 Acres", "XXXX XXXX 6789", 4.8, 14, 94.0),
            ("Laxman Rao", "Karimnagar", "Choppadandi", "Karimnagar", "Paddy, Cotton", "7 Acres", "XXXX XXXX 3456", 4.6, 9, 91.0),
            ("Bikshapathi", "Nalgonda", "Chityal", "Nalgonda", "Sweet Lime, Paddy", "9 Acres", "XXXX XXXX 7890", 4.7, 11, 93.0),
            ("Srinivasulu", "Jadcherla", "Jadcherla", "Mahabubnagar", "Groundnut, Maize", "11 Acres", "XXXX XXXX 4567", 4.8, 16, 96.0),
            ("Narsaiah", "Medak", "Haveli Ghanpur", "Medak", "Tomato, Vegetables", "5 Acres", "XXXX XXXX 1122", 4.5, 8, 89.0),
            ("Sammaiah", "Khammam", "Wyra", "Khammam", "Chilli, Paddy", "14 Acres", "XXXX XXXX 3344", 4.9, 25, 98.0)
        ]
        
        for idx, (fname, vil, man, dist, crops, fsize, aadh, rat, ctx, rel) in enumerate(telangana_farmer_data, start=2):
            fuser = User(
                email=f"farmer{idx}@kisanlink.demo",
                mobile_number=f"987654321{idx}",
                username=f"farmer_{idx}",
                password_hash=get_password_hash("demo123"),
                role="farmer",
                preferred_language="te"
            )
            db.add(fuser)
            db.commit()
            db.refresh(fuser)
            
            fprof = FarmerProfile(
                user_id=fuser.id,
                full_name=fname,
                address=f"Village Center, {vil}",
                village=vil,
                mandal=man,
                district=dist,
                state="Telangana",
                pincode=f"5000{idx}0",
                aadhaar_masked=aadh,
                crops_grown=crops,
                farm_size=fsize,
                status="verified",
                rating=rat,
                completed_transactions=ctx,
                reliability_score=rel
            )
            db.add(fprof)
            db.commit()
            
        # 3. Primary Demo Buyer (Balaji Trades)
        buyer_user = User(
            email="buyer@kisanlink.demo",
            mobile_number="9876543211",
            username="shree_foods",
            password_hash=get_password_hash("demo123"),
            role="buyer",
            preferred_language="en"
        )
        db.add(buyer_user)
        db.commit()
        db.refresh(buyer_user)
        
        buyer_profile = BuyerProfile(
            user_id=buyer_user.id,
            company_name="Balaji Trades",
            company_id="CMP-TG-2024-8841",
            contact_person="Srinivas Rao",
            address="Plot 42, Food Processing Zone, Cherlapally",
            city="Hyderabad",
            district="Medchal-Malkajgiri",
            state="Telangana",
            pincode="500051",
            gstin="36AAAAA0000A1Z5",
            pan="ABCDE1234F",
            gstin_masked="36AAAAA****1Z5",
            pan_masked="ABCDE****F",
            udyam_number="UDYAM-TG-05-0012345",
            buyer_category="Food Processor & Bulk Exporter",
            procurement_categories="Tomato, Vegetables, Spices",
            verification_status="verified",
            gst_doc_url="/uploads/gst_shree_foods.pdf",
            rating=4.7,
            completed_transactions=34,
            reliability_score=94.0,
            response_time="< 1 hour"
        )
        db.add(buyer_profile)
        db.commit()
        db.refresh(buyer_profile)
        
        # Additional 7 Buyers across Telangana
        telangana_buyer_data = [
            ("Heritage Foods Procurement", "CMP-TG-1002", "M.V. Ramana", "Begumpet", "Hyderabad", "Retail Chain", 4.8, 48, 97.0),
            ("Spencers Hypermarket Wholesale", "CMP-TG-1003", "K. Suresh", "Kukatpally", "Hyderabad", "Supermarket Chain", 4.6, 28, 92.0),
            ("Telangana Agros Fed", "CMP-TG-1004", "Govind Raj", "Public Gardens", "Hyderabad", "State Co-operative", 4.9, 65, 98.0),
            ("Kakatiya Agro Processing Unit", "CMP-TG-1005", "B. Kishan", "Industrial Estate", "Warangal", "Processor", 4.7, 19, 93.0),
            ("Nizamabad Spices & Grains Pvt Ltd", "CMP-TG-1006", "Rajeshwar", "APMC Market Yard", "Nizamabad", "Exporters", 4.8, 41, 96.0),
            ("BigBasket Central Telangana Hub", "CMP-TG-1007", "Pradeep V.", "Shamshabad", "Rangareddy", "E-Commerce Logistics", 4.9, 82, 98.5),
            ("Deccan Fresh Organics", "CMP-TG-1008", "Swathi Reddy", "Gachibowli", "Hyderabad", "Organic Aggregator", 4.5, 15, 90.0)
        ]
        
        for idx, (cname, cid, cperson, addr, dist, bcat, rat, ctx, rel) in enumerate(telangana_buyer_data, start=2):
            buser = User(
                email=f"buyer{idx}@kisanlink.demo",
                mobile_number=f"987654322{idx}",
                username=f"buyer_{idx}",
                password_hash=get_password_hash("demo123"),
                role="buyer",
                preferred_language="en"
            )
            db.add(buser)
            db.commit()
            db.refresh(buser)
            
            bprof = BuyerProfile(
                user_id=buser.id,
                company_name=cname,
                company_id=cid,
                contact_person=cperson,
                address=addr,
                city=dist,
                district=dist if dist in ["Hyderabad", "Warangal", "Nizamabad"] else "Rangareddy",
                state="Telangana",
                pincode=f"5000{idx}2",
                gstin=f"36BBBBB000{idx}A1Z9",
                pan=f"FGHIJ567{idx}K",
                gstin_masked=f"36BBBBB****{idx}A1Z9",
                pan_masked=f"FGHIJ****{idx}K",
                udyam_number=f"UDYAM-TG-05-00{idx}567",
                buyer_category=bcat,
                procurement_categories="Paddy, Maize, Turmeric, Chilli, Vegetables",
                verification_status="verified",
                gst_doc_url=f"/uploads/gst_doc_{idx}.pdf",
                rating=rat,
                completed_transactions=ctx,
                reliability_score=rel,
                response_time="< 2 hours"
            )
            db.add(bprof)
            db.commit()

        # 4. Telangana APMC Markets
        markets_data = [
            ("Bowenpally Vegetable Market", "Bowenpally, Secunderabad", "Hyderabad", 17.4721, 78.4839),
            ("Gudimalkapur Wholesale Market", "Gudimalkapur, Mehdipatnam", "Hyderabad", 17.3875, 78.4389),
            ("Malakpet Grains & Spices Market", "Malakpet", "Hyderabad", 17.3732, 78.5028),
            ("Shadnagar Agricultural Market Yard", "Shadnagar Town", "Rangareddy", 17.0700, 78.2045),
            ("Nizamabad APMC Market Yard", "Subhash Nagar", "Nizamabad", 18.6725, 78.0941),
            ("Warangal Grain & Cotton Market Yard", "Enumamula", "Warangal", 17.9689, 79.5941),
            ("Karimnagar Agricultural Market Yard", "Collectorate Road", "Karimnagar", 18.4386, 79.1288),
            ("Siddipet APMC Market", "Medak Road", "Siddipet", 18.1018, 78.8520),
            ("Suryapet Grain Market", "Khammam Road", "Suryapet", 17.1439, 79.6239),
            ("Khammam Red Chilli Market", "Naya Bazar", "Khammam", 17.2473, 80.1514)
        ]
        
        created_markets = []
        for name, loc, dist, lat, lng in markets_data:
            m = Market(name=name, location=loc, district=dist, state="Telangana", latitude=lat, longitude=lng)
            db.add(m)
            db.commit()
            db.refresh(m)
            created_markets.append(m)
            
        # 5. Market Prices (APMC Daily Rates & Price History)
        crops_list = ["Tomato", "Paddy", "Cotton", "Maize", "Chilli", "Turmeric", "Onion", "Red Gram"]
        price_benchmarks = {
            "Tomato": (24.0, 32.0, 28.0, 28.5, +1.5),
            "Paddy": (21.0, 25.0, 23.5, 23.2, -0.5),
            "Cotton": (62.0, 75.0, 70.0, 69.5, +2.0),
            "Maize": (18.0, 22.5, 20.5, 20.0, 0.0),
            "Chilli": (160.0, 210.0, 190.0, 188.0, +5.0),
            "Turmeric": (120.0, 155.0, 140.0, 138.0, +3.0),
            "Onion": (18.0, 26.0, 22.0, 22.5, -1.0),
            "Red Gram": (58.0, 72.0, 66.0, 65.0, +1.0)
        }
        
        today_str = datetime.date.today().isoformat()
        
        for m in created_markets:
            for cname in crops_list:
                min_p, max_p, mod_p, avg_p, p_chg = price_benchmarks[cname]
                mp = MarketPrice(
                    market_id=m.id,
                    crop_name=cname,
                    min_price=min_p,
                    max_price=max_p,
                    modal_price=mod_p,
                    avg_price=avg_p,
                    price_change=p_chg,
                    price_date=today_str,
                    data_source="APMC Market Benchmark (Demo / Historical Data)",
                    arrival_volume_tonnes=price_benchmarks[cname][1] * 4.5,
                    data_status="DEMO",
                    last_updated="Today 08:30 AM"
                )
                db.add(mp)
        db.commit()

        # 6. Primary Demo Produce (Ramesh Reddy - Tomato 500kg Lot)
        primary_produce = Produce(
            farmer_id=farmer_profile.id,
            crop_name="Tomato",
            variety="Desi Hybrid (Sahu)",
            quantity=500.0,
            unit="kg",
            quality="Grade A",
            expected_price=30.0,
            harvest_date=today_str,
            available_from=today_str,
            state="Telangana",
            district="Rangareddy",
            mandal="Farooqnagar",
            village="Shadnagar",
            pincode="509216",
            description="Freshly harvested farm-fresh Grade A tomatoes from Shadnagar red soil fields. Firm texture, uniform red color, zero damage.",
            images="https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop",
            status="Available",
            lot_code="LOT-00125",
            is_fpo=False,
            quality_parameters="Moisture: 12%, Uniformity: 95%, Certified Pesticide Safe",
            storage_available=True,
            storage_cost_per_day=1.5,
            spoilage_risk_percent=3.0
        )
        db.add(primary_produce)
        db.commit()
        db.refresh(primary_produce)
        
        # Additional produce listings from other farmers
        extra_produces = [
            (2, "Paddy", "BPT 5204 (Sona Masuri)", 2000.0, "kg", "Grade A", 24.0, "Siddipet", "Siddipet Rural", "Siddipet", "High quality aged paddy grain suitable for rice milling."),
            (3, "Cotton", "Bunny Hybrid", 1500.0, "kg", "Premium", 72.0, "Jangaon", "Bachannapet", "Jangaon", "Long staple clean cotton lint with low trash content."),
            (4, "Turmeric", "Duggirala / Salem", 800.0, "kg", "Grade A", 145.0, "Warangal", "Geesugonda", "Warangal", "High curcumin content bright yellow cured turmeric finger."),
            (5, "Maize", "DeKalb Hybrid", 3000.0, "kg", "Grade A", 21.0, "Nizamabad", "Armoor", "Nizamabad", "Dry yellow maize grain with < 12% moisture level."),
            (6, "Chilli", "Teja (S17)", 600.0, "kg", "Premium", 195.0, "Khammam", "Wyra", "Khammam", "Deep red, high pungency Teja chilli pods."),
            (7, "Tomato", "Lakshmi Hybrid", 1200.0, "kg", "Grade B", 26.0, "Medak", "Haveli Ghanpur", "Medak", "Good quality cooking tomatoes, ready for immediate dispatch.")
        ]
        for fid, cname, var, qty, u, qual, pr, dist, man, vil, desc in extra_produces:
            prod = Produce(
                farmer_id=fid,
                crop_name=cname,
                variety=var,
                quantity=qty,
                unit=u,
                quality=qual,
                expected_price=pr,
                harvest_date=today_str,
                available_from=today_str,
                state="Telangana",
                district=dist,
                mandal=man,
                village=vil,
                pincode="500000",
                description=desc,
                images="https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop",
                status="Available"
            )
            db.add(prod)
        db.commit()

        # 7. Buyer Requirements (Balaji Trades Requirement)
        primary_req = BuyerRequirement(
            buyer_id=buyer_profile.id,
            crop_name="Tomato",
            variety="Desi Hybrid",
            required_quantity=5000.0,
            quality="Grade A",
            max_price=32.0,
            preferred_district="Rangareddy / Hyderabad",
            preferred_mandal="Farooqnagar / Shadnagar",
            required_by_date=today_str,
            pickup_delivery="Pickup",
            additional_reqs="Require firm Grade A tomatoes for sauce processing. Direct farm pickup.",
            status="Active"
        )
        db.add(primary_req)
        db.commit()
        db.refresh(primary_req)

        # 8. Storage Facilities
        storage_data = [
            ("Hyderabad Central Cold Storage", "Gachibowli", "Hyderabad", 500.0, 320.0, 0.5),
            ("Rangareddy Agro Logistics Hub", "Shamshabad", "Rangareddy", 1000.0, 750.0, 0.4),
            ("Nizamabad Spices Cold Chain", "APMC Yard", "Nizamabad", 800.0, 410.0, 0.6),
            ("Warangal Cotton & Grain Warehouse", "Enumamula", "Warangal", 1200.0, 900.0, 0.35),
            ("Khammam Cold Storage Complex", "Wyra Road", "Khammam", 600.0, 280.0, 0.55)
        ]
        for sname, sloc, sdist, cap, acap, cost in storage_data:
            sf = StorageFacility(
                name=sname, location=sloc, district=sdist, capacity_tn=cap, available_capacity_tn=acap, cost_per_kg=cost, status="Operational"
            )
            db.add(sf)
        db.commit()

        # 9. Grievances Demo Data
        grv = Grievance(
            grievance_code="GRV-KL-10001",
            user_id=farmer_user.id,
            category="Payment Issue",
            title="Clarification regarding payment release timeline",
            description="Verified payment processing sandbox status for completed order AGR-KL-2026-0009.",
            status="Resolved",
            admin_remarks="Payment was completed and confirmed in sandbox ledger TXN-KL-2026-0099."
        )
        db.add(grv)
        db.commit()

        # 10. Initial Notifications
        n1 = Notification(
            user_id=farmer_user.id,
            title="Welcome to KisanLink!",
            message="Your farmer registration is verified. Start adding your produce or exploring market prices.",
            notification_type="success"
        )
        n2 = Notification(
            user_id=buyer_user.id,
            title="Buyer Profile Verified",
            message="Your GST document has been approved by Platform Admin. You can now send offers to farmers.",
            notification_type="success"
        )
        db.add_all([n1, n2])
        db.commit()

        print("Database Seeded Successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
