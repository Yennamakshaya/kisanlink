from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_all():
    print("--- 1. Testing Root Endpoint ---")
    res = client.get("/")
    assert res.status_code == 200
    print("Root response:", res.json())

    print("\n--- 2. Testing Farmer Login (Ramesh Reddy) ---")
    res = client.post("/api/auth/login", json={
        "identifier": "farmer@kisanlink.demo",
        "password": "demo123",
        "role": "farmer"
    })
    assert res.status_code == 200, res.text
    farmer_token = res.json()["access_token"]
    print("Farmer token obtained successfully.")

    print("\n--- 3. Testing Buyer Login (Shree Foods) ---")
    res = client.post("/api/auth/login", json={
        "identifier": "buyer@kisanlink.demo",
        "password": "demo123",
        "role": "buyer"
    })
    assert res.status_code == 200, res.text
    buyer_token = res.json()["access_token"]
    print("Buyer token obtained successfully.")

    print("\n--- 4. Testing Admin Login ---")
    res = client.post("/api/auth/login", json={
        "identifier": "admin@kisanlink.telangana.gov.in",
        "password": "Admin@KisanLink2026!",
        "role": "admin"
    })
    assert res.status_code == 200, res.text
    admin_token = res.json()["access_token"]
    print("Admin token obtained successfully.")

    print("\n--- 5. Testing Farmer Dashboard & Produce ---")
    headers = {"Authorization": f"Bearer {farmer_token}"}
    res = client.get("/api/farmer/dashboard-summary", headers=headers)
    if res.status_code != 200:
        print("Error getting farmer summary:", res.status_code, res.text)
    assert res.status_code == 200, res.text
    print("Farmer Summary:", res.json())

    res = client.get("/api/farmer/produce", headers=headers)
    assert res.status_code == 200
    print("My Produce count:", len(res.json()))

    print("\n--- 6. Testing Buyers Discovery & AI Recommendation ---")
    res = client.get("/api/farmer/buyers", headers=headers)
    assert res.status_code == 200
    buyers = res.json()
    print("Discovered Buyers count:", len(buyers))
    if buyers:
        top = buyers[0]
        print("Top Recommended Buyer:", top["company_name"], "| Net Realisation:", top["estimated_net_realisation"], "| Score:", top["ai_score"])

    print("\n--- 7. Testing APMC Market Prices & Price History ---")
    res = client.get("/api/market/prices")
    assert res.status_code == 200
    prices = res.json()
    print("APMC Market Prices count:", len(prices))

    res = client.get("/api/market/history?crop=Tomato&timeframe=30%20Days")
    assert res.status_code == 200
    hist = res.json()
    print("Price History Trend:", hist["trend"], "| Avg Price:", hist["average_price"])

    print("\n--- 8. Testing Kisan Assistant (EN, TE, HI) ---")
    res = client.post("/api/assistant/query", json={"query": "What is today's tomato price?", "language": "en"})
    assert res.status_code == 200
    print("Assistant EN Answer verified.")

    res = client.post("/api/assistant/query", json={"query": "టమోటా ధర ఎంత?", "language": "te"})
    assert res.status_code == 200
    print("Assistant TE Answer verified.")
    
    print("\nALL 8 BACKEND MODULE TESTS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    test_all()
