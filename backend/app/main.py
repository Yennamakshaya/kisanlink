from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine, SessionLocal
from app.seed import init_admin_account
from app.routers import (
    auth_router, farmer_router, buyer_router, admin_router,
    market_router, workflow_router, assistant_router, communication_router
)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="KisanLink — Agricultural Marketplace API",
    description="Backend API for KisanLink digital agricultural procurement platform.",
    version="1.0.0"
)

@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        init_admin_account(db)
    except Exception as e:
        print(f"Startup Admin initialization note: {e}")
    finally:
        db.close()

# Enable CORS for React Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router.router)
app.include_router(farmer_router.router)
app.include_router(buyer_router.router)
app.include_router(admin_router.router)
app.include_router(market_router.router)
app.include_router(workflow_router.router)
app.include_router(assistant_router.router)
app.include_router(communication_router.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "platform": "KisanLink Agricultural Marketplace",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
