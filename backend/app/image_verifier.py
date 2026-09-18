import io
import base64
import cv2
import numpy as np
from PIL import Image

def decode_image_payload(image_data: str) -> bytes:
    """Decodes a base64 string (including data URL format) into raw bytes."""
    if not image_data:
        raise ValueError("No image data provided")
    if "," in image_data:
        image_data = image_data.split(",", 1)[1]
    return base64.b64decode(image_data)

def analyze_produce_image_bytes(image_bytes: bytes) -> dict:
    try:
        pil_img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    except Exception as e:
        return {"error": f"Invalid image format: {str(e)}"}
    
    np_img = np.array(pil_img)
    if np_img is None or np_img.size == 0:
        return {"error": "Could not read image pixel data"}

    # Resize to 200x200 for fast processing
    np_img = cv2.resize(np_img, (200, 200))
    hsv_img = cv2.cvtColor(np_img, cv2.COLOR_RGB2HSV)
    gray_img = cv2.cvtColor(np_img, cv2.COLOR_RGB2GRAY)
    
    total_pixels = 200 * 200
    h, s, v = hsv_img[:, :, 0], hsv_img[:, :, 1], hsv_img[:, :, 2]

    # 1. White / Cotton features (High brightness, low saturation)
    white_mask = (s < 50) & (v > 180)
    white_ratio = float(np.sum(white_mask) / total_pixels)

    # 2. Red / Tomato features (Red hue: 0-15 or 160-180, S > 50)
    red_mask = ((h <= 15) | (h >= 160)) & (s > 50) & (v > 50)
    red_ratio = float(np.sum(red_mask) / total_pixels)

    # 3. Purple / Magenta / Papery Brown Onion features
    purple_mask = (h >= 135) & (h <= 162) & (s > 40)
    purple_ratio = float(np.sum(purple_mask) / total_pixels)
    bronze_mask = (h >= 8) & (h <= 25) & (s >= 40) & (s <= 180) & (v >= 70) & (v <= 220)
    bronze_ratio = float(np.sum(bronze_mask) / total_pixels)
    onion_score = float(purple_ratio * 3.0 + bronze_ratio * 1.5)

    # 4. Tan / Yellow-Brown Potato features
    potato_mask = (h >= 12) & (h <= 35) & (s >= 20) & (s <= 130) & (v >= 60) & (v <= 220)
    potato_ratio = float(np.sum(potato_mask) / total_pixels)

    # 5. Golden / Straw / Paddy grain features
    paddy_mask = (h >= 18) & (h <= 45) & (s >= 35) & (s <= 200) & (v >= 80)
    paddy_ratio = float(np.sum(paddy_mask) / total_pixels)
    
    laplacian_var = float(cv2.Laplacian(gray_img, cv2.CV_64F).var())

    scores = {
        "Cotton": float(white_ratio * 3.5),
        "Tomato": float(red_ratio * 3.0),
        "Onion": float(onion_score),
        "Potato": float(potato_ratio * 1.8 - (laplacian_var / 2000.0 if laplacian_var > 1500 else 0)),
        "Paddy": float(paddy_ratio * 2.2 + (laplacian_var / 1000.0))
    }

    top_crop = max(scores, key=scores.get)
    return {
        "detected_crop": top_crop,
        "scores": scores,
        "metrics": {
            "white_ratio": round(white_ratio, 3),
            "red_ratio": round(red_ratio, 3),
            "purple_ratio": round(purple_ratio, 3),
            "potato_ratio": round(potato_ratio, 3),
            "paddy_ratio": round(paddy_ratio, 3),
            "laplacian_var": round(laplacian_var, 1)
        }
    }

def verify_produce_image(image_bytes: bytes, selected_crop: str) -> dict:
    analysis = analyze_produce_image_bytes(image_bytes)
    if "error" in analysis:
        return {
            "is_match": False,
            "detected_crop": "Unknown",
            "message": f"✕ Please upload a valid {selected_crop} image.",
            "error_detail": analysis["error"]
        }
    
    detected = analysis["detected_crop"]
    
    # Extract base crop name from selected_crop e.g., "Tomato (Tamatar)" -> "tomato"
    sel_clean = selected_crop.lower()
    for word in ["tomato", "onion", "potato", "paddy", "cotton", "rice", "dhan", "aloo", "pyaz", "tamatar", "kapas"]:
        if word in sel_clean:
            if word in ["rice", "dhan"]:
                sel_clean = "paddy"
            elif word in ["aloo"]:
                sel_clean = "potato"
            elif word in ["pyaz"]:
                sel_clean = "onion"
            elif word in ["tamatar"]:
                sel_clean = "tomato"
            elif word in ["kapas"]:
                sel_clean = "cotton"
            else:
                sel_clean = word
            break

    det_clean = detected.lower()
    
    is_match = (sel_clean == det_clean) or (det_clean in selected_crop.lower()) or (selected_crop.lower() in det_clean)

    if is_match:
        return {
            "is_match": True,
            "detected_crop": detected,
            "message": f"✓ Image verified — {detected} detected"
        }
    else:
        return {
            "is_match": False,
            "detected_crop": detected,
            "message": f"✕ Please upload a valid {selected_crop} image."
        }
