import sys
import os
import io
import base64
import numpy as np
from PIL import Image

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.image_verifier import verify_produce_image, decode_image_payload, analyze_produce_image_bytes

def generate_synthetic_crop_bytes(crop_name: str) -> bytes:
    img_array = np.zeros((200, 200, 3), dtype=np.uint8)
    
    if crop_name == "Tomato":
        img_array[:, :] = [220, 30, 30] # Vibrant red
    elif crop_name == "Cotton":
        img_array[:, :] = [245, 245, 245] # White / fluffy
    elif crop_name == "Onion":
        img_array[:, :] = [160, 40, 140] # Purple / papery skin
    elif crop_name == "Potato":
        img_array[:, :] = [180, 140, 90] # Earthy tan brown
    elif crop_name == "Paddy":
        img_array[:, :] = [210, 175, 60] # Golden straw hue
        # Add texture noise
        noise = np.random.randint(-20, 20, (200, 200, 3), dtype=np.int16)
        img_array = np.clip(img_array.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        
    pil_img = Image.fromarray(img_array, mode='RGB')
    buffer = io.BytesIO()
    pil_img.save(buffer, format='JPEG')
    return buffer.getvalue()

def run_tests():
    crops = ["Tomato", "Cotton", "Onion", "Potato", "Paddy"]
    print("=== Testing Produce Image Verification Backend Logic ===")
    
    passed = 0
    total = 0
    
    # 1. Test Match Scenarios
    for crop in crops:
        img_bytes = generate_synthetic_crop_bytes(crop)
        res = verify_produce_image(img_bytes, crop)
        total += 1
        if res["is_match"]:
            print(f"[PASS] Match Test Passed for {crop}: {res['message']}")
            passed += 1
        else:
            print(f"[FAIL] Match Test Failed for {crop}: {res['message']}")

    # 2. Test Mismatch Scenarios
    mismatch_pairs = [
        ("Onion", "Tomato"), # User selected Onion, uploaded Tomato
        ("Tomato", "Cotton"), # User selected Tomato, uploaded Cotton
        ("Potato", "Paddy"),  # User selected Potato, uploaded Paddy
    ]
    for sel_crop, uploaded_crop in mismatch_pairs:
        img_bytes = generate_synthetic_crop_bytes(uploaded_crop)
        res = verify_produce_image(img_bytes, sel_crop)
        total += 1
        if not res["is_match"] and res["detected_crop"] == uploaded_crop:
            print(f"[PASS] Mismatch Test Passed: Selected {sel_crop}, uploaded {uploaded_crop} -> {res['message']}")
            passed += 1
        else:
            print(f"[FAIL] Mismatch Test Failed: Selected {sel_crop}, uploaded {uploaded_crop} -> {res['message']}")

    # 3. Test Base64 decoding
    b64_str = base64.b64encode(generate_synthetic_crop_bytes("Tomato")).decode('utf-8')
    data_url = f"data:image/jpeg;base64,{b64_str}"
    decoded = decode_image_payload(data_url)
    res_b64 = verify_produce_image(decoded, "Tomato")
    total += 1
    if res_b64["is_match"]:
        print(f"[PASS] Base64 Data URL decoding passed: {res_b64['message']}")
        passed += 1
    else:
        print(f"[FAIL] Base64 Data URL decoding failed: {res_b64['message']}")


    print(f"\nResults: {passed}/{total} tests passed.")
    if passed == total:
        print("ALL BACKEND IMAGE VERIFICATION TESTS PASSED SUCCESSFULLY!")
    else:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
