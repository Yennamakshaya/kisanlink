import re
from typing import Optional, Dict, Tuple, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import MarketPrice, BuyerProfile, Produce, FarmerProfile
from app.schemas import AssistantQuerySchema

router = APIRouter(prefix="/api/assistant", tags=["Kisan Assistant"])

# ==============================================================================
# Trilingual Crop Mapping
# ==============================================================================
CROP_SYNONYMS: Dict[str, list] = {
    "Tomato": [
        "tomato", "tomatoes", "tamatar", "tamato", "tomat",
        "\u0c1f\u0c2e\u0c3e\u0c1f\u0c3e", "\u0c1f\u0c2e\u0c3e\u0c1f", "\u0c1f\u0c4a\u0c2e\u0c3e\u0c1f\u0c4b", "\u0c1f\u0c4a\u0c2e\u0c3e\u0c1f\u0c4b\u0c32\u0c41",
        "\u091f\u092e\u093e\u091f\u0930", "\u091f\u092e\u093e\u091f\u0930\u094b\u0902"
    ],
    "Cotton": [
        "cotton", "kapas", "patti",
        "\u0c2a\u0c24\u0c4d\u0c24\u0c3f", "\u0c26\u0c42\u0c26\u0c3f", "\u0c15\u0c2a\u0c3e\u0c38\u0c4d",
        "\u0915\u092a\u093e\u0938", "\u0930\u0942\u0908"
    ],
    "Paddy": [
        "paddy", "rice", "dhan", "chawal", "vari", "bhat", "dhaanya",
        "\u0c35\u0c30\u0c3f", "\u0c2c\u0c3f\u0c2f\u0c4d\u0c2f\u0c02", "\u0c35\u0c21\u0c4d\u0c32\u0c41", "\u0c27\u0c3e\u0c28\u0c4d\u0c2f\u0c02",
        "\u0927\u093e\u0928", "\u091a\u093e\u0935\u0932", "\u0927\u093e\u0928\u094d\u092f"
    ],
    "Chilli": [
        "chilli", "chili", "mirchi", "mirapa", "chillies",
        "\u0c2e\u0c3f\u0c30\u0c2a", "\u0c2e\u0c3f\u0c30\u0c4d\u0c1a\u0c3f", "\u0c0e\u0c30\u0c4d\u0c30 \u0c2e\u0c3f\u0c30\u0c2a", "\u0c2e\u0c3f\u0c30\u0c2a\u0c15\u0c3e\u0c2f",
        "\u092e\u093f\u0930\u094d\u091a", "\u092e\u093f\u0930\u094d\u091a\u0940", "\u0932\u093e\u0932 \u092e\u093f\u0930\u094d\u091a"
    ],
    "Maize": [
        "maize", "corn", "makka", "mokka jonna", "jonnalu",
        "\u0c2e\u0c4a\u0c15\u0c4d\u0c15\u0c1c\u0c4a\u0c28\u0c4d\u0c28", "\u0c1c\u0c4a\u0c28\u0c4d\u0c28\u0c32\u0c41", "\u0c2e\u0c4a\u0c15\u0c4d\u0c15 \u0c1c\u0c4a\u0c28\u0c4d\u0c28", "\u0c2e\u0c15\u0c4d\u0c15",
        "\u092e\u0915\u094d\u0915\u093e", "\u092e\u0915\u0908", "\u092d\u0941\u091f\u094d\u091f\u093e"
    ],
    "Turmeric": [
        "turmeric", "haldi", "pasupu",
        "\u0c2a\u0c38\u0c41\u0c2a\u0c41",
        "\u0939\u0932\u094d\u0926\u0940"
    ],
    "Onion": [
        "onion", "onions", "pyaz", "ullipaya", "ulli", "kanda",
        "\u0c09\u0c32\u0c4d\u0c32\u0c3f\u0c2a\u0c3e\u0c2f", "\u0c09\u0c32\u0c4d\u0c32\u0c3f\u0c17\u0c21\u0c4d\u0c21", "\u0c09\u0c32\u0c4d\u0c32\u0c3f",
        "\u092a\u094d\u092f\u093e\u091c", "\u0915\u093e\u0902\u0926\u093e"
    ],
    "Red Gram": [
        "red gram", "toor dal", "arhar", "kandulu", "pigeon pea", "tur dal",
        "\u0c15\u0c02\u0c26\u0c41\u0c32\u0c41", "\u0c15\u0c02\u0c26\u0c3f\u0c2a\u0c2a\u0c4d\u0c2a\u0c41",
        "\u0905\u0930\u0939\u0930", "\u0924\u0941\u0905\u0930", "\u0924\u0942\u0930 \u0926\u093e\u0932"
    ],
    "Groundnut": [
        "groundnut", "peanut", "moongfali", "verusenaga", "palleelu",
        "\u0c35\u0c47\u0c30\u0c41\u0c36\u0c28\u0c17", "\u0c2a\u0c32\u0c4d\u0c32\u0c40\u0c32\u0c41",
        "\u092e\u0942\u0902\u0917\u092b\u0932\u0940"
    ],
    "Soybean": [
        "soybean", "soya",
        "\u0c38\u0c4b\u0c2f\u0c3e\u0c2c\u0c40\u0c28\u0c4d", "\u0c38\u0c4b\u0c2f\u0c3e",
        "\u0938\u094b\u092f\u093e\u092c\u0940\u0928", "\u0938\u094b\u092f\u093e"
    ],
    "Potato": [
        "potato", "potatoes", "aloo", "bangaladumpa",
        "\u0c2c\u0c02\u0c17\u0c3e\u0c33\u0c3e\u0c26\u0c41\u0c02\u0c2a", "\u0c06\u0c32\u0c42",
        "\u0906\u0932\u0942"
    ]
}

CROP_NAMES_TRANSLATED = {
    "te": {
        "Tomato": "\u0c1f\u0c2e\u0c3e\u0c1f\u0c3e", "Cotton": "\u0c2a\u0c24\u0c4d\u0c24\u0c3f", "Paddy": "\u0c35\u0c30\u0c3f/\u0c27\u0c3e\u0c28\u0c4d\u0c2f\u0c02", "Chilli": "\u0c2e\u0c3f\u0c30\u0c2a",
        "Maize": "\u0c2e\u0c4a\u0c15\u0c4d\u0c15\u0c1c\u0c4a\u0c28\u0c4d\u0c28", "Turmeric": "\u0c2a\u0c38\u0c41\u0c2a\u0c41", "Onion": "\u0c09\u0c32\u0c4d\u0c32\u0c3f\u0c17\u0c21\u0c4d\u0c21", "Red Gram": "\u0c15\u0c02\u0c26\u0c41\u0c32\u0c41",
        "Groundnut": "\u0c35\u0c47\u0c30\u0c41\u0c36\u0c28\u0c17", "Soybean": "\u0c38\u0c4b\u0c2f\u0c3e\u0c2c\u0c40\u0c28\u0c4d", "Potato": "\u0c2c\u0c02\u0c17\u0c3e\u0c33\u0c3e\u0c26\u0c41\u0c02\u0c2a"
    },
    "hi": {
        "Tomato": "\u091f\u092e\u093e\u091f\u0930", "Cotton": "\u0915\u092a\u093e\u0938", "Paddy": "\u0927\u093e\u0928 (\u091a\u093e\u0935\u0932)", "Chilli": "\u092e\u093f\u0930\u094d\u091a",
        "Maize": "\u092e\u0915\u094d\u0915\u093e", "Turmeric": "\u0939\u0932\u094d\u0926\u0940", "Onion": "\u092a\u094d\u092f\u093e\u091c", "Red Gram": "\u0905\u0930\u0939\u0930 (\u0924\u0941\u0905\u0930)",
        "Groundnut": "\u092e\u0942\u0902\u0917\u092b\u0932\u0940", "Soybean": "\u0938\u094b\u092f\u093e\u092c\u0940\u0928", "Potato": "\u0906\u0932\u0942"
    },
    "en": {
        "Tomato": "Tomato", "Cotton": "Cotton", "Paddy": "Paddy", "Chilli": "Chilli",
        "Maize": "Maize", "Turmeric": "Turmeric", "Onion": "Onion", "Red Gram": "Red Gram",
        "Groundnut": "Groundnut", "Soybean": "Soybean", "Potato": "Potato"
    }
}

def detect_language(query: str, requested_lang: Optional[str] = "en") -> str:
    """
    Detect user query language. Prioritizes explicit script detection, then session requested language.
    """
    if re.search(r'[\u0c00-\u0c7f]', query):
        return "te"
    if re.search(r'[\u0900-\u097f]', query):
        return "hi"

    q_lower = query.lower()

    te_indicators = [
        "enti", "ela", "chudali", "dharalu", "dhara", "panta", "ammukovali", 
        "dabbulu", "chelimpu", "cheyyali", "kavali", "undi", "unnayi", "cheyandi",
        "evvariki", "ammali", "raledu", "tegulu", "purugu"
    ]
    if any(re.search(rf"\b{w}\b", q_lower) for w in te_indicators):
        return "te"

    hi_indicators = [
        "kya", "kaise", "bhav", "fasal", "kitna", "paise", "khareedar", 
        "kisan", "chahiye", "kare", "karna", "mandi", "hoga", "bataye", "batao",
        "kise", "bheje", "bechna", "beche", "nahi", "aaya", "mila"
    ]
    if any(re.search(rf"\b{w}\b", q_lower) for w in hi_indicators):
        return "hi"

    req = (requested_lang or "en").lower()
    if req in ["te", "hi"]:
        return req
    return "en"

def match_crop(query: str) -> Optional[str]:
    q_lower = query.lower()
    for standard_crop, synonyms in CROP_SYNONYMS.items():
        for syn in synonyms:
            if re.search(rf"(^|[^\w]){re.escape(syn)}([^\w]|$)", q_lower, re.UNICODE):
                return standard_crop
    return None

def extract_quantity(query: str) -> Optional[Tuple[float, str]]:
    m = re.search(r'(\d+(?:\.\d+)?)\s*(kg|kgs|kilo|kilos|quintal|quintals|ton|tons|tonnes|\u0c15\u0c3f\u0c32\u0c4b|\u0c15\u0c4d\u0c35\u0c3f\u0c02\u0c1f\u0c3e|\u0c1f\u0c28\u0c4d\u0c28\u0c41|\u0915\u093f\u0917\u094d\u0930\u093e|\u0915\u093f\u0932\u094b|\u0915\u094d\u0935\u093f\u0902\u091f\u0932|\u091f\u0928)?', query, re.IGNORECASE)
    if m:
        try:
            val = float(m.group(1))
            unit = m.group(2) or "kg"
            return val, unit.lower()
        except:
            return None
    return None

def get_market_price_response(crop: str, lang: str, db: Session) -> Tuple[str, str]:
    prices = db.query(MarketPrice).filter(MarketPrice.crop_name.ilike(f"%{crop}%")).all()
    
    if prices:
        p = next((x for x in prices if "Bowenpally" in (x.market.name if x.market else "")), prices[0])
        mkt_name = p.market.name if p.market else "Bowenpally APMC Mandi"
        min_p = p.min_price
        max_p = p.max_price
        mod_p = p.modal_price
        vol = p.arrival_volume_tonnes or 120.0
    else:
        defaults = {
            "Tomato": (25.0, 31.0, 28.0),
            "Cotton": (65.0, 75.0, 70.0),
            "Paddy": (21.0, 25.0, 23.5),
            "Chilli": (180.0, 210.0, 190.0),
            "Maize": (18.5, 22.0, 20.5),
            "Turmeric": (130.0, 155.0, 140.0),
            "Onion": (18.0, 26.0, 22.0),
            "Red Gram": (60.0, 72.0, 66.0),
            "Groundnut": (55.0, 68.0, 62.0),
            "Soybean": (42.0, 48.0, 45.0),
            "Potato": (16.0, 24.0, 20.0),
        }
        min_p, max_p, mod_p = defaults.get(crop, (20.0, 30.0, 25.0))
        mkt_name = "APMC Mandi Network"
        vol = 145.0

    c_name = CROP_NAMES_TRANSLATED.get(lang, {}).get(crop, crop)

    if lang == "te":
        ans = (
            f"ఈ రోజు {mkt_name} మార్కెట్‌లో {c_name} ధర వివరాలు:\n"
            f"• మోడల్ (సగటు) ధర: ₹{mod_p:0.2f}/కిలో (₹{int(mod_p*100)}/క్వింటాల్)\n"
            f"• కనీస ధర: ₹{min_p:0.2f}/కిలో | గరిష్ట ధర: ₹{max_p:0.2f}/కిలో\n"
            f"• రోజువారీ రాక: సుమారు {vol} టన్నులు.\n\n"
            f"చిట్కా: మీరు 'Sell Smart Engine' ద్వారా ధృవీకరించబడిన బల్క్ కొనుగోలుదారులకు నేరుగా విక్రయించి రవాణా ఖర్చులు లేకుండా అధిక నికర ఆదాయం పొందవచ్చు."
        )
    elif lang == "hi":
        ans = (
            f"आज {mkt_name} मंडी में {c_name} के ताजा भाव:\n"
            f"• मॉडल (औसत) भाव: ₹{mod_p:0.2f}/किग्रा (₹{int(mod_p*100)}/क्विंटल)\n"
            f"• न्यूनतम भाव: ₹{min_p:0.2f}/किग्रा | उच्चतम भाव: ₹{max_p:0.2f}/किग्रा\n"
            f"• दैनिक आवक: लगभग {vol} टन।\n\n"
            f"सुझाव: आप 'Sell Smart Engine' का उपयोग करके सत्यापित खरीदारों को सीधे बेच सकते हैं और बिना परिवहन कटौती के बेहतर शुद्ध लाभ पा सकते हैं।"
        )
    else:
        ans = (
            f"Today's {crop} market rates at {mkt_name}:\n"
            f"• Modal (Average) Price: ₹{mod_p:0.2f}/kg (₹{int(mod_p*100)}/Quintal)\n"
            f"• Price Range: ₹{min_p:0.2f}/kg to ₹{max_p:0.2f}/kg\n"
            f"• Daily Arrival: Approx. {vol} Tonnes.\n\n"
            f"Tip: Sell directly to verified bulk buyers via KisanLink's 'Sell Smart Engine' to save on APMC transport/commission deductions."
        )

    return ans, "market_price"

def get_agronomy_response(crop: Optional[str], lang: str) -> Tuple[str, str]:
    if not crop:
        crop = "Tomato"

    c_name = CROP_NAMES_TRANSLATED.get(lang, {}).get(crop, crop)

    if crop == "Cotton":
        if lang == "te":
            ans = (
                "పత్తి పంట సాగు & గులాబీ రంగు పురుగు (Pink Bollworm) నివారణ:\n"
                "• పర్యవేక్షణ: ఎకరానికి 4-5 లింగాకర్షక బుట్టలు (Pheromone Traps) అమర్చండి.\n"
                "• నివారణ: ప్రారంభ దశలో వేప నూనె (1500 ppm) లేదా ప్రొఫెనోఫాస్ 50% EC పిచికారీ చేయండి.\n"
                "• ఎరువులు: ఎకరానికి 60:30:30 కిలోల NPK సిఫార్సు చేయబడింది. యూరియాను 3 దఫాలుగా వేయండి."
            )
        elif lang == "hi":
            ans = (
                "कपास की फसल में गुलाबी सुंडी (Pink Bollworm) नियंत्रण एवं पोषण:\n"
                "• निगरानी: प्रति एकड़ 4-5 फेरोमोन ट्रैप लगाएं।\n"
                "• नियंत्रण: शुरुआती अवस्था में 1500 ppm नीम का तेल या प्रोफेनोफॉस 50% EC का छिड़काव करें।\n"
                "• उर्वरक: प्रति एकड़ 60:30:30 किग्रा NPK की सिफारिश की जाती है। यूरिया को 3 भागों में दें।"
            )
        else:
            ans = (
                "Cotton Crop Care & Pink Bollworm Management:\n"
                "• Monitoring: Install 4-5 pheromone traps per acre for early pest detection.\n"
                "• Control: Spray 1500 ppm Neem Oil or Profenofos 50% EC during early square formation.\n"
                "• Nutrition: Recommended NPK ratio is 60:30:30 kg/acre with split nitrogen application."
            )
    elif crop == "Paddy":
        if lang == "te":
            ans = (
                "వరి పంట సంరక్షణ & కాండం తొలిచే పురుగు నివారణ:\n"
                "• కాండం తొలిచే పురుగు: కార్టాప్ హైడ్రోక్లోరైడ్ 4G గుళికలు లేదా క్లోరాంట్రానిలిప్రోల్ 18.5% SC పిచికారీ చేయండి.\n"
                "• జింక్ లోపం: ఎకరానికి 10 కిలోల జింక్ సల్ఫేట్ వేయండి.\n"
                "• సమతుల్య ఎరువులు: ఎకరానికి NPK 40:20:20 కిలోలు అందించండి."
            )
        elif lang == "hi":
            ans = (
                "धान (चावल) में तना छेदक (Stem Borer) नियंत्रण एवं उर्वरक:\n"
                "• कीट नियंत्रण: कार्टाप हाइड्रोक्लोराइड 4G दानेदार या क्लोरेंट्रानिलीप्रोल 18.5% SC का छिड़काव करें।\n"
                "• जिंक की कमी: खैरा रोग से बचाव के लिए 10 किग्रा जिंक सल्फेट प्रति एकड़ डालें।\n"
                "• उर्वरक: NPK 40:20:20 किग्रा प्रति एकड़ संतुलित मात्रा में दें।"
            )
        else:
            ans = (
                "Paddy (Rice) Crop Protection & Stem Borer Control:\n"
                "• Stem Borer Control: Apply Cartap Hydrochloride 4G granules or spray Chlorantraniliprole 18.5% SC.\n"
                "• Zinc Deficiency: Apply 10 kg Zinc Sulphate per acre to prevent Khaira disease.\n"
                "• Fertilizers: Balanced NPK dosage of 40:20:20 kg/acre."
            )
    elif crop == "Chilli":
        if lang == "te":
            ans = (
                "మిరప పంటలో నల్లి & తామర పురుగుల (Thrips/Leaf Curl) నివారణ:\n"
                "• ఆకు ముడత నివారణ: ఫిప్రోనిల్ (Fipronil 5% SC) లేదా స్పైరోమెసిఫెన్ లేదా వేప నూనె పిచికారీ చేయండి.\n"
                "• నీటి పారుదల: నీరు నిలవకుండా డ్రిప్ ఇరిగేషన్ వాడండి.\n"
                "• పోషణ: పూత దశలో కాల్షియం నైట్రేట్ పిచికారీ చేయండి."
            )
        elif lang == "hi":
            ans = (
                "मिर्च में थ्रिप्स एवं पत्ती मरोड़ (Leaf Curl) रोग का समाधान:\n"
                "• कीट रोकथाम: फ़िप्रोनिल 5% SC या स्पाइरोमेसिफेन या 10,000 ppm नीम अर्क का छिड़काव करें।\n"
                "• सिंचाई: ड्रिप सिंचाई का प्रयोग करें और खेत में पानी जमा न होने दें।\n"
                "• पोषण: फूल आने के समय कैल्शियम नाइट्रेट का छिड़काव करें।"
            )
        else:
            ans = (
                "Chilli Pest Management & Leaf Curl Advisory:\n"
                "• Thrips/Mites Control: Spray Fipronil 5% SC or Spiromesifen 22.9% SC or 10,000 ppm Neem extract.\n"
                "• Irrigation: Use drip irrigation; avoid waterlogging in the root zone.\n"
                "• Nutrition: Spray Calcium Nitrate during peak flowering for fruit quality."
            )
    elif crop == "Tomato":
        if lang == "te":
            ans = (
                "టమాటా పంటలో తెగుళ్ళు & పురుగుల నివారణ సూచనలు:\n"
                "• ఆకుమచ్చ మరియు మాడ తెగులు (Blight): మాంకోజెబ్ (Mancozeb 75% WP) లేదా కాపర్ ఆక్సిక్లోరైడ్ పిచికారీ చేయండి.\n"
                "• కాయతొలుచు పురుగు (Fruit Borer): ఎమామెక్టిన్ బెంజోయేట్ (Emamectin Benzoate 5% SG) పిచికారీ చేయండి.\n"
                "• కర్రల మద్దతు (Staking): కర్రలతో పందిరి కడితే కాయలు నేలకు తగలకుండా నాణ్యమైన ఏ-గ్రేడ్ పంట వస్తుంది."
            )
        elif lang == "hi":
            ans = (
                "टमाटर में कीट एवं झुलसा रोग (Blight) का निवारण:\n"
                "• झुलसा रोग (Blight): मैंकोजेब (Mancozeb 75% WP) या कॉपर ऑक्सीक्लोराइड का छिड़काव करें।\n"
                "• फल छेदक (Fruit Borer): इमामेक्टिन बेंजोएट (Emamectin Benzoate 5% SG) का छिड़काव करें।\n"
                "• सहारा (Staking): पौधों को बांस या तार का सहारा देने से फल जमीन से दूर रहते हैं और ए-ग्रेड गुणवत्ता मिलती है।"
            )
        else:
            ans = (
                "Tomato Pest & Disease Advisory:\n"
                "• Early & Late Blight: Spray Mancozeb 75% WP (2.5 g/L) or Copper Oxychloride 50% WP preventively.\n"
                "• Fruit Borer: Spray Emamectin Benzoate 5% SG (0.5 g/L) during fruit set.\n"
                "• Staking: Support plants using bamboo poles/trellis to avoid fruit rotting and harvest Grade A produce."
            )
    else:
        if lang == "te":
            ans = (
                f"{c_name} పంట సంరక్షణ మార్గదర్శకాలు:\n"
                f"• సేంద్రియ ఎరువులు మరియు ట్రైకోడెర్మతో విత్తన శుద్ధి చేయండి.\n"
                f"• సిఫార్సు చేసిన NPK మోతాదును సమతుల్యంగా వేయండి.\n"
                f"• తెగుళ్ళు లేదా ఆకులపై మచ్చలు కనిపిస్తే లక్షణాలను తెలపండి, నిర్దిష్ట మందులను సూచిస్తాను."
            )
        elif lang == "hi":
            ans = (
                f"{c_name} फसल प्रबंधन सलाह:\n"
                f"• प्रमाणित बीजों का उपयोग और ट्राइकोडर्मा से बीज शोधन करें।\n"
                f"• संतुलित मात्रा में जैविक खाद और NPK का प्रयोग करें।\n"
                f"• यदि पत्तियों पर धब्बे या कीट दिखाई दें तो लक्षण बताएं, मैं तुरंत सटीक समाधान प्रदान करूँगा।"
            )
        else:
            ans = (
                f"{crop} Crop Care Advisory:\n"
                f"• Use certified seeds treated with bio-fungicides (Trichoderma).\n"
                f"• Maintain balanced NPK fertilizers and split application of urea.\n"
                f"• Inspect fields regularly for sucking pests or fungal leaf spots."
            )

    return ans, "crop_agronomy"

def get_buyer_recommendation_response(crop: Optional[str], lang: str, db: Session) -> Tuple[str, str]:
    query = db.query(BuyerProfile).filter(BuyerProfile.verification_status == "verified")
    
    if crop:
        matched = [b for b in query.all() if crop.lower() in (b.procurement_categories or "").lower()]
        buyer = matched[0] if matched else query.first()
    else:
        buyer = query.first()

    b_name = buyer.company_name if buyer else "Balaji Trades"
    b_city = buyer.city if buyer else "Hyderabad"
    b_score = buyer.reliability_score if buyer else 94.0
    c_name = CROP_NAMES_TRANSLATED.get(lang, {}).get(crop, crop) if crop else "produce"

    if lang == "te":
        ans = (
            f"కిసాన్ లింక్‌లో {c_name} కొనుగోలుకు ఉత్తమ సిఫార్సు చేయబడిన కొనుగోలుదారు:\n"
            f"• కొనుగోలుదారు: '{b_name}' ({b_city})\n"
            f"• విశ్వసనీయత స్కోర్: {b_score}% (ధృవీకరించబడిన బల్క్ కొనుగోలుదారు)\n"
            f"• ఎలా అమ్మాలి: 'Buyers List' పేజీకి వెళ్లి '{b_name}' కి నేరుగా మీ పంట పరిమాణం మరియు ఆశించే ధరతో రిక్వెస్ట్ పంపండి.\n"
            f"• చెల్లింపు: పూర్తి చెల్లింపు UPI ద్వారా నేరుగా మీ ఖాతాలో జమ అవుతుంది."
        )
    elif lang == "hi":
        ans = (
            f"किसान लिंक पर {c_name} के लिए शीर्ष अनुशंसित खरीदार:\n"
            f"• खरीदार: '{b_name}' ({b_city})\n"
            f"• विश्वसनीयता स्कोर: {b_score}% (सत्यापित थोक खरीदार)\n"
            f"• कैसे बेचें: 'Buyers List' पेज पर जाएं और '{b_name}' को सीधे अपनी मात्रा और अपेक्षित मूल्य के साथ अनुरोध (Request) भेजें।\n"
            f"• भुगतान: संपूर्ण भुगतान सीधे आपके खाते में UPI द्वारा सुरक्षित रूप से होता है।"
        )
    else:
        crop_label = f"for {crop}" if crop else ""
        ans = (
            f"Top recommended verified buyer on KisanLink {crop_label}:\n"
            f"• Company: '{b_name}' located at {b_city}\n"
            f"• Reliability Score: {b_score}% (Fully Verified)\n"
            f"• How to proceed: Open 'Buyers List', select '{b_name}', and click 'SEND REQUEST' with your lot quantity and expected price.\n"
            f"• Payment: Guaranteed settlement via UPI directly to your registered UPI ID."
        )

    return ans, "buyer_recommendation"

def get_buyer_search_response(crop: Optional[str], qty: Optional[float], unit: str, lang: str, db: Session) -> Tuple[str, str]:
    c_name = CROP_NAMES_TRANSLATED.get(lang, {}).get(crop, crop) if crop else "produce"
    qty_str = f"{int(qty)} {unit}" if qty else "your volume"
    
    verified_buyers = db.query(BuyerProfile).filter(BuyerProfile.verification_status == "verified").all()
    b_name = verified_buyers[0].company_name if verified_buyers else "Telangana Mega Food Park"

    if lang == "te":
        ans = (
            f"{qty_str} {c_name} కొనుగోలుకు కిసాన్ లింక్‌లో ధృవీకరించబడిన కొనుగోలుదారులు అందుబాటులో ఉన్నారు:\n"
            f"• ప్రముఖ కొనుగోలుదారు: '{b_name}' బల్క్ సేకరణకు సిద్ధంగా ఉన్నారు.\n"
            f"• తదుపరి చర్య: 'Buyers List' పేజీలో 'Send Request' క్లిక్ చేసి మీ {c_name} నాణ్యత (Grade A) మరియు ఆశించే ధరను నమోదు చేయండి.\n"
            f"• కొనుగోలుదారు ఆఫర్‌ను అంగీకరించి 1-7 రోజుల గడువులోగా UPI ద్వారా చెల్లింపును పూర్తి చేస్తారు."
        )
    elif lang == "hi":
        ans = (
            f"{qty_str} {c_name} की खरीद के लिए किसान लिंक पर सत्यापित खरीदार उपलब्ध हैं:\n"
            f"• प्रमुख खरीदार: '{b_name}' थोक खरीद के लिए तैयार हैं।\n"
            f"• अगला कदम: 'Buyers List' में जाकर 'Send Request' पर क्लिक करें और अपनी फसल की ग्रेड एवं मूल्य दर्ज करें।\n"
            f"• खरीदार के साथ बातचीत के बाद UPI द्वारा 1 से 7 दिनों में सुरक्षित भुगतान प्राप्त करें।"
        )
    else:
        ans = (
            f"Verified bulk buyers are actively procuring {qty_str} of {c_name} on KisanLink:\n"
            f"• Active Procurer: '{b_name}' accepts bulk delivery lots.\n"
            f"• Next Step: Navigate to 'Buyers List', click 'Send Request' for '{b_name}', specify your quantity ({qty_str}) and expected price.\n"
            f"• Negotiation & Settlement: Negotiate price and payment days (Within 1-7 Days) with direct UPI settlement."
        )

    return ans, "buyer_search"

def get_selling_guidance_response(crop: Optional[str], lang: str) -> Tuple[str, str]:
    c_name = CROP_NAMES_TRANSLATED.get(lang, {}).get(crop, crop) if crop else "produce"

    if lang == "te":
        ans = (
            f"కిసాన్ లింక్‌లో మీ {c_name} విక్రయించే విధానం:\n"
            f"1. 'My Produce' -> 'Add Produce' లో మీ {c_name} పరిమాణం (kg), ఆశించే ధర, గ్రేడ్ (Grade A) నమోదు చేయండి. మీ పంటకు ప్రత్యేక Lot Code వస్తుంది.\n"
            f"2. 'Buyers List' లో మీ పంటను కొనుగోలు చేసే ధృవీకరించబడిన కొనుగోలుదారులను ఎంచుకుని 'Send Request' పంపండి.\n"
            f"3. కొనుగోలుదారుతో ధర మరియు చెల్లింపు గడువు (1-7 రోజులు) డిజిటల్‌గా చర్చించి ఒప్పందం (Agreement) కుదుర్చుకోండి.\n"
            f"4. సరుకు బదిలీ పూర్తయిన తర్వాత UPI ద్వారా పూర్తి చెల్లింపు నేరుగా మీ ఖాతాలో జమ అవుతుంది."
        )
    elif lang == "hi":
        ans = (
            f"किसान लिंक पर {c_name} बेचने की सरल प्रक्रिया:\n"
            f"1. 'My Produce' -> 'Add Produce' में जाकर {c_name} की मात्रा, अपेक्षित भाव और ग्रेड दर्ज करें। आपकी फसल को एक Lot Code मिलेगा।\n"
            f"2. 'Buyers List' में सक्रिय खरीदारों को देखकर 'Send Request' भेजें।\n"
            f"3. मूल्य एवं भुगतान अवधि (1 से 7 दिन) पर बातचीत करें और डिजिटल एग्रीमेंट स्वीकार करें।\n"
            f"4. फसल हैंडओवर के बाद बिना किसी बिचौलिए के UPI द्वारा सीधा भुगतान प्राप्त करें।"
        )
    else:
        ans = (
            f"How to Sell your {c_name} on KisanLink:\n"
            f"1. Open 'My Produce' -> 'Add Produce' to register your {c_name} lot with quantity, quality grade (Grade A), and expected price to receive a Lot Code.\n"
            f"2. Go to 'Buyers List' to browse verified bulk buyers and send a procurement request.\n"
            f"3. Digitally negotiate price and payment terms (Within 1-7 Days) under 'Offers & Negotiations'.\n"
            f"4. Sign the agreement, book a pickup slot, and receive 100% payout via UPI directly to your bank account."
        )

    return ans, "selling_guidance"

def get_payment_query_response(lang: str) -> Tuple[str, str]:
    if lang == "te":
        ans = (
            "చెల్లింపు రాలేదా? కిసాన్ లింక్ చెల్లింపు & భద్రతా మార్గదర్శకాలు:\n"
            "• UPI ద్వారా చెల్లింపు: అన్ని లావాదేవీలు కేవలం 'UPI Only' ద్వారా నేరుగా రైతు ఖాతాకే జమ చేయబడతాయి.\n"
            "• ఆటోమేటిక్ ఆలస్య రుసుము (Delay Penalty): ఒప్పంద గడువు దాటితే, కొనుగోలుదారు రోజుకు ₹250 లేదా 0.5% అదనపు ఆలస్య రుసుమును రైతుకు చెల్లించాల్సి ఉంటుంది.\n"
            "• తనిఖీ విధానం: 'Transactions' పేజీకి వెళ్లి మీ లావాదేవీ స్థితి ('Produce Picked Up', 'RELEASED', లేదా 'VERIFIED') తనిఖీ చేయండి.\n"
            "• ఫిర్యాదు నమోదు: చెల్లింపు ఆలస్యమైతే 'Grievance Center' ద్వారా అడ్మిన్‌కు తక్షణ ఫిర్యాదు పంపవచ్చు."
        )
    elif lang == "hi":
        ans = (
            "भुगतान प्राप्त नहीं हुआ? किसान लिंक भुगतान सुरक्षा नियम:\n"
            "• केवल UPI भुगतान: सभी भुगतान बिचौलियों के बिना सीधे किसान के बैंक खाते में UPI द्वारा किए जाते हैं।\n"
            "• स्वचालित विलंब जुर्माना (Delay Penalty): यदि खरीदार तय समय से अधिक देरी करता है, तो उसे प्रतिदिन ₹250 या 0.5% अतिरिक्त विलंब जुर्माना किसान को देना होगा।\n"
            "• स्थिति जांच: 'Transactions' पेज पर जाकर अपने लेनदेन की स्थिति (Status) देखें।\n"
            "• शिकायत दर्ज करें: भुगतान में अत्यधिक देरी होने पर 'Grievance Center' से तुरंत एडमिन को शिकायत भेजें।"
        )
    else:
        ans = (
            "Payment Not Received? KisanLink UPI Settlement Guidelines:\n"
            "• UPI Exclusively: All payments are transferred directly via UPI to your registered UPI ID.\n"
            "• Automatic Delay Compensation: If a buyer delays payment past the agreed terms, an automatic penalty (₹250/day or 0.5%/day, whichever is greater) is added to your payout.\n"
            "• Check Status: Navigate to 'Transactions' to verify your settlement state ('Produce Picked Up', 'RELEASED', or 'VERIFIED').\n"
            "• Grievance Redressal: If payment is overdue, submit an urgent ticket under 'Grievance Center' for administrative intervention."
        )

    return ans, "payment_query"

def get_my_produce_response(lang: str, db: Session) -> Tuple[str, str]:
    produces = db.query(Produce).filter(Produce.status != "Deactivated").order_by(Produce.id.desc()).limit(3).all()
    
    if produces:
        lines = []
        for p in produces:
            lines.append(f"• {p.lot_code or f'LOT-{p.id}'}: {p.crop_name} — {int(p.quantity)} kg @ ₹{p.expected_price}/kg ({p.quality or 'Grade A'})")
        listing_summary = "\n".join(lines)
    else:
        listing_summary = "• LOT-00101: Tomato — 5000 kg @ ₹30.00/kg (Grade A)\n• LOT-00102: Cotton — 3000 kg @ ₹72.00/kg (Grade A)"

    if lang == "te":
        ans = (
            f"మీ నమోదిత పంటల జాబితా (My Produce):\n"
            f"{listing_summary}\n\n"
            f"మరిన్ని వివరాలను చూడటానికి లేదా కొత్త పంటను జోడించడానికి సైడ్‌బార్‌లోని 'My Produce' పేజీకి వెళ్ళండి."
        )
    elif lang == "hi":
        ans = (
            f"आपकी पंजीकृत फसलों की सूची (My Produce):\n"
            f"{listing_summary}\n\n"
            f"पूर्ण विवरण देखने या नई फसल जोड़ने के लिए साइडबार में 'My Produce' पेज पर जाएं।"
        )
    else:
        ans = (
            f"Your active produce listings on KisanLink:\n"
            f"{listing_summary}\n\n"
            f"To view full lot details or list a new harvest, navigate to 'My Produce' from the sidebar."
        )

    return ans, "my_produce"

def get_negotiation_response(lang: str) -> Tuple[str, str]:
    if lang == "te":
        ans = (
            "కొనుగోలుదారుతో చర్చలు (Negotiation) జరిపే విధానం:\n"
            "1. 'Offers & Negotiations' పేజీకి వెళ్ళండి. అక్కడ కొనుగోలుదారు ప్రతిపాదన కనిపిస్తుంది.\n"
            "2. 'Counter Offer' ద్వారా మీ ఆశించే ధర (₹/kg) మరియు కావలసిన చెల్లింపు గడువు (1, 2, 3, 5 లేదా 7 రోజులు) ఎంచుకోండి.\n"
            "3. కొనుగోలుదారు మీ నిబంధనలను అంగీకరించిన వెంటనే 'Payment as per Negotiation' తో డిజిటల్ అగ్రిమెంట్ రూపొందించబడుతుంది.\n"
            "4. ఇరువురు సంతకం చేసిన తర్వాత సరుకు సేకరణ స్లాట్ బుక్ చేసుకోవచ్చు."
        )
    elif lang == "hi":
        ans = (
            "खरीदार के साथ बातचीत (Negotiation) कैसे करें:\n"
            "1. 'Offers & Negotiations' पेज पर जाएं जहाँ खरीदार का प्रस्ताव दिखेगा।\n"
            "2. 'Counter Offer' पर क्लिक करके अपना मनपसंद मूल्य (₹/किग्रा) और भुगतान अवधि (1, 2, 3, 5 या 7 दिन) चुनें।\n"
            "3. दोनों पक्षों की सहमति के बाद 'Payment as per Negotiation' के साथ डिजिटल एग्रीमेंट तैयार होता है।\n"
            "4. दोनों के डिजिटल हस्ताक्षर के बाद स्लॉट बुकिंग अनलॉक होती है।"
        )
    else:
        ans = (
            "How to Negotiate with Buyers on KisanLink:\n"
            "1. Open 'Offers & Negotiations' from the sidebar to view active offers.\n"
            "2. Submit a 'Counter Offer' specifying your desired price (₹/kg) and payment days (Within 1, 2, 3, 5, or 7 Days via UPI).\n"
            "3. Once terms are accepted, a legally binding digital agreement is generated as 'Payment as per Negotiation'.\n"
            "4. After both sides sign, procurement slots unlock for scheduled pickup."
        )

    return ans, "negotiation_query"

def get_market_recommendation_response(lang: str) -> Tuple[str, str]:
    if lang == "te":
        ans = (
            "పంటను ఎక్కడ అమ్మాలి? (APMC మండి vs డైరెక్ట్ కొనుగోలుదారు):\n"
            "• కిసాన్ లింక్ డైరెక్ట్ బయ్యర్ (సిఫార్సు చేయబడింది): రవాణా తగ్గింపు శూన్యం (Zero Transport Deduction), కమీషన్ ఖర్చులు లేవు. మీ పంటకు అత్యధిక నికర ఆదాయం (Net Realisation) లభిస్తుంది.\n"
            "• APMC మండి: రవాణా ఖర్చులు, హమాలీ మరియు కమిషన్ కట్ అయిన తర్వాత రైతు చేతికి తక్కువ మొత్తం వస్తుంది.\n"
            "• సలహా: కిసాన్ లింక్ 'Sell Smart Engine' లో నెట్ ఆదాయాన్ని పోల్చి చూసి ధృవీకరించబడిన బల్క్ కొనుగోలుదారులకు అమ్మడం శ్రేయస్కరం."
        )
    elif lang == "hi":
        ans = (
            "फसल कहाँ बेचनी चाहिए? (मंडी बनाम सीधा खरीदार):\n"
            "• किसान लिंक सीधा खरीदार (अनुशंसित): शून्य परिवहन कटौती (Zero Transport Deduction), कोई बिचौलिया या आढ़त कमीशन नहीं। किसान को अधिकतम शुद्ध आय (Net Realisation) मिलती है।\n"
            "• APMC मंडी: ढुलाई खर्च, हम्माली और कमीशन कटने के बाद किसान को कम शुद्ध राशि मिलती है।\n"
            "• सलाह: 'Sell Smart Engine' का उपयोग करके शुद्ध आय की तुलना करें और सत्यापित खरीदारों को बेचें।"
        )
    else:
        ans = (
            "Where Should You Sell? (APMC Mandi vs Direct Bulk Buyer):\n"
            "• Direct Bulk Buyer via KisanLink (Recommended): Zero transport deductions (handled directly) and zero middleman commission, delivering highest Net Realisation per kg.\n"
            "• APMC Mandi: Requires paying transportation, mandi cess, and commission charges.\n"
            "• Recommendation: Use the 'Sell Smart Engine' on KisanLink to compare net payouts and sell to verified procurers."
        )

    return ans, "market_recommendation"

# ==============================================================================
# Main Kisan Assistant Query Endpoint
# ==============================================================================
@router.post("/query")
def kisan_assistant_query(payload: AssistantQuerySchema, db: Session = Depends(get_db)):
    raw_query = payload.query.strip()
    q = raw_query.lower()
    lang = detect_language(raw_query, payload.language)

    detected_crop = match_crop(raw_query)
    qty_info = extract_quantity(raw_query)

    # --------------------------------------------------------------------------
    # 0. Ambiguous / Short Query Clarification: User enters just a crop name
    # e.g. "tomato", "cotton", "వరి", "టమాటా", "टमाटर"
    # --------------------------------------------------------------------------
    is_bare_crop = False
    if detected_crop:
        clean_words = [re.sub(r'^[^\w\u0c00-\u0c7f\u0900-\u097f]+|[^\w\u0c00-\u0c7f\u0900-\u097f]+$', '', w) for w in q.split()]
        clean_words = [w for w in clean_words if w]
        crop_synonyms = CROP_SYNONYMS.get(detected_crop, [])
        non_crop_words = [w for w in clean_words if not any(w == s.lower() for s in crop_synonyms)]
        
        action_keywords = [
            "price", "rate", "cost", "mandi", "bhav", "dhara", "bhaav", "kitna", "entha", "today",
            "buyer", "buyers", "sell", "ammali", "bechna", "pest", "disease", "purugu", "tegulu", "keet",
            "500", "100", "kg", "quintal", "ton", "find", "search", "show"
        ]
        if len(non_crop_words) <= 1 and not any(re.search(rf"(^|[^\w]){re.escape(k)}([^\w]|$)", q, re.UNICODE) for k in action_keywords):
            is_bare_crop = True

    if is_bare_crop and detected_crop:
        c_name = CROP_NAMES_TRANSLATED.get(lang, {}).get(detected_crop, detected_crop)
        if lang == "te":
            ans = f"మీరు {c_name} నేటి మార్కెట్ ధర, కొనుగోలుదారుల వివరాలు లేదా విక్రయ సలహా గురించి తెలుసుకోవాలనుకుంటున్నారా? దయచేసి వివరంగా తెలపండి."
        elif lang == "hi":
            ans = f"क्या आप {c_name} का आज का मंडी भाव, {c_name} के खरीदार, या बेचने की सलाह जानना चाहते हैं? कृपया स्पष्ट रूप से बताएं।"
        else:
            ans = f"Are you asking for today's {detected_crop} price, buyers for {detected_crop}, or selling advice?"
        return {"answer": ans, "intent": "clarification_needed", "label": "Kisan Assistant"}

    # --------------------------------------------------------------------------
    # 1. Market Price / Mandi Rates
    # e.g. "tomato price", "what is today's tomato price?", "tomato rate", "how much is tomato today?"
    # --------------------------------------------------------------------------
    price_triggers = [
        "price", "rate", "cost", "mandi", "market", "modal", "how much", "today's", "today",
        "dhara", "dharalu", "entha", "rate entha", "bhav", "bhaav", "kitna", "daam", "dam",
        "\u0c27\u0c30", "\u0c30\u0c47\u0c1f\u0c41", "\u0c2e\u0c3e\u0c30\u0c4d\u0c15\u0c46\u0c1f\u0c4d", "\u0c27\u0c30\u0c32\u0c41", "\u0c0e\u0c02\u0c24", "\u0c2e\u0c02\u0c21\u0c3f",
        "\u092d\u093e\u0935", "\u0926\u0930", "\u092e\u0902\u0921\u0940", "\u092c\u093e\u091c\u093e\u0930", "\u0915\u093f\u0924\u0928\u093e", "\u0926\u093e\u092e", "\u0930\u0947\u091f"
    ]
    is_price_inquiry = (any(re.search(rf"\b{re.escape(w)}\b", q) for w in price_triggers) or \
                        any(w in q for w in ["\u0c27\u0c30", "\u0c30\u0c47\u0c1f\u0c41", "\u092d\u093e\u0935", "\u0930\u0947\u091f", "kitna", "entha", "how much"])) and \
                       not any(w in q for w in ["\u092e\u094b\u0932\u092d\u093e\u0935", "negotiat", "bargain", "\u0c1a\u0c30\u0c4d\u0c1a", "\u0c2c\u0c47\u0c30\u0c02"])

    is_payment_issue = any(w in q for w in [
        "not received", "raledu", "nahi mila", "delayed", "delay", "penalty", "payment",
        "\u0c1a\u0c46\u0c32\u0c4d\u0c32\u0c3f\u0c02\u0c2a\u0c41", "\u0c06\u0c32\u0c38\u0c4d\u0c2f\u0c02", "\u0c2a\u0c46\u0c28\u0c3e\u0c32\u0c4d\u0c1f\u0c40", "\u0c30\u0c3e\u0c32\u0c47\u0c26\u0c41", "\u0c21\u0c2c\u0c4d\u0c2c\u0c41\u0c32\u0c41",
        "\u092d\u0941\u0917\u0924\u093e\u0928", "\u0926\u0947\u0930\u0940", "\u091c\u0941\u0930\u094d\u092e\u093e\u0928\u093e", "\u092a\u0948\u0938\u0947"
    ])

    if is_price_inquiry and not is_payment_issue:
        if detected_crop:
            ans, intent = get_market_price_response(detected_crop, lang, db)
            return {"answer": ans, "intent": intent, "label": "APMC Mandi Intelligence"}
        else:
            if lang == "te":
                ans = "మీరు ఏ పంట మార్కెట్ ధర తెలుసుకోవాలనుకుంటున్నారు? (ఉదాహరణ: టమాటా, వరి, పత్తి, మిరప, మొక్కజొన్న, ఉల్లిగడ్డ)"
            elif lang == "hi":
                ans = "आप किस फसल का मंडी भाव जानना चाहते हैं? (जैसे: टमाटर, धान, कपास, मिर्च, मक्का, प्याज)"
            else:
                ans = "Which crop's market price would you like to check? (e.g. Tomato, Cotton, Paddy, Chilli, Maize, Onion)"
            return {"answer": ans, "intent": "market_price", "label": "APMC Mandi Intelligence"}

    # --------------------------------------------------------------------------
    # 2. Buyer Search with Quantity / Crop
    # e.g. "find buyer for 500kg tomato", "search buyer for cotton"
    # --------------------------------------------------------------------------
    # --------------------------------------------------------------------------
    # 2. Buyer Search with Quantity / Crop
    # e.g. "find buyer for 500kg tomato", "search buyer for cotton"
    # --------------------------------------------------------------------------
    search_triggers = [
        "find buyer", "search buyer", "looking for buyer", "buyer for", "buyers for", "need buyer",
        "\u0c15\u0c4a\u0c28\u0c41\u0c17\u0c4b\u0c32\u0c41\u0c26\u0c3e\u0c30\u0c41\u0c28\u0c3f \u0c35\u0c46\u0c24\u0c15\u0c02\u0c21\u0c3f", "\u0c15\u0c4a\u0c28\u0c41\u0c17\u0c4b\u0c32\u0c41\u0c26\u0c3e\u0c30\u0c41 \u0c15\u0c3e\u0c35\u0c3e\u0c32\u0c3f", "\u0c15\u0c4a\u0c28\u0c41\u0c17\u0c4b\u0c32\u0c41\u0c26\u0c3e\u0c30\u0c41\u0c32\u0c28\u0c41 \u0c35\u0c46\u0c24\u0c15\u0c02\u0c21\u0c3f",
        "\u0916\u0930\u0940\u0926\u093e\u0930 \u0916\u094b\u091c\u0947\u0902", "\u0916\u0930\u0940\u0926\u093e\u0930 \u091a\u093e\u0939\u093f\u090f", "\u0916\u0930\u0940\u0926\u093e\u0930 \u0922\u0942\u0902\u0922\u0947\u0902", "\u0915\u0947 \u0932\u093f\u090f \u0916\u0930\u0940\u0926\u093e\u0930"
    ]
    if any(w in q for w in search_triggers) or (qty_info and any(w in q for w in ["buyer", "buyers", "\u0c15\u0c4a\u0c28\u0c41\u0c17\u0c4b\u0c32\u0c41\u0c26\u0c3e\u0c30\u0c41", "\u0c15\u0c4a\u0c28\u0c41\u0c17\u0c4b\u0c32\u0c41\u0c26\u0c3e\u0c30\u0c41\u0c32\u0c41", "\u0916\u0930\u0940\u0926\u093e\u0930"])):
        qty_val = qty_info[0] if qty_info else None
        qty_unit = qty_info[1] if qty_info else "kg"
        ans, intent = get_buyer_search_response(detected_crop or "Tomato", qty_val, qty_unit, lang, db)
        return {"answer": ans, "intent": intent, "label": "Buyer Search & Procurement"}

    # --------------------------------------------------------------------------
    # 3. Buyer Recommendation
    # e.g. "which buyer should I sell my tomato to?", "best buyer for tomato"
    # --------------------------------------------------------------------------
    buyer_rec_triggers = [
        "which buyer", "who buys", "best buyer", "recommend buyer", "whom to sell", "whom should i sell",
        "\u0c0e\u0c35\u0c30\u0c3f\u0c15\u0c3f \u0c05\u0c2e\u0c4d\u0c2e\u0c3e\u0c32\u0c3f", "\u0c0f \u0c15\u0c4a\u0c28\u0c41\u0c17\u0c4b\u0c32\u0c41\u0c26\u0c3e\u0c30\u0c41", "\u0c0f \u0c15\u0c4a\u0c28\u0c41\u0c17\u0c4b\u0c32\u0c41\u0c26\u0c3e\u0c30\u0c41\u0c28\u0c3f\u0c15\u0c3f", "\u0c09\u0c24\u0c4d\u0c24\u0c2e \u0c15\u0c4a\u0c28\u0c41\u0c17\u0c4b\u0c32\u0c41\u0c26\u0c3e\u0c30\u0c41", "\u0c2e\u0c02\u0c1a\u0c3f \u0c15\u0c4a\u0c28\u0c41\u0c17\u0c4b\u0c32\u0c41\u0c26\u0c3e\u0c30\u0c41", "\u0c0e\u0c35\u0c30\u0c41 \u0c15\u0c4a\u0c02\u0c1f\u0c3e\u0c30\u0c41",
        "\u0915\u093f\u0938 \u0916\u0930\u0940\u0926\u093e\u0930", "\u0915\u093f\u0938 \u0916\u0930\u0940\u0926\u093e\u0930 \u0915\u094b", "\u0915\u093f\u0938\u0947 \u092c\u0947\u091a\u0928\u093e \u091a\u093e\u0939\u093f\u090f", "\u0915\u093f\u0938\u0947 \u092c\u0947\u091a\u0947\u0902", "\u0938\u092c\u0938\u0947 \u0905\u091a\u094d\u091b\u093e \u0916\u0930\u0940\u0926\u093e\u0930", "\u0915\u094c\u0928 \u0916\u0930\u0940\u0926\u0947\u0917\u093e"
    ]
    is_buyer_word = any(w in q for w in ["buyer", "buyers", "\u0c15\u0c4a\u0c28\u0c41\u0c17\u0c4b\u0c32\u0c41\u0c26\u0c3e\u0c30\u0c41", "\u0c15\u0c4a\u0c28\u0c41\u0c17\u0c4b\u0c32\u0c41\u0c26\u0c3e\u0c30\u0c41\u0c32\u0c41", "\u0c16\u0c30\u0c40\u0c26\u0c3e\u0c30\u0c4d", "\u0916\u0930\u0940\u0926\u093e\u0930"])
    is_sell_word = any(w in q for w in ["sell", "selling", "ammali", "\u0c05\u0c2e\u0c4d\u0c2e\u0c3e\u0c32\u0c3f", "\u0c05\u0c2e\u0c4d\u0c2e\u0c15\u0c02", "\u0c35\u0c3f\u0c15\u0c4d\u0c30\u0c2f", "\u0c35\u0c3f\u0c15\u0c4d\u0c30\u0c2f\u0c3f\u0c02\u0c1a\u0c3e\u0c32\u0c3f", "bechna", "\u092c\u0947\u091a\u0928\u093e", "\u092c\u0947\u091a\u0947\u0902", "\u092c\u0947\u091a\u0928\u0947"])
    if any(w in q for w in buyer_rec_triggers) or (detected_crop and is_buyer_word and is_sell_word):
        ans, intent = get_buyer_recommendation_response(detected_crop, lang, db)
        return {"answer": ans, "intent": intent, "label": "Verified Buyer Intelligence"}

    # --------------------------------------------------------------------------
    # 4. Market Recommendation / Where Should I Sell?
    # e.g. "where should I sell?", "where should I sell my tomato?", "apmc vs buyer"
    # --------------------------------------------------------------------------
    where_to_sell_triggers = [
        "where should i sell", "where to sell", "where do i get more profit", "apmc vs buyer",
        "best market to sell", "net realisation", "maximize profit", "where can i sell",
        "\u0c0e\u0c15\u0c4d\u0c15\u0c21 \u0c05\u0c2e\u0c4d\u0c2e\u0c3e\u0c32\u0c3f", "\u0c0e\u0c15\u0c4d\u0c15\u0c21 \u0c05\u0c2e\u0c4d\u0c2e\u0c3f\u0c24\u0c47 \u0c0e\u0c15\u0c4d\u0c15\u0c41\u0c35 \u0c32\u0c3e\u0c2d\u0c02", "\u0c0e\u0c15\u0c4d\u0c15\u0c21 \u0c05\u0c2e\u0c4d\u0c2e\u0c3f\u0c24\u0c47 \u0c2e\u0c02\u0c1a\u0c3f\u0c26\u0c3f", "\u0c0e\u0c15\u0c4d\u0c15\u0c21 \u0c05\u0c2e\u0c4d\u0c2e\u0c3f\u0c24\u0c47",
        "\u0915\u0939\u093e\u0901 \u092c\u0947\u091a\u0928\u093e \u091a\u093e\u0939\u093f\u090f", "\u0915\u0939\u093e\u0901 \u092c\u0947\u091a\u0947\u0902", "\u091c\u094d\u092f\u093e\u0926\u093e \u092e\u0941\u0928\u093e\u092b\u093e \u0915\u0939\u093e\u0901 \u092e\u093f\u0932\u0947\u0917\u093e", "\u092e\u0902\u0921\u0940 \u092f\u093e \u0916\u0930\u0940\u0926\u093e\u0930", "\u0915\u0939\u093e\u0901 \u092c\u0947\u091a\u0928\u093e"
    ]
    if any(w in q for w in where_to_sell_triggers):
        ans, intent = get_market_recommendation_response(lang)
        return {"answer": ans, "intent": intent, "label": "Market & Net Realisation"}

    # --------------------------------------------------------------------------
    # 5. Selling Guidance
    # e.g. "I want to sell my tomato", "how to sell my crop"
    # --------------------------------------------------------------------------
    sell_triggers = [
        "want to sell", "how to sell", "sell my", "sell crop", "sell produce", "i have to sell",
        "\u0c05\u0c2e\u0c4d\u0c2e\u0c3e\u0c32\u0c28\u0c41\u0c15\u0c41\u0c02\u0c1f\u0c41\u0c28\u0c4d\u0c28\u0c3e\u0c28\u0c41", "\u0c2a\u0c02\u0c1f \u0c0e\u0c32\u0c3e \u0c05\u0c2e\u0c4d\u0c2e\u0c3e\u0c32\u0c3f", "\u0c05\u0c2e\u0c4d\u0c2e\u0c21\u0c02 \u0c0e\u0c32\u0c3e", "\u0c05\u0c2e\u0c4d\u0c2e\u0c3e\u0c32\u0c3f",
        "\u092c\u0947\u091a\u0928\u093e \u091a\u093e\u0939\u0924\u093e \u0939\u0942\u0901", "\u092b\u0938\u0932 \u0915\u0948\u0938\u0947 \u092c\u0947\u091a\u0947\u0902", "\u092c\u0947\u091a\u0928\u093e \u0939\u0948", "\u0915\u0948\u0938\u0947 \u092c\u0947\u091a\u0942\u0902"
    ]
    if any(w in q for w in sell_triggers):
        ans, intent = get_selling_guidance_response(detected_crop, lang)
        return {"answer": ans, "intent": intent, "label": "Selling & Produce Guidance"}

    # --------------------------------------------------------------------------
    # 5. Crop Agronomy, Pest, Disease, Fertilizer
    # e.g. "how to control pests in tomato?", "pink bollworm in cotton"
    # --------------------------------------------------------------------------
    agronomy_triggers = [
        "pest", "pests", "disease", "diseases", "fertilizer", "urea", "spray", "soil", "sowing",
        "worm", "blight", "curl", "fungus", "npk", "weed", "irrigation",
        "\u0c2a\u0c41\u0c30\u0c41\u0c17\u0c41", "\u0c24\u0c46\u0c17\u0c41\u0c32\u0c41", "\u0c24\u0c46\u0c17\u0c41\u0c33\u0c4d\u0c33\u0c41", "\u0c0e\u0c30\u0c41\u0c35\u0c41", "\u0c35\u0c3f\u0c24\u0c4d\u0c24\u0c28\u0c02", "\u0c06\u0c15\u0c41 \u0c2e\u0c41\u0c21\u0c24", "\u0c2e\u0c02\u0c26\u0c41", "\u0c38\u0c3e\u0c17\u0c41", "\u0c15\u0c40\u0c1f\u0c15\u0c02",
        "\u0915\u0940\u091f", "\u0930\u094b\u0917", "\u0909\u0930\u094d\u0935\u0930\u0915", "\u0916\u093e\u0926", "\u0938\u094d\u092a\u094d\u0930\u0947", "\u092a\u0924\u094d\u0924\u093e \u092e\u0930\u094b\u0921\u093c", "\u0938\u0941\u0902\u0921\u0940", "\u091d\u0941\u0932\u0938\u093e", "\u0926\u0935\u093e"
    ]
    if any(w in q for w in agronomy_triggers) or (detected_crop and ("control" in q or "\u0c28\u0c3f\u0c35\u0c3e\u0c30\u0c23" in q or "\u0930\u094b\u0915\u0925\u093e\u092e" in q or "\u0907\u0932\u093e\u091c" in q)):
        ans, intent = get_agronomy_response(detected_crop, lang)
        return {"answer": ans, "intent": intent, "label": "Crop Agronomy Advisory"}

    # --------------------------------------------------------------------------
    # 6. Payment Query & Delay Penalty
    # e.g. "payment not received", "money not credited", "buyer has not paid"
    # --------------------------------------------------------------------------
    payment_triggers = [
        "payment not received", "money not received", "payment delayed", "buyer not paid",
        "payment issue", "delay penalty", "when will i get payment", "upi payment", "payment not", "payment delay",
        "\u0c21\u0c2c\u0c4d\u0c2c\u0c41\u0c32\u0c41 \u0c30\u0c3e\u0c32\u0c47\u0c26\u0c41", "\u0c1a\u0c46\u0c32\u0c4d\u0c32\u0c3f\u0c02\u0c2a\u0c41 \u0c06\u0c32\u0c38\u0c4d\u0c2f\u0c02", "\u0c1a\u0c46\u0c32\u0c4d\u0c32\u0c3f\u0c02\u0c2a\u0c41 \u0c30\u0c3e\u0c32\u0c47\u0c26\u0c41", "\u0c21\u0c2c\u0c4d\u0c2c\u0c41\u0c32\u0c41 \u0c30\u0c3e\u0c32\u0c47", "\u0c1a\u0c46\u0c32\u0c4d\u0c32\u0c3f\u0c02\u0c2a\u0c41 \u0c05\u0c02\u0c26\u0c32\u0c47\u0c26\u0c41",
        "\u092d\u0941\u0917\u0924\u093e\u0928 \u0928\u0939\u0940\u0902 \u092e\u093f\u0932\u093e", "\u092a\u0948\u0938\u0947 \u0928\u0939\u0940\u0902 \u0906\u090f", "\u092d\u0941\u0917\u0924\u093e\u0928 \u092e\u0947\u0902 \u0926\u0947\u0930\u0940", "\u092a\u0948\u0938\u0947 \u0915\u092c \u092e\u093f\u0932\u0947\u0902\u0917\u0947", "\u092d\u0941\u0917\u0924\u093e\u0928 \u0928\u0939\u0940\u0902"
    ]
    is_payment_query = (
        any(w in q for w in payment_triggers) or         ("payment" in q and any(w in q for w in ["not", "delay", "issue", "due", "pending", "penalty"])) or         ("\u0c1a\u0c46\u0c32\u0c4d\u0c32\u0c3f\u0c02\u0c2a\u0c41" in q and any(w in q for w in ["\u0c30\u0c3e\u0c32\u0c47\u0c26\u0c41", "\u0c05\u0c02\u0c26\u0c32\u0c47\u0c26\u0c41", "\u0c06\u0c32\u0c38\u0c4d\u0c2f\u0c02", "\u0c2a\u0c46\u0c28\u0c3e\u0c32\u0c4d\u0c1f\u0c40", "\u0c0e\u0c2a\u0c4d\u0c2a\u0c41\u0c21\u0c41", "\u0c30\u0c3e\u0c32\u0c47"])) or         ("\u092d\u0941\u0917\u0924\u093e\u0928" in q and any(w in q for w in ["\u0928\u0939\u0940\u0902", "\u0926\u0947\u0930\u0940", "\u092e\u093f\u0932\u093e", "\u0938\u092e\u0938\u094d\u092f\u093e", "\u0915\u092c", "\u091c\u0941\u0930\u094d\u092e\u093e\u0928\u093e"]))
    ) and not any(w in q for w in ["agreement", "contract", "\u0c05\u0c17\u0c4d\u0c30\u0c3f\u0c2e\u0c46\u0c02\u0c1f\u0c4d", "\u0c12\u0c2a\u0c4d\u0c2a\u0c02\u0c26\u0c02", "\u090f\u0917\u094d\u0930\u0940\u092e\u0947\u0902\u091f", "\u0905\u0928\u0941\u092c\u0902\u0927"])
    if is_payment_query:
        ans, intent = get_payment_query_response(lang)
        return {"answer": ans, "intent": intent, "label": "UPI & Payment Settlement"}

    # --------------------------------------------------------------------------
    # 7. My Produce
    # e.g. "show my produce", "my crops", "view my produce"
    # --------------------------------------------------------------------------
    my_produce_triggers = [
        "show my produce", "my produce", "my crops", "view my produce", "what crops do i have",
        "show produce", "my listings", "my lots",
        "\u0c28\u0c3e \u0c2a\u0c02\u0c1f \u0c35\u0c3f\u0c35\u0c30\u0c3e\u0c32\u0c41", "\u0c28\u0c3e \u0c09\u0c24\u0c4d\u0c2a\u0c24\u0c4d\u0c24\u0c41\u0c32\u0c41", "\u0c28\u0c3e \u0c2a\u0c02\u0c1f\u0c32\u0c41", "\u0c28\u0c3e \u0c09\u0c24\u0c4d\u0c2a\u0c24\u0c4d\u0c24\u0c41\u0c32\u0c41 \u0c1a\u0c42\u0c2a\u0c3f\u0c02\u0c1a\u0c41", "\u0c28\u0c3e \u0c2a\u0c02\u0c1f \u0c1a\u0c42\u0c2a\u0c3f\u0c02\u0c1a\u0c41", "\u0c28\u0c3e \u0c2a\u0c02\u0c1f",
        "\u092e\u0947\u0930\u0940 \u092b\u0938\u0932 \u0926\u093f\u0916\u093e\u090f\u0902", "\u092e\u0947\u0930\u0940 \u092b\u0938\u0932\u0947\u0902", "\u092e\u0947\u0930\u093e \u0909\u0924\u094d\u092a\u093e\u0926", "\u092e\u0947\u0930\u0940 \u092b\u0938\u0932 \u0926\u093f\u0916\u093e\u0913", "\u092e\u0947\u0930\u0940 \u092b\u0938\u0932"
    ]
    if any(w in q for w in my_produce_triggers):
        ans, intent = get_my_produce_response(lang, db)
        return {"answer": ans, "intent": intent, "label": "My Produce Listings"}

    # --------------------------------------------------------------------------
    # 8. Negotiation Guidance
    # e.g. "how do I negotiate with buyer?", "how to bargain"
    # --------------------------------------------------------------------------
    negotiation_triggers = [
        "negotiate", "negotiation", "bargain", "counter offer", "counter-offer", "deal terms",
        "\u0c1a\u0c30\u0c4d\u0c1a\u0c32\u0c41", "\u0c1a\u0c30\u0c4d\u0c1a\u0c32\u0c41 \u0c0e\u0c32\u0c3e \u0c1a\u0c47\u0c2f\u0c3e\u0c32\u0c3f", "\u0c27\u0c30 \u0c1a\u0c30\u0c4d\u0c1a", "\u0c15\u0c4c\u0c02\u0c1f\u0c30\u0c4d \u0c06\u0c2b\u0c30\u0c4d", "\u0c2c\u0c47\u0c30\u0c02",
        "\u092c\u093e\u0924\u091a\u0940\u0924", "\u092e\u094b\u0932\u092d\u093e\u0935", "\u0938\u094c\u0926\u093e", "\u0915\u093e\u0909\u0902\u091f\u0930 \u0911\u092b\u0930"
    ]
    if any(w in q for w in negotiation_triggers):
        ans, intent = get_negotiation_response(lang)
        return {"answer": ans, "intent": intent, "label": "Negotiation & Deal Guidance"}



    # --------------------------------------------------------------------------
    # 10. General Agreements & Legal Guidelines
    # --------------------------------------------------------------------------
    if any(w in q for w in ["agreement", "contract", "sign agreement", "\u0c05\u0c17\u0c4d\u0c30\u0c3f\u0c2e\u0c46\u0c02\u0c1f\u0c4d", "\u0c12\u0c2a\u0c4d\u0c2a\u0c02\u0c26\u0c02", "\u0c38\u0c02\u0c24\u0c15\u0c02", "\u090f\u0917\u094d\u0930\u0940\u092e\u0947\u0902\u091f", "\u0905\u0928\u0941\u092c\u0902\u0927", "\u0939\u0938\u094d\u0924\u093e\u0915\u094d\u0937\u0930"]):
        if lang == "te":
            ans = (
                "కిసాన్ లింక్ డిజిటల్ అగ్రిమెంట్ మార్గదర్శకాలు:\n"
                "• చెల్లింపు నిబంధన: ఒప్పందంలో చెల్లింపు నిబంధన 'చర్చల ప్రకారం చెల్లింపు' (Payment as per Negotiation) గా నమోదు అవుతుంది.\n"
                "• చెల్లింపు విధానం: అన్ని చెల్లింపులు కేవలం 'UPI Only' ద్వారా మాత్రమే నిర్వహించబడతాయి.\n"
                "• ఉమ్మడి సంతకం: రైతు మరియు కొనుగోలుదారు ఇద్దరూ డిజిటల్ సంతకం చేసిన తర్వాతే ఒప్పందం పూర్తవుతుంది.\n"
                "• రక్షణ: ఒకవేళ కొనుగోలుదారు నిర్ణీత గడువులోగా చెల్లించకపోతే ఆలస్య రుసుము (Delay Penalty) రైతుకు లభిస్తుంది."
            )
        elif lang == "hi":
            ans = (
                "किसान लिंक डिजिटल एग्रीमेंट (अनुबंध) दिशानिर्देश:\n"
                "• भुगतान शर्त: एग्रीमेंट में भुगतान की शर्त 'बातचीत के अनुसार भुगतान' (Payment as per Negotiation) दर्ज होती है।\n"
                "• भुगतान माध्यम: सभी भुगतान केवल 'UPI Only' द्वारा सुरक्षित रूप से किए जाते हैं।\n"
                "• दोनों पक्षों के हस्ताक्षर: किसान और खरीदार दोनों के डिजिटल हस्ताक्षर होने के बाद ही एग्रीमेंट पूर्ण माना जाता है।\n"
                "• सुरक्षा: यदि खरीदार तय समय पर भुगतान नहीं करता है तो किसान को प्रतिदिन विलंब जुर्माना मिलता है।"
            )
        else:
            ans = (
                "KisanLink Digital Commercial Agreement Guidelines:\n"
                "• Payment Term: Agreements strictly feature 'Payment as per Negotiation' based on agreed days (1 to 7 Days).\n"
                "• Settlement Mode: All settlements are processed exclusively via 'UPI Only'.\n"
                "• Dual Signing: Both Farmer and Buyer must independently sign before procurement slots unlock.\n"
                "• Delay Penalty: Automatic compensation is credited to the farmer if payment exceeds agreed days."
            )
        return {"answer": ans, "intent": "agreement_guidelines", "label": "Contract & Legal Guidelines"}

    # --------------------------------------------------------------------------
    # 11. Handover, Collection Slots, and Unloading Labour Charges
    # --------------------------------------------------------------------------
    if any(w in q for w in ["handover", "slot", "labour", "unloading", "\u0c15\u0c42\u0c32\u0c40", "\u0c39\u0c4d\u0c2f\u0c3e\u0c02\u0c21\u0c4b\u0c35\u0c30\u0c4d", "\u0c38\u0c4d\u0c32\u0c3e\u0c1f\u0c4d", "\u092e\u091c\u0926\u0942\u0930\u0940", "\u0939\u0948\u0902\u0921\u0913\u0935\u0930", "\u0938\u094d\u0932\u0949\u091f"]):
        if lang == "te":
            ans = (
                "సరుకు బదిలీ, స్లాట్ & కూలీ ఛార్జీల వివరాలు:\n"
                "• స్లాట్ బుకింగ్: ఇరుపక్షాలు అగ్రిమెంట్ సంతకం చేసిన తర్వాత మరుసటి రోజు నుండి అందుబాటులో ఉండే భవిష్యత్ స్లాట్‌ను బుక్ చేసుకోండి.\n"
                "• సరుకు బదిలీ: సేకరణ కేంద్రంలో లేదా ఫామ్‌గేట్ వద్ద సరుకును బదిలీ చేసి స్థితిని నమోదు చేయండి.\n"
                "• కూలీ ఛార్జీలు: సరుకు బదిలీ తర్వాత వాస్తవ అన్‌లోడింగ్ కూలీని రైతు మరియు కొనుగోలుదారు చర్చించి ఖరారు చేస్తారు."
            )
        elif lang == "hi":
            ans = (
                "फसल हैंडओवर, स्लॉट एवं मजदूरी शुल्क विवरण:\n"
                "• स्लॉट बुकिंग: दोनों पक्षों द्वारा एग्रीमेंट साइन करने के बाद अगले दिन से शुरू होने वाले भविष्य के स्लॉट बुक करें।\n"
                "• फसल हैंडओवर: संग्रहण केंद्र या फार्म-गेट पर फसल सौंपने के बाद हैंडओवर पूरा करें।\n"
                "• मजदूरी/उतराई शुल्क: हैंडओवर के बाद वास्तविक उतराई मजदूरी किसान और खरीदार आपसी सहमति से तय करते हैं।"
            )
        else:
            ans = (
                "Produce Handover, Slot Booking & Labour Charges:\n"
                "• Slot Booking: Book valid future slots starting from one day after agreement completion.\n"
                "• Handover: Complete physical produce handover at the collection hub or farmgate.\n"
                "• Labour Charges: Post-handover unloading/labour charges are negotiated and confirmed before releasing UPI payment."
            )
        return {"answer": ans, "intent": "handover_logistics", "label": "Handover & Logistics"}

    # --------------------------------------------------------------------------
    # 12. General Fallback
    # --------------------------------------------------------------------------
    if lang == "te":
        ans = (
            "నమస్కారం! నేను మీ కిసాన్ అసిస్టెంట్. నేను మీకు ఈ క్రింది అంశాలలో సహాయం చేయగలను:\n\n"
            "1. మార్కెట్ ధరలు: 'టమాటా ధర ఎంత?', 'పత్తి మార్కెట్ రేటు'\n"
            "2. కొనుగోలుదారులు: 'టమాటా ఎవరికి అమ్మాలి?', '500 కిలోల టమాటా కొనుగోలుదారు'\n"
            "3. పంట అమ్మకం & నా పంటలు: 'నా టమాటా ఎలా అమ్మాలి?', 'నా పంట వివరాలు చూపించు'\n"
            "4. పంట సాగు & తెగుళ్ళు: 'టమాటాలో తెగుళ్ళ నివారణ', 'పత్తిలో గులాబీ పురుగు'\n"
            "5. చెల్లింపులు & చర్చలు: 'డబ్బులు రాలేదు', 'కొనుగోలుదారుతో ఎలా చర్చలు జరపాలి?'\n\n"
            "మీరు ఏ వివరాలు తెలుసుకోవాలనుకుంటున్నారో దయచేసి అడగండి!"
        )
    elif lang == "hi":
        ans = (
            "नमस्ते! मैं आपका किसान असिस्टेंट हूँ। मैं आपकी इन विषयों में सहायता कर सकता हूँ:\n\n"
            "1. मंडी भाव: 'टमाटर का भाव', 'कपास का रेट'\n"
            "2. खरीदार खोजें: 'टमाटर किसे बेचें?', '500 किग्रा टमाटर के लिए खरीदार'\n"
            "3. फसल बिक्री व मेरी फसलें: 'टमाटर कैसे बेचें?', 'मेरी फसल दिखाएं'\n"
            "4. कीट व रोग सलाह: 'टमाटर में कीट नियंत्रण', 'कपास में गुलाबी सुंडी'\n"
            "5. भुगतान व बातचीत: 'भुगतान नहीं मिला', 'खरीदार से बातचीत कैसे करें?'\n\n"
            "कृपया अपनी आवश्यकता अनुसार कोई भी प्रश्न पूछें!"
        )
    else:
        ans = (
            "Hello! I am your Kisan Assistant. I can help you with:\n\n"
            "1. Mandi Rates: 'tomato price', 'cotton market rate'\n"
            "2. Buyer Intelligence: 'which buyer should I sell tomato to?', 'find buyer for 500kg tomato'\n"
            "3. Selling & Inventory: 'I want to sell my tomato', 'show my produce'\n"
            "4. Agronomy & Pests: 'how to control pests in tomato?', 'pink bollworm in cotton'\n"
            "5. Payments & Negotiation: 'payment not received', 'how do I negotiate with buyer?'\n\n"
            "Please ask your question in your own words!"
        )

    return {"answer": ans, "intent": "general_knowledge", "label": "Kisan Assistant"}
