import datetime
from app.database import SessionLocal
from app.seed import run_schema_migrations
from app.models import Produce, MarketPrice, BuyerRequirement, Grievance

def upgrade_and_seed():
    db = SessionLocal()
    try:
        run_schema_migrations(db)

        # 1. Update Produce lots
        produces = db.query(Produce).all()
        for i, p in enumerate(produces, start=125):
            if not p.lot_code:
                p.lot_code = f"LOT-{i:05d}"
            if p.is_fpo is None:
                p.is_fpo = False
            if not p.quality_parameters:
                p.quality_parameters = "Moisture: 12%, Uniformity: 94%, Certified Pesticide Safe"
            if p.storage_available is None:
                p.storage_available = True
            if p.storage_cost_per_day is None:
                p.storage_cost_per_day = 1.5
            if p.spoilage_risk_percent is None:
                p.spoilage_risk_percent = 3.0

        # Add FPO aggregated lot if not present
        fpo_lot = db.query(Produce).filter(Produce.is_fpo == True).first()
        if not fpo_lot and len(produces) > 0:
            first_p = produces[0]
            p_fpo = Produce(
                farmer_id=first_p.farmer_id,
                crop_name="Tomato",
                variety="Desi Hybrid (Sahu)",
                quantity=5000.0,
                unit="kg",
                quality="Grade A",
                expected_price=28.0,
                harvest_date=first_p.harvest_date,
                available_from=first_p.available_from,
                state="Telangana",
                district=first_p.district,
                mandal=first_p.mandal,
                village=first_p.village,
                pincode=first_p.pincode,
                description="Aggregated Grade A Tomato lot from Shadnagar Farmer Producer Organization (FPO). High volume bulk procurement.",
                images=first_p.images,
                status="Available",
                lot_code="LOT-FPO-00088",
                is_fpo=True,
                fpo_name="Shadnagar Raithu FPO Society",
                aggregated_farmers_count=8,
                quality_parameters="Moisture: 11.5%, Sorting: Automated Optical Grader, Uniformity: 96%",
                storage_available=True,
                storage_cost_per_day=1.2,
                spoilage_risk_percent=2.5
            )
            db.add(p_fpo)

        # 2. Update MarketPrice arrival volumes & demo data tags
        arrival_map = {
            "Tomato": 125.0,
            "Paddy": 340.0,
            "Cotton": 210.0,
            "Maize": 180.0,
            "Chilli": 85.0,
            "Turmeric": 95.0,
            "Onion": 220.0,
            "Red Gram": 110.0
        }
        for mp in db.query(MarketPrice).all():
            if not mp.arrival_volume_tonnes or mp.arrival_volume_tonnes == 125.0:
                mp.arrival_volume_tonnes = arrival_map.get(mp.crop_name, 120.0)
            mp.data_status = "DEMO"
            mp.data_source = "APMC Market Benchmark (Demo / Historical Data)"
            mp.last_updated = "Today 08:30 AM"

        # 3. Update BuyerRequirements with target price range and min grade
        for req in db.query(BuyerRequirement).all():
            if not req.min_quality_grade:
                req.min_quality_grade = req.quality or "Grade A"
            if not req.target_price_min:
                req.target_price_min = round(req.max_price * 0.9, 1)
            if not req.target_price_max:
                req.target_price_max = req.max_price
            if not req.procurement_location:
                req.procurement_location = req.preferred_district or "Direct Procurement Hub"
            if not req.payment_terms:
                req.payment_terms = "100% on Quality Confirmation"

        db.commit()
        print("Database successfully upgraded with SIH enhancements (Lots, Arrivals, FPO, Requirements)!")
    except Exception as e:
        db.rollback()
        print(f"Error upgrading database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    upgrade_and_seed()
