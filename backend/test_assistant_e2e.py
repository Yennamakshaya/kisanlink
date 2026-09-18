import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

tests = [
    # 1. Market Price variations
    ({'query': 'tomato price', 'language': 'en'}, 'market_price', 'Tomato'),
    ({'query': "what is today's tomato price?", 'language': 'en'}, 'market_price', 'Tomato'),
    ({'query': 'tomato rate', 'language': 'en'}, 'market_price', 'Tomato'),
    ({'query': 'how much is tomato today?', 'language': 'en'}, 'market_price', 'Tomato'),
    ({'query': 'టమాటా ధర ఎంత?', 'language': 'te'}, 'market_price', 'ధర'),
    ({'query': 'tamatar ka bhav kitna hai', 'language': 'hi'}, 'market_price', 'टमाटर'),
    ({'query': 'कपास का मंडी भाव क्या है?', 'language': 'hi'}, 'market_price', 'कपास'),

    # 2. Buyer Recommendation
    ({'query': 'which buyer should I sell my tomato to?', 'language': 'en'}, 'buyer_recommendation', 'Buyer'),
    ({'query': 'టమాటా ఏ కొనుగోలుదారునికి అమ్మాలి?', 'language': 'te'}, 'buyer_recommendation', 'కొనుగోలుదారు'),
    ({'query': 'टमाटर किस खरीदार को बेचना चाहिए?', 'language': 'hi'}, 'buyer_recommendation', 'खरीदार'),

    # 3. Buyer Search
    ({'query': 'find buyer for 500kg tomato', 'language': 'en'}, 'buyer_search', 'Buyer'),
    ({'query': 'find buyers for cotton', 'language': 'en'}, 'buyer_search', 'Cotton'),
    ({'query': 'టమాటా కొనుగోలుదారులను వెతకండి', 'language': 'te'}, 'buyer_search', 'కొనుగోలుదారులు'),
    ({'query': 'टमाटर के लिए खरीदार खोजें', 'language': 'hi'}, 'buyer_search', 'खरीदार'),

    # 4. Selling Guidance
    ({'query': 'I want to sell my tomato', 'language': 'en'}, 'selling_guidance', 'Sell'),
    ({'query': 'నేను నా టమాటా అమ్మాలనుకుంటున్నాను', 'language': 'te'}, 'selling_guidance', 'విక్రయించే'),
    ({'query': 'मैं अपना टमाटर बेचना चाहता हूँ', 'language': 'hi'}, 'selling_guidance', 'बेचने'),

    # 5. Crop Agronomy / Pest Control
    ({'query': 'how to control pests in tomato?', 'language': 'en'}, 'crop_agronomy', 'Tomato'),
    ({'query': 'How to control Pink Bollworm in Cotton?', 'language': 'en'}, 'crop_agronomy', 'Pink Bollworm'),
    ({'query': 'వరి పంటలో కాండం తొలిచే పురుగు నివారణ ఎలా?', 'language': 'te'}, 'crop_agronomy', 'వరి'),
    ({'query': 'మిర్చి లో తెగులు నివారణ ఎలా?', 'language': 'te'}, 'crop_agronomy', 'మిరప'),
    ({'query': 'मिर्च में पत्ती मरोड़ रोग का इलाज क्या है?', 'language': 'hi'}, 'crop_agronomy', 'मिर्च'),

    # 6. Payment Queries
    ({'query': 'payment not received', 'language': 'en'}, 'payment_query', 'Payment'),
    ({'query': 'What happens if the buyer delays payment?', 'language': 'en'}, 'payment_query', 'delay'),
    ({'query': 'చెల్లింపు అందలేదు ఏమి చేయాలి?', 'language': 'te'}, 'payment_query', 'చెల్లింపు'),
    ({'query': 'చెల్లింపు ఆలస్యం అయితే పెనాల్టీ ఎంత?', 'language': 'te'}, 'payment_query', 'ఆలస్య'),
    ({'query': 'भुगतान नहीं मिला क्या करें?', 'language': 'hi'}, 'payment_query', 'भुगतान'),

    # 7. My Produce
    ({'query': 'show my produce', 'language': 'en'}, 'my_produce', 'Produce'),
    ({'query': 'నా పంట వివరాలు చూపించు', 'language': 'te'}, 'my_produce', 'పంట'),
    ({'query': 'मेरी फसल दिखाओ', 'language': 'hi'}, 'my_produce', 'फसल'),

    # 8. Negotiation Guidance
    ({'query': 'how do I negotiate with buyer?', 'language': 'en'}, 'negotiation_query', 'Negotiat'),
    ({'query': 'కొనుగోలుదారుతో ఎలా బేరం చేయాలి?', 'language': 'te'}, 'negotiation_query', 'చర్చలు'),
    ({'query': 'खरीदार से मोलभाव कैसे करें?', 'language': 'hi'}, 'negotiation_query', 'बातचीत'),

    # 9. Market Recommendation / Where should I sell
    ({'query': 'where should I sell?', 'language': 'en'}, 'market_recommendation', 'Mandi'),
    ({'query': 'where should I sell my tomato?', 'language': 'en'}, 'market_recommendation', 'Realisation'),
    ({'query': 'నేను ఎక్కడ అమ్మాలి?', 'language': 'te'}, 'market_recommendation', 'కొనుగోలుదారు'),
    ({'query': 'मुझे कहाँ बेचना चाहिए?', 'language': 'hi'}, 'market_recommendation', 'खरीदार'),

    # 10. Bare Crop Queries (Polite clarification, not generic greeting)
    ({'query': 'tomato', 'language': 'en'}, 'clarification_needed', 'price'),
    ({'query': 'cotton', 'language': 'en'}, 'clarification_needed', 'price'),
    ({'query': 'వరి', 'language': 'te'}, 'clarification_needed', 'వరి'),
    ({'query': 'టమాటా', 'language': 'te'}, 'clarification_needed', 'టమాటా'),
    ({'query': 'टमाटर', 'language': 'hi'}, 'clarification_needed', 'टमाटर'),

    # 11. General Agreement / Labour rules
    ({'query': 'How do digital agreements and UPI payments work?', 'language': 'en'}, 'agreement_guidelines', 'UPI Only'),
    ({'query': 'Who pays unloading and labour charges after produce handover?', 'language': 'en'}, 'handover_logistics', 'labour'),
]

passed = 0
for i, (payload, expected_intent, keyword) in enumerate(tests, 1):
    res = client.post('/api/assistant/query', json=payload)
    assert res.status_code == 200, f'Failed on {payload}: {res.text}'
    data = res.json()
    actual_intent = data.get('intent')
    actual_ans = data.get('answer', '')
    assert actual_intent == expected_intent, (
        f"[Test {i}] Query '{payload['query']}': expected intent '{expected_intent}' but got '{actual_intent}'. Answer: {actual_ans[:100]}"
    )
    assert keyword.lower() in actual_ans.lower(), (
        f"[Test {i}] Query '{payload['query']}': keyword '{keyword}' missing in answer: {actual_ans}"
    )
    passed += 1
    print(f'[PASS {i}/{len(tests)}] Query: "{payload["query"]}" -> Intent: {actual_intent}')

print(f'\nALL {passed}/{len(tests)} KISAN ASSISTANT SCENARIOS PASSED 100%!')
