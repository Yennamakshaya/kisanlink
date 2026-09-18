import { translations } from './translations';

export interface PhraseMap {
  [englishText: string]: string;
}

export const PHRASE_TRANSLATIONS: Record<'te' | 'hi', PhraseMap> = {
  te: {
    // -------------------------------------------------------------------------
    // Navigation & Sidebar Groups
    // -------------------------------------------------------------------------
    "SELL": "విక్రయం",
    "DEAL": "ఒప్పందం",
    "DELIVERY": "సరఫరా",
    "SUPPORT": "సహాయం",
    "Support": "సహాయం",
    "Sell Smart Engine": "స్మార్ట్ విక్రయ ఇంజిన్",
    "Admin Messages": "అడ్మిన్ సందేశాలు",
    "Procurement & Demand": "సేకరణ & డిమాండ్",
    "Commercial Deals": "వాణిజ్య ఒప్పందాలు",
    "Fulfillment & Audit": "సరుకు సరఫరా & తనిఖీ",
    "Core Governance": "కేంద్ర పాలన",
    "Operations & Settlement": "కార్యకలాపాలు & చెల్లింపులు",
    "Compliance & Security": "భద్రత & నిబంధనలు",
    "Platform Overview": "ప్లాట్‌ఫామ్ అవలోకనం",
    "Farmer Management": "రైతుల నిర్వహణ",
    "Buyer Management": "కొనుగోలుదారుల నిర్వహణ",
    "Produce & Lots": "ఉత్పత్తులు & లాట్‌లు",
    "Procurement & Handover": "సేకరణ & సరుకు బదిలీ",
    "Transactions & Payments": "లావాదేవీలు & చెల్లింపులు",
    "Market Intelligence": "మార్కెట్ సమాచారం",
    "Grievance Center": "ఫిర్యాదుల విభాగం",
    "Notifications & Alerts": "నోటిఫికేషన్‌లు & హెచ్చరికలు",
    "System Audit Logs": "సిస్టమ్ ఆడిట్ లాగ్‌లు",
    "Access Platform →": "వేదికను ఉపయోగించండి →",
    "Access Platform": "వేదికను ఉపయోగించండి",

    // -------------------------------------------------------------------------
    // Common Nav Items & Portals
    // -------------------------------------------------------------------------
    "Dashboard": "డాష్‌బోర్డ్",
    "Farmer Portal": "రైతు పోర్టల్",
    "Buyer Portal": "కొనుగోలుదారు పోర్టల్",
    "Admin Command Center": "అడ్మిన్ కమాండ్ సెంటర్",
    "Admin Portal": "అడ్మిన్ పోర్టల్",
    "My Produce": "నా ఉత్పత్తులు",
    "Market Price": "మార్కెట్ ధర",
    "Market Prices": "మార్కెట్ ధరలు",
    "Buyers List": "కొనుగోలుదారుల జాబితా",
    "Offers & Negotiations": "ఆఫర్లు & చర్చలు",
    "Agreements": "ఒప్పందాలు",
    "Slot Booking": "స్లాట్ బుకింగ్",
    "Produce Handover": "సరుకు బదిలీ",
    "Handover": "సరుకు బదిలీ",
    "Transactions": "లావాదేవీలు",
    "Grievance": "ఫిర్యాదు",
    "Grievances": "ఫిర్యాదులు",
    "My Requirements": "నా అవసరాలు",
    "Add Requirement": "అవసరాన్ని జోడించండి",
    "Search Farmers": "రైతులను వెతకండి",
    "Search Buyers": "కొనుగోలుదారులను వెతకండి",
    "Incoming Requests": "వచ్చిన అభ్యర్థనలు",
    "Pickup Confirmation": "పికప్ నిర్ధారణ",
    "Quality Audit": "నాణ్యత తనిఖీ",
    "Produce Handover & Pickup Confirmation": "సరుకు బదిలీ & పికప్ నిర్ధారణ",
    "Home": "హోమ్",
    "Login": "లాగిన్",
    "Register": "రిజిస్టర్",
    "Logout": "లాగ్ అవుట్",
    "Select Role": "పాత్రను ఎంచుకోండి",
    "Farmer": "రైతు",
    "Buyer": "కొనుగోలుదారు",
    "Admin": "అడ్మిన్",
    "Language": "భాష",
    "English": "English",
    "తెలుగు": "తెలుగు",
    "हिन्दी": "हिन्दी",

    // -------------------------------------------------------------------------
    // Agreement Signing & Dual Signature Workflow
    // -------------------------------------------------------------------------
    "Waiting for Buyer to sign": "కొనుగోలుదారు సంతకం కోసం వేచి ఉంది",
    "Waiting for Farmer to sign": "రైతు సంతకం కోసం వేచి ఉంది",
    "Both Sides Signed": "ఇరుపక్షాలు సంతకం చేశాయి",
    "Farmer Signed": "రైతు సంతకం చేశారు",
    "Buyer Signed": "కొనుగోలుదారు సంతకం చేశారు",
    "Sign Agreement": "ఒప్పందంపై సంతకం చేయండి",
    "Sign Agreement (OTP Verification)": "ఒప్పందంపై సంతకం చేయండి (OTP ధృవీకరణ)",
    "Digital Commercial Agreement": "డిజిటల్ వాణిజ్య ఒప్పందం",
    "Procurement Contract": "సేకరణ ఒప్పందం",
    "Agreement Details": "ఒప్పందం వివరాలు",
    "Commercial Settlement Terms": "వాణిజ్య చెల్లింపు నిబంధనలు",
    "Contract Terms & Clauses": "ఒప్పంద నిబంధనలు & షరతులు",
    "Proceed to Procurement Slot Booking": "స్లాట్ బుకింగ్‌కు వెళ్ళండి",
    "Proceed to Slot Booking": "స్లాట్ బుకింగ్‌కు వెళ్ళండి",
    "Farmer Signature": "రైతు సంతకం",
    "Buyer Signature": "కొనుగోలుదారుని సంతకం",
    "Farmer (Seller)": "రైతు (విక్రేత)",
    "Buyer (Purchaser)": "కొనుగోలుదారు (ఖరీదారు)",
    "Farmer (Seller):": "రైతు (విక్రేత):",
    "Buyer (Purchaser):": "కొనుగోలుదారు (ఖరీదారు):",
    "Agreement ID:": "ఒప్పందం ID:",
    "Date & Time:": "తేదీ & సమయం:",
    "1. AGREEMENT DETAILS": "1. ఒప్పందం వివరాలు",
    "2. PARTIES": "2. పార్టీలు",
    "3. PRODUCE DETAILS": "3. పంట వివరాలు",
    "4. COMMERCIAL TERMS": "4. వాణిజ్య నిబంధనలు",
    "5. PAYMENT TERMS & UPI MANDATE": "5. చెల్లింపు నిబంధనలు & UPI విధానం",
    "6. MANDATORY STATUTORY COVENANTS": "6. చట్టబద్ధమైన నిబంధనలు",
    "Grade / Quality:": "గ్రేడ్ / నాణ్యత:",
    "Lot ID:": "లాట్ ID:",

    // -------------------------------------------------------------------------
    // Payment Terms, Days & UPI Only
    // -------------------------------------------------------------------------
    "Payment Term": "చెల్లింపు నిబంధన",
    "Payment Terms": "చెల్లింపు నిబంధనలు",
    "Agreed Payment Term": "అంగీకరించిన చెల్లింపు నిబంధన",
    "Payment as per Negotiation": "చర్చల ప్రకారం చెల్లింపు",
    "Payment as per Negotiation.": "చర్చల ప్రకారం చెల్లింపు.",
    "Settlement Mode": "చెల్లింపు విధానం",
    "UPI Only": "UPI ద్వారా మాత్రమే",
    "All payments must be made through UPI only.": "అన్ని చెల్లింపులు కేవలం UPI ద్వారా మాత్రమే చేయాలి.",
    "Release Payment": "చెల్లింపును విడుదల చేయండి",
    "Release Payment via UPI": "UPI ద్వారా చెల్లింపును విడుదల చేయండి",
    "Farmer Beneficiary UPI ID": "రైతు లబ్ధిదారుని UPI ID",
    "Farmer Beneficiary UPI": "రైతు లబ్ధిదారుని UPI",
    "Beneficiary UPI ID": "లబ్ధిదారుని UPI ID",
    "Delay Penalty Amount": "ఆలస్య రుసుము మొత్తం",
    "Delay Amount": "ఆలస్య రుసుము",
    "Delay Penalty": "ఆలస్య రుసుము",
    "Delay Penalty:": "ఆలస్య రుసుము:",
    "Days Delayed": "ఆలస్యమైన రోజులు",
    "Daily Delay Penalty Rate": "రోజువారీ ఆలస్య రుసుము రేటు",
    "Agreed Produce Amount": "అంగీకరించిన పంట మొత్తం",
    "Agreed Amount": "అంగీకరించిన మొత్తం",
    "Total Payable via UPI": "UPI ద్వారా చెల్లించాల్సిన మొత్తం",
    "Total Payable Amount": "చెల్లించాల్సిన మొత్తం",
    "Total Settled (UPI Only)": "మొత్తం చెల్లించబడింది (UPI)",
    "Total Amount": "మొత్తం సొమ్ము",
    "Total Value": "మొత్తం విలువ",
    "Total Value:": "మొత్తం విలువ:",
    "Gross Value": "మొత్తం పంట విలువ",
    "Net Realisation": "నికర ఆదాయం",
    "Net Realisation to Farmer": "రైతుకు నికర ఆదాయం",
    "Payment Status": "చెల్లింపు స్థితి",
    "Verify Payment Receipt": "చెల్లింపు రసీదును ధృవీకరించండి",
    "Verify Payment": "చెల్లింపును ధృవీకరించండి",
    "Payment Settled via UPI": "UPI ద్వారా చెల్లింపు పూర్తయింది",
    "Payment Released": "చెల్లింపు విడుదల చేయబడింది",
    "Payment Verified": "చెల్లింపు ధృవీకరించబడింది",
    "Payment Due Date": "చెల్లింపు గడువు తేదీ",
    "Payment Reference": "చెల్లింపు రిఫరెన్స్",
    "UPI Reference": "UPI రిఫరెన్స్",
    "Within 1 Day": "1 రోజులోపు",
    "Within 2 Days": "2 రోజుల్లోపు",
    "Within 3 Days": "3 రోజుల్లోపు",
    "Within 5 Days": "5 రోజుల్లోపు",
    "Within 7 Days": "7 రోజుల్లోపు",
    "Select payment days": "చెల్లింపు రోజుల గడువును ఎంచుకోండి",
    "Select Payment Days": "చెల్లింపు రోజుల గడువును ఎంచుకోండి",

    // -------------------------------------------------------------------------
    // Slot Booking & Logistics
    // -------------------------------------------------------------------------
    "Available Slots": "అందుబాటులో ఉన్న స్లాట్‌లు",
    "Select Procurement Slot": "సేకరణ స్లాట్‌ను ఎంచుకోండి",
    "Select Slot": "స్లాట్‌ను ఎంచుకోండి",
    "Book Slot": "స్లాట్ బుక్ చేయండి",
    "Book This Slot": "ఈ స్లాట్‌ను బుక్ చేయండి",
    "Confirm Slot": "స్లాట్‌ను నిర్ధారించండి",
    "Slot Booked Successfully": "స్లాట్ విజయవంతంగా బుక్ చేయబడింది",
    "Valid Future Slots (Starting Tomorrow)": "చెల్లుబాటు అయ్యే భవిష్యత్ స్లాట్‌లు (రేపటి నుండి)",
    "Valid future slots starting from tomorrow onwards": "రేపటి నుండి ప్రారంభమయ్యే చెల్లుబాటు అయ్యే భవిష్యత్ స్లాట్‌లు",
    "Time Window": "సమయ వ్యవధి",
    "Pickup Location": "పికప్ స్థానం",
    "Collection Yard": "సేకరణ కేంద్రం",
    "APMC Collection Yard": "APMC సేకరణ కేంద్రం",
    "Direct Farm Pickup": "తోట వద్ద నేరుగా పికప్",
    "Logistics Park Hub": "లాజిస్టిక్స్ పార్క్ హబ్",

    // -------------------------------------------------------------------------
    // Produce Handover & Quality Confirmation
    // -------------------------------------------------------------------------
    "Produce Handover Completed": "సరుకు బదిలీ పూర్తయింది",
    "Confirm Quality & Quantity": "నాణ్యత & పరిమాణాన్ని నిర్ధారించండి",
    "Quality & Quantity Confirmed": "నాణ్యత & పరిమాణం నిర్ధారించబడింది",
    "Produce Quality & Quantity Confirmed": "పంట నాణ్యత & పరిమాణం నిర్ధారించబడింది",
    "Quality Confirmed": "నాణ్యత నిర్ధారించబడింది",
    "Quantity Confirmed": "పరిమాణం నిర్ధారించబడింది",
    "Received Quantity": "స్వీకరించిన పరిమాణం",
    "Quality / Grade": "నాణ్యత / గ్రేడ్",
    "Agreed Price": "అంగీకరించిన ధర",
    "Total Transaction Value": "మొత్తం లావాదేవీ విలువ",
    "Verify Received Produce": "స్వీకరించిన సరుకును తనిఖీ చేయండి",
    "Confirm Received Produce Quality & Quantity": "స్వీకరించిన పంట నాణ్యత మరియు పరిమాణాన్ని నిర్ధారించండి",
    "Step 1: Produce Handover": "దశ 1: సరుకు బదిలీ",
    "Step 2: Quality & Quantity Audit": "దశ 2: నాణ్యత & పరిమాణ తనిఖీ",
    "Step 3: Commercial UPI Settlement": "దశ 3: వాణిజ్య UPI చెల్లింపు",
    "Handover Status": "హ్యాండోవర్ స్థితి",
    "Pickup Completed": "పికప్ పూర్తయింది",
    "Produce Handover Verified": "సరుకు బదిలీ ధృవీకరించబడింది",
    "Confirm Produce Handover": "సరుకు బదిలీని నిర్ధారించండి",
    "Confirm Handover": "హ్యాండోవర్‌ను నిర్ధారించండి",

    // -------------------------------------------------------------------------
    // Post-Handover Labour Negotiation
    // -------------------------------------------------------------------------
    "Post-Handover Labour / Unloading Charges Negotiation": "సరుకు బదిలీ తర్వాతి కూలీ / అన్‌లోడింగ్ ఛార్జీల చర్చలు",
    "Actual Labour Amount (₹)": "వాస్తవ కూలీ మొత్తం (₹)",
    "Labour Notes / Receipt Reference": "కూలీ వివరాలు / రసీదు రిఫరెన్స్",
    "Agree on Labour": "కూలీని ఖరారు చేయండి",
    "Labour Charges Agreed": "కూలీ ఛార్జీలు ఖరారయ్యాయి",
    "Labour Charges": "కూలీ ఛార్జీలు",
    "Labour Charges:": "కూలీ ఛార్జీలు:",
    "Actual Labour Charges": "వాస్తవ కూలీ ఛార్జీలు",
    "Labour Status": "కూలీ స్థితి",
    "Labour charges negotiated post-handover based on actual loading/unloading": "వాస్తవ లోడింగ్/అన్‌లోడింగ్ ఆధారంగా సరుకు బదిలీ తర్వాత కూలీ ఛార్జీలు నిర్ణయించబడతాయి",

    // -------------------------------------------------------------------------
    // Cold Storage & Transport
    // -------------------------------------------------------------------------
    "Cold Storage Required?": "కోల్డ్ స్టోరేజ్ అవసరమా?",
    "Cold Storage Required": "కోల్డ్ స్టోరేజ్ అవసరం",
    "Cold Storage Cost": "కోల్డ్ స్టోరేజ్ ఖర్చు",
    "Storage Duration": "నిల్వ కాలం",
    "Storage Cost": "నిల్వ ఖర్చు",
    "Transport Cost": "రవాణా ఖర్చు",
    "Transport Cost (₹0 Platform Deduction)": "రవాణా ఖర్చు (ప్లాట్‌ఫామ్ మినహాయింపు ₹0)",
    "Handled directly by Farmer (₹0 platform deduction)": "రైతు స్వయంగా నిర్వహిస్తారు (ప్లాట్‌ఫామ్ మినహాయింపు ₹0)",
    "Platform transport deduction = ₹0 (Handled directly by Farmer)": "ప్లాట్‌ఫామ్ రవాణా మినహాయింపు = ₹0 (రైతు స్వయంగా నిర్వహిస్తారు)",

    // -------------------------------------------------------------------------
    // Status Badges & Lifecycle
    // -------------------------------------------------------------------------
    "PENDING": "పెండింగ్‌లో ఉంది",
    "Pending": "పెండింగ్‌లో ఉంది",
    "RELEASED": "విడుదల చేయబడింది",
    "Released": "విడుదల చేయబడింది",
    "VERIFIED": "ధృవీకరించబడింది",
    "Verified": "ధృవీకరించబడింది",
    "COMPLETED": "పూర్తయింది",
    "Completed": "పూర్తయింది",
    "CONFIRMED": "నిర్ధారించబడింది",
    "Confirmed": "నిర్ధారించబడింది",
    "DRAFT": "చిత్తుప్రతి",
    "Draft": "చిత్తుప్రతి",
    "SIGNED": "సంతకం చేయబడింది",
    "Signed": "సంతకం చేయబడింది",
    "ACCEPTED": "అంగీకరించబడింది",
    "Accepted": "అంగీకరించబడింది",
    "REJECTED": "తిరస్కరించబడింది",
    "Rejected": "తిరస్కరించబడింది",
    "ACTIVE": "క్రియాశీలకం",
    "Active": "క్రియాశీలకం",
    "AGREED": "అంగీకరించబడింది",
    "Agreed": "అంగీకరించబడింది",
    "Online": "ఆన్‌లైన్",
    "Offline": "ఆఫ్‌లైన్",
    "Status": "స్థితి",
    "Status:": "స్థితి:",

    // -------------------------------------------------------------------------
    // Offers & Negotiations
    // -------------------------------------------------------------------------
    "Accept Offer": "ఆఫర్‌ను అంగీకరించండి",
    "Counter Offer": "కౌంటర్ ఆఫర్ ఇవ్వండి",
    "Counter Offer:": "కౌంటర్ ఆఫర్:",
    "Reject Offer": "ఆఫర్‌ను తిరస్కరించండి",
    "Send Counter Offer": "కౌంటర్ ఆఫర్ పంపండి",
    "Send Request": "అభ్యర్థన పంపండి",
    "Offer Price": "ఆఫర్ ధర",
    "Offered Price": "ప్రతిపాదించిన ధర",
    "Offered Price:": "ప్రతిపాదించిన ధర:",
    "Expected Price": "ఆశించే ధర",
    "Expected Price:": "ఆశించే ధర:",

    // -------------------------------------------------------------------------
    // Assistant & Chat
    // -------------------------------------------------------------------------
    "Kisan Assistant": "కిసాన్ అసిస్టెంట్",
    "Trilingual Voice & Chat Assistance (EN | TE | HI)": "త్రిభాషా వాయిస్ & చాట్ సహాయం (ఇంగ్లీష్ | తెలుగు | హిందీ)",
    "Kisan Assistant is thinking...": "కిసాన్ అసిస్టెంట్ ఆలోచిస్తోంది...",
    "Ask about crop prices, buyers, net income...": "పంట ధరలు, కొనుగోలుదారులు, నికర ఆదాయం గురించి అడగండి...",
    "Open Kisan Assistant": "కిసాన్ అసిస్టెంట్‌ని తెరవండి",
    "Ask Kisan Assistant": "కిసాన్ అసిస్టెంట్‌ని అడగండి",

    // -------------------------------------------------------------------------
    // Crops
    // -------------------------------------------------------------------------
    "Tomato": "టమాటా",
    "Cotton": "పత్తి",
    "Paddy": "వరి",
    "Chilli": "మిరప",
    "Maize": "మొక్కజొన్న",
    "Turmeric": "పసుపు",
    "Onion": "ఉల్లిగడ్డ",
    "Red Gram": "కందులు",
    "Groundnut": "వేరుశనగ",
    "Soybean": "సోయాబీన్",
    "Potato": "బంగాళాదుంప",
    "Crop": "పంట",
    "Crop:": "పంట:",
    "Quantity": "పరిమాణం",
    "Quantity:": "పరిమాణం:",
    "Price": "ధర",
    "Price:": "ధర:",
    "Grade": "గ్రేడ్",
    "Grade:": "గ్రేడ్:",

    // -------------------------------------------------------------------------
    // Common Buttons, Actions & Filters
    // -------------------------------------------------------------------------
    "View Details": "వివరాలు చూడండి",
    "Actions": "చర్యలు",
    "Close": "మూసివేయి",
    "Submit": "సమర్పించండి",
    "Cancel": "రద్దు చేయండి",
    "Save": "సేవ్ చేయండి",
    "Back": "వెనుకకు",
    "Next": "తరువాత",
    "Filter": "ఫిల్టర్",
    "Export": "ఎగుమతి చేయండి",
    "Download": "డౌన్‌లోడ్",
    "Print": "ప్రింట్",
    "Refresh": "తాజాకరించండి",
    "Search": "వెతకండి",
    "Add Produce": "పంటను జోడించండి",
    "Post Requirement": "అవసరాన్ని పోస్ట్ చేయండి",
    "Notifications": "నోటిఫికేషన్‌లు",
    "Mark all as read": "అన్నీ చదివినట్లు గుర్తించండి",
    "Clear all": "అన్నీ తొలగించండి",
    "Search produce, buyers, markets...": "పంటలు, కొనుగోలుదారులు, మార్కెట్లను వెతకండి...",
    "Search by transaction code, crop, or buyer...": "లావాదేవీ కోడ్, పంట లేదా కొనుగోలుదారు ద్వారా వెతకండి...",
    "Loading...": "లోడ్ అవుతోంది...",
    "Loading notifications...": "నోటిఫికేషన్‌లు లోడ్ అవుతున్నాయి...",
    "No notifications yet": "ఇంకా ఎటువంటి నోటిఫికేషన్‌లు లేవు",
    "No transactions found": "ఎటువంటి లావాదేవీలు కనుగొనబడలేదు",
    "No data available": "సమాచారం అందుబాటులో లేదు"
  },

  hi: {
    // -------------------------------------------------------------------------
    // Navigation & Sidebar Groups
    // -------------------------------------------------------------------------
    "SELL": "बिक्री",
    "DEAL": "सौदा",
    "DELIVERY": "सुपुर्दगी",
    "SUPPORT": "सहायता",
    "Support": "सहायता",
    "Sell Smart Engine": "स्मार्ट बिक्री इंजन",
    "Admin Messages": "एडमिन संदेश",
    "Procurement & Demand": "खरीद और मांग",
    "Commercial Deals": "व्यापारिक सौदे",
    "Fulfillment & Audit": "पूर्ति और लेखापरीक्षा",
    "Core Governance": "मुख्य शासन",
    "Operations & Settlement": "संचालन और निपटान",
    "Compliance & Security": "अनुपालन और सुरक्षा",
    "Platform Overview": "प्लेटफ़ॉर्म अवलोकन",
    "Farmer Management": "किसान प्रबंधन",
    "Buyer Management": "खरीदार प्रबंधन",
    "Produce & Lots": "फसल और लॉट प्रबंधन",
    "Procurement & Handover": "खरीद और सुपुर्दगी",
    "Transactions & Payments": "लेनदेन और भुगतान",
    "Market Intelligence": "मंडी विश्लेषण",
    "Grievance Center": "शिकायत निवारण केंद्र",
    "Notifications & Alerts": "सूचनाएं और अलर्ट",
    "System Audit Logs": "सिस्टम ऑडिट लॉग",
    "Access Platform →": "प्लेटफ़ॉर्म पर जाएं →",
    "Access Platform": "प्लेटफ़ॉर्म पर जाएं",

    // -------------------------------------------------------------------------
    // Common Nav Items & Portals
    // -------------------------------------------------------------------------
    "Dashboard": "डैशबोर्ड",
    "Farmer Portal": "किसान पोर्टल",
    "Buyer Portal": "खरीदार पोर्टल",
    "Admin Command Center": "एडमिन कमांड सेंटर",
    "Admin Portal": "एडमिन पोर्टल",
    "My Produce": "मेरी फसलें",
    "Market Price": "मंडी भाव",
    "Market Prices": "मंडी भाव",
    "Buyers List": "खरीदारों की सूची",
    "Offers & Negotiations": "प्रस्ताव और बातचीत",
    "Agreements": "अनुबंध / एग्रीमेंट",
    "Slot Booking": "स्लॉट बुकिंग",
    "Produce Handover": "फसल सुपुर्दगी",
    "Handover": "फसल सुपुर्दगी",
    "Transactions": "लेनदेन",
    "Grievance": "शिकायत",
    "Grievances": "शिकायतें",
    "My Requirements": "मेरी आवश्यकताएं",
    "Add Requirement": "आवश्यकता जोड़ें",
    "Search Farmers": "किसान खोजें",
    "Search Buyers": "खरीदार खोजें",
    "Incoming Requests": "प्राप्त अनुरोध",
    "Pickup Confirmation": "पिकअप पुष्टि",
    "Quality Audit": "गुणवत्ता ऑडिट",
    "Produce Handover & Pickup Confirmation": "फसल सुपुर्दगी और पिकअप पुष्टि",
    "Home": "होम",
    "Login": "लॉग इन",
    "Register": "पंजीकरण",
    "Logout": "लॉग आउट",
    "Select Role": "भूमिका चुनें",
    "Farmer": "किसान",
    "Buyer": "खरीदार",
    "Admin": "एडमिन",
    "Language": "भाषा",
    "English": "English",
    "తెలుగు": "తెలుగు",
    "हिन्दी": "हिन्दी",

    // -------------------------------------------------------------------------
    // Agreement Signing & Dual Signature Workflow
    // -------------------------------------------------------------------------
    "Waiting for Buyer to sign": "खरीदार के हस्ताक्षर की प्रतीक्षा है",
    "Waiting for Farmer to sign": "किसान के हस्ताक्षर की प्रतीक्षा है",
    "Both Sides Signed": "दोनों पक्षों ने हस्ताक्षर किए",
    "Farmer Signed": "किसान द्वारा हस्ताक्षरित",
    "Buyer Signed": "खरीदार द्वारा हस्ताक्षरित",
    "Sign Agreement": "अनुबंध पर हस्ताक्षर करें",
    "Sign Agreement (OTP Verification)": "अनुबंध पर हस्ताक्षर करें (OTP सत्यापन)",
    "Digital Commercial Agreement": "डिजिटल व्यापारिक अनुबंध",
    "Procurement Contract": "खरीद अनुबंध",
    "Agreement Details": "अनुबंध विवरण",
    "Commercial Settlement Terms": "व्यापारिक निपटान शर्तें",
    "Contract Terms & Clauses": "अनुबंध के नियम व शर्तें",
    "Proceed to Procurement Slot Booking": "स्लॉट बुकिंग के लिए आगे बढ़ें",
    "Proceed to Slot Booking": "स्लॉट बुकिंग के लिए आगे बढ़ें",
    "Farmer Signature": "किसान के हस्ताक्षर",
    "Buyer Signature": "खरीदार के हस्ताक्षर",
    "Farmer (Seller)": "किसान (विक्रेता)",
    "Buyer (Purchaser)": "खरीदार (क्रेता)",
    "Farmer (Seller):": "किसान (विक्रेता):",
    "Buyer (Purchaser):": "खरीदार (क्रेता):",
    "Agreement ID:": "अनुबंध ID:",
    "Date & Time:": "दिनांक व समय:",
    "1. AGREEMENT DETAILS": "1. अनुबंध विवरण",
    "2. PARTIES": "2. पक्षकार",
    "3. PRODUCE DETAILS": "3. फसल विवरण",
    "4. COMMERCIAL TERMS": "4. व्यापारिक शर्तें",
    "5. PAYMENT TERMS & UPI MANDATE": "5. भुगतान शर्तें और UPI अधिदेश",
    "6. MANDATORY STATUTORY COVENANTS": "6. अनिवार्य वैधानिक नियम",
    "Grade / Quality:": "ग्रेड / गुणवत्ता:",
    "Lot ID:": "लॉट ID:",

    // -------------------------------------------------------------------------
    // Payment Terms, Days & UPI Only
    // -------------------------------------------------------------------------
    "Payment Term": "भुगतान शर्त",
    "Payment Terms": "भुगतान शर्तें",
    "Agreed Payment Term": "सहमति अनुसार भुगतान अवधि",
    "Payment as per Negotiation": "बातचीत के अनुसार भुगतान",
    "Payment as per Negotiation.": "बातचीत के अनुसार भुगतान।",
    "Settlement Mode": "निपटान मोड",
    "UPI Only": "केवल UPI द्वारा",
    "All payments must be made through UPI only.": "सभी भुगतान केवल UPI द्वारा ही किए जाने चाहिए।",
    "Release Payment": "भुगतान जारी करें",
    "Release Payment via UPI": "UPI द्वारा भुगतान जारी करें",
    "Farmer Beneficiary UPI ID": "किसान लाभार्थी UPI ID",
    "Farmer Beneficiary UPI": "किसान लाभार्थी UPI",
    "Beneficiary UPI ID": "लाभार्थी UPI ID",
    "Delay Penalty Amount": "विलंब जुर्माना राशि",
    "Delay Amount": "विलंब जुर्माना",
    "Delay Penalty": "विलंब जुर्माना",
    "Delay Penalty:": "विलंब जुर्माना:",
    "Days Delayed": "विलंबित दिन",
    "Daily Delay Penalty Rate": "दैनिक विलंब जुर्माना दर",
    "Agreed Produce Amount": "सहमत फसल राशि",
    "Agreed Amount": "सहमत राशि",
    "Total Payable via UPI": "UPI द्वारा कुल देय राशि",
    "Total Payable Amount": "कुल देय राशि",
    "Total Settled (UPI Only)": "कुल भुगतान पूर्ण (UPI)",
    "Total Amount": "कुल राशि",
    "Total Value": "कुल मूल्य",
    "Total Value:": "कुल मूल्य:",
    "Gross Value": "सकल मूल्य",
    "Net Realisation": "शुद्ध आय",
    "Net Realisation to Farmer": "किसान को शुद्ध आय",
    "Payment Status": "भुगतान स्थिति",
    "Verify Payment Receipt": "भुगतान रसीद सत्यापित करें",
    "Verify Payment": "भुगतान सत्यापित करें",
    "Payment Settled via UPI": "UPI द्वारा भुगतान संपन्न",
    "Payment Released": "भुगतान जारी किया गया",
    "Payment Verified": "भुगतान सत्यापित हुआ",
    "Payment Due Date": "भुगतान देय तिथि",
    "Payment Reference": "भुगतान संदर्भ",
    "UPI Reference": "UPI संदर्भ",
    "Within 1 Day": "1 दिन के भीतर",
    "Within 2 Days": "2 दिनों के भीतर",
    "Within 3 Days": "3 दिनों के भीतर",
    "Within 5 Days": "5 दिनों के भीतर",
    "Within 7 Days": "7 दिनों के भीतर",
    "Select payment days": "भुगतान के दिनों का चयन करें",
    "Select Payment Days": "भुगतान के दिनों का चयन करें",

    // -------------------------------------------------------------------------
    // Slot Booking & Logistics
    // -------------------------------------------------------------------------
    "Available Slots": "उपलब्ध स्लॉट",
    "Select Procurement Slot": "खरीद स्लॉट चुनें",
    "Select Slot": "स्लॉट चुनें",
    "Book Slot": "स्लॉट बुक करें",
    "Book This Slot": "यह स्लॉट बुक करें",
    "Confirm Slot": "स्लॉट की पुष्टि करें",
    "Slot Booked Successfully": "स्लॉट सफलतापूर्वक बुक किया गया",
    "Valid Future Slots (Starting Tomorrow)": "वैध भविष्य स्लॉट (कल से शुरू)",
    "Valid future slots starting from tomorrow onwards": "कल से शुरू होने वाले वैध भविष्य स्लॉट",
    "Time Window": "समय अवधि",
    "Pickup Location": "पिकअप स्थान",
    "Collection Yard": "संग्रहण केंद्र",
    "APMC Collection Yard": "मंडी संग्रहण केंद्र",
    "Direct Farm Pickup": "खेत से सीधा उठाव",
    "Logistics Park Hub": "लॉजिस्टिक्स पार्क हब",

    // -------------------------------------------------------------------------
    // Produce Handover & Quality Confirmation
    // -------------------------------------------------------------------------
    "Produce Handover Completed": "फसल सुपुर्दगी पूर्ण",
    "Confirm Quality & Quantity": "गुणवत्ता और मात्रा की पुष्टि करें",
    "Quality & Quantity Confirmed": "गुणवत्ता और मात्रा की पुष्टि हो गई",
    "Produce Quality & Quantity Confirmed": "फसल गुणवत्ता और मात्रा की पुष्टि हो गई",
    "Quality Confirmed": "गुणवत्ता की पुष्टि हुई",
    "Quantity Confirmed": "मात्रा की पुष्टि हुई",
    "Received Quantity": "प्राप्त मात्रा",
    "Quality / Grade": "गुणवत्ता / ग्रेड",
    "Agreed Price": "सहमत मूल्य",
    "Total Transaction Value": "कुल लेनदेन मूल्य",
    "Verify Received Produce": "प्राप्त फसल का सत्यापन करें",
    "Confirm Received Produce Quality & Quantity": "प्राप्त फसल की गुणवत्ता और मात्रा की पुष्टि करें",
    "Step 1: Produce Handover": "चरण 1: फसल सुपुर्दगी",
    "Step 2: Quality & Quantity Audit": "चरण 2: गुणवत्ता और मात्रा ऑडिट",
    "Step 3: Commercial UPI Settlement": "चरण 3: व्यापारिक UPI भुगतान",
    "Handover Status": "सुपुर्दगी स्थिति",
    "Pickup Completed": "पिकअप पूर्ण हुआ",
    "Produce Handover Verified": "फसल सुपुर्दगी सत्यापित",
    "Confirm Produce Handover": "फसल सुपुर्दगी की पुष्टि करें",
    "Confirm Handover": "सुपुर्दगी की पुष्टि करें",

    // -------------------------------------------------------------------------
    // Post-Handover Labour Negotiation
    // -------------------------------------------------------------------------
    "Post-Handover Labour / Unloading Charges Negotiation": "सुपुर्दगी के बाद उतराई / हम्माली मजदूरी पर बातचीत",
    "Actual Labour Amount (₹)": "वास्तविक मजदूरी राशि (₹)",
    "Labour Notes / Receipt Reference": "मजदूरी विवरण / रसीद संदर्भ",
    "Agree on Labour": "मजदूरी पर सहमति दें",
    "Labour Charges Agreed": "मजदूरी शुल्क पर सहमति बनी",
    "Labour Charges": "मजदूरी शुल्क",
    "Labour Charges:": "मजदूरी शुल्क:",
    "Actual Labour Charges": "वास्तविक मजदूरी शुल्क",
    "Labour Status": "मजदूरी स्थिति",
    "Labour charges negotiated post-handover based on actual loading/unloading": "वास्तविक लोडिंग/अनलोडिंग के आधार पर सुपुर्दगी के बाद मजदूरी तय की जाती है",

    // -------------------------------------------------------------------------
    // Cold Storage & Transport
    // -------------------------------------------------------------------------
    "Cold Storage Required?": "कोल्ड स्टोरेज की आवश्यकता है?",
    "Cold Storage Required": "कोल्ड स्टोरेज आवश्यक",
    "Cold Storage Cost": "कोल्ड स्टोरेज लागत",
    "Storage Duration": "भंडारण अवधि",
    "Storage Cost": "भंडारण लागत",
    "Transport Cost": "परिवहन लागत",
    "Transport Cost (₹0 Platform Deduction)": "परिवहन लागत (₹0 प्लेटफ़ॉर्म कटौती)",
    "Handled directly by Farmer (₹0 platform deduction)": "किसान द्वारा सीधे प्रबंधित (₹0 प्लेटफ़ॉर्म कटौती)",
    "Platform transport deduction = ₹0 (Handled directly by Farmer)": "प्लेटफ़ॉर्म परिवहन कटौती = ₹0 (किसान द्वारा सीधे प्रबंधित)",

    // -------------------------------------------------------------------------
    // Status Badges & Lifecycle
    // -------------------------------------------------------------------------
    "PENDING": "लंबित",
    "Pending": "लंबित",
    "RELEASED": "जारी किया गया",
    "Released": "जारी किया गया",
    "VERIFIED": "सत्यापित",
    "Verified": "सत्यापित",
    "COMPLETED": "पूर्ण",
    "Completed": "पूर्ण",
    "CONFIRMED": "पुष्टि की गई",
    "Confirmed": "पुष्टि की गई",
    "DRAFT": "प्रारूप",
    "Draft": "प्रारूप",
    "SIGNED": "हस्ताक्षरित",
    "Signed": "हस्ताक्षरित",
    "ACCEPTED": "स्वीकृत",
    "Accepted": "स्वीकृत",
    "REJECTED": "अस्वीकृत",
    "Rejected": "अस्वीकृत",
    "ACTIVE": "सक्रिय",
    "Active": "सक्रिय",
    "AGREED": "सहमत",
    "Agreed": "सहमत",
    "Online": "ऑनलाइन",
    "Offline": "ऑफ़लाइन",
    "Status": "स्थिति",
    "Status:": "स्थिति:",

    // -------------------------------------------------------------------------
    // Offers & Negotiations
    // -------------------------------------------------------------------------
    "Accept Offer": "प्रस्ताव स्वीकार करें",
    "Counter Offer": "काउंटर ऑफर दें",
    "Counter Offer:": "काउंटर ऑफर:",
    "Reject Offer": "प्रस्ताव अस्वीकार करें",
    "Send Counter Offer": "काउंटर ऑफर भेजें",
    "Send Request": "अनुरोध भेजें",
    "Offer Price": "प्रस्तावित मूल्य",
    "Offered Price": "प्रस्तावित मूल्य",
    "Offered Price:": "प्रस्तावित मूल्य:",
    "Expected Price": "अपेक्षित मूल्य",
    "Expected Price:": "अपेक्षित मूल्य:",

    // -------------------------------------------------------------------------
    // Assistant & Chat
    // -------------------------------------------------------------------------
    "Kisan Assistant": "किसान असिस्टेंट",
    "Trilingual Voice & Chat Assistance (EN | TE | HI)": "त्रिभाषी आवाज और चैट सहायता (अंग्रेजी | तेलुगु | हिन्दी)",
    "Kisan Assistant is thinking...": "किसान असिस्टेंट सोच रहा है...",
    "Ask about crop prices, buyers, net income...": "फसल के भाव, खरीदार, शुद्ध आय आदि के बारे में पूछें...",
    "Open Kisan Assistant": "किसान असिस्टेंट खोलें",
    "Ask Kisan Assistant": "किसान असिस्टेंट से पूछें",

    // -------------------------------------------------------------------------
    // Crops
    // -------------------------------------------------------------------------
    "Tomato": "टमाटर",
    "Cotton": "कपास",
    "Paddy": "धान",
    "Chilli": "मिर्च",
    "Maize": "मक्का",
    "Turmeric": "हल्दी",
    "Onion": "प्याज",
    "Red Gram": "अरहर",
    "Groundnut": "मूंगफली",
    "Soybean": "सोयाबीन",
    "Potato": "आलू",
    "Crop": "फसल",
    "Crop:": "फसल:",
    "Quantity": "मात्रा",
    "Quantity:": "मात्रा:",
    "Price": "मूल्य",
    "Price:": "मूल्य:",
    "Grade": "ग्रेड",
    "Grade:": "ग्रेड:",

    // -------------------------------------------------------------------------
    // Common Buttons, Actions & Filters
    // -------------------------------------------------------------------------
    "View Details": "विवरण देखें",
    "Actions": "कार्रवाई",
    "Close": "बंद करें",
    "Submit": "जमा करें",
    "Cancel": "रद्द करें",
    "Save": "सुरक्षित करें",
    "Back": "वापस",
    "Next": "आगे",
    "Filter": "फ़िल्टर",
    "Export": "निर्यात करें",
    "Download": "डाउनलोड",
    "Print": "प्रिंट",
    "Refresh": "ताज़ा करें",
    "Search": "खोजें",
    "Add Produce": "फसल जोड़ें",
    "Post Requirement": "मांग पोस्ट करें",
    "Notifications": "सूचनाएं",
    "Mark all as read": "सभी को पढ़ा हुआ चिह्नित करें",
    "Clear all": "सभी हटाएं",
    "Search produce, buyers, markets...": "फसलें, खरीदार, मंडियां खोजें...",
    "Search by transaction code, crop, or buyer...": "लेनदेन कोड, फसल या खरीदार द्वारा खोजें...",
    "Loading...": "लोड हो रहा है...",
    "Loading notifications...": "सूचनाएं लोड हो रही हैं...",
    "No notifications yet": "अभी कोई सूचना नहीं है",
    "No transactions found": "कोई लेनदेन नहीं मिला",
    "No data available": "कोई डेटा उपलब्ध नहीं है"
  }
};

// -----------------------------------------------------------------------------
// Bidirectional Reverse Lookup Mappings
// -----------------------------------------------------------------------------
export const REVERSE_MAP: Record<'te' | 'hi', Record<string, string>> = {
  te: {},
  hi: {}
};

// 1. Populate from PHRASE_TRANSLATIONS
for (const [en, te] of Object.entries(PHRASE_TRANSLATIONS.te)) {
  REVERSE_MAP.te[te] = en;
}
for (const [en, hi] of Object.entries(PHRASE_TRANSLATIONS.hi)) {
  REVERSE_MAP.hi[hi] = en;
}

// 2. Also merge all pairs from translations.ts for complete 100% UI coverage
try {
  if (translations && translations.en) {
    for (const [k, enVal] of Object.entries(translations.en)) {
      const teVal = (translations.te as any)?.[k];
      const hiVal = (translations.hi as any)?.[k];
      if (typeof enVal === 'string' && typeof teVal === 'string' && enVal.trim() && teVal.trim()) {
        if (!PHRASE_TRANSLATIONS.te[enVal]) {
          PHRASE_TRANSLATIONS.te[enVal] = teVal;
        }
        REVERSE_MAP.te[teVal] = enVal;
      }
      if (typeof enVal === 'string' && typeof hiVal === 'string' && enVal.trim() && hiVal.trim()) {
        if (!PHRASE_TRANSLATIONS.hi[enVal]) {
          PHRASE_TRANSLATIONS.hi[enVal] = hiVal;
        }
        REVERSE_MAP.hi[hiVal] = enVal;
      }
    }
  }
} catch (e) {
  // Safe fallback
}

/**
 * Resolves any text (whether English, Telugu, or Hindi) back to its canonical English text.
 */
export function getCanonicalEnglish(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();

  // If already in Telugu reverse map
  if (REVERSE_MAP.te[trimmed]) return REVERSE_MAP.te[trimmed];
  // If already in Hindi reverse map
  if (REVERSE_MAP.hi[trimmed]) return REVERSE_MAP.hi[trimmed];

  // Case-insensitive checks
  const lower = trimmed.toLowerCase();
  for (const [te, en] of Object.entries(REVERSE_MAP.te)) {
    if (te.toLowerCase() === lower) return en;
  }
  for (const [hi, en] of Object.entries(REVERSE_MAP.hi)) {
    if (hi.toLowerCase() === lower) return en;
  }

  // Already English or unrecognized
  return trimmed;
}

/**
 * Translates a single phrase into the target language with reverse fallback support.
 */
export function translatePhrase(text: string, lang: 'en' | 'te' | 'hi'): string {
  if (!text) return '';
  const trimmed = text.trim();
  const canonicalEn = getCanonicalEnglish(trimmed);

  if (lang === 'en') {
    return text.replace(trimmed, canonicalEn);
  }

  const dict = PHRASE_TRANSLATIONS[lang];
  if (!dict) return text;

  // 1. Direct canonical lookup
  if (dict[canonicalEn]) {
    return text.replace(trimmed, dict[canonicalEn]);
  }

  // 2. Exact match on current text
  if (dict[trimmed]) {
    return text.replace(trimmed, dict[trimmed]);
  }

  // 3. Case-insensitive lookup
  const lower = canonicalEn.toLowerCase();
  for (const [key, val] of Object.entries(dict)) {
    if (key.toLowerCase() === lower) {
      return text.replace(trimmed, val);
    }
  }

  return text;
}
