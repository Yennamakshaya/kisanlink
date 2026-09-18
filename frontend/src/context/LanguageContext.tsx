import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { translations, Language } from '../i18n/translations';
import { PHRASE_TRANSLATIONS, translatePhrase, getCanonicalEnglish } from '../i18n/phraseDictionary';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyOrText: any) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Known common UI prefixes for split translation (e.g. "Total Value: ₹1,50,000" -> "మొత్తం విలువ: ₹1,50,000")
const UI_PREFIX_MAP: Record<string, { te: string; hi: string }> = {
  "Total Value:": { te: "మొత్తం విలువ:", hi: "कुल मूल्य:" },
  "Total Amount:": { te: "మొత్తం సొమ్ము:", hi: "कुल राशि:" },
  "Total Settled:": { te: "మొత్తం చెల్లించబడింది:", hi: "कुल भुगतान पूर्ण:" },
  "Gross Value:": { te: "మొత్తం పంట విలువ:", hi: "सकल मूल्य:" },
  "Net Realisation:": { te: "నికర ఆదాయం:", hi: "शुद्ध आय:" },
  "Agreed Price:": { te: "అంగీకరించిన ధర:", hi: "सहमत मूल्य:" },
  "Expected Price:": { te: "ఆశించే ధర:", hi: "अपेक्षित मूल्य:" },
  "Offered Price:": { te: "ప్రతిపాదించిన ధర:", hi: "प्रस्तावित मूल्य:" },
  "Offer Price:": { te: "ఆఫర్ ధర:", hi: "प्रस्तावित मूल्य:" },
  "Offer #": { te: "ఆఫర్ #", hi: "प्रस्ताव #" },
  "Counter Offer:": { te: "కౌంటర్ ఆఫర్:", hi: "काउंटर ऑफर:" },
  "Labour Charges:": { te: "కూలీ ఛార్జీలు:", hi: "मजदूरी शुल्क:" },
  "Delay Penalty:": { te: "ఆలస్య రుసుము:", hi: "विलंब जुर्माना:" },
  "Cold Storage Cost:": { te: "కోల్డ్ స్టోరేజ్ ఖర్చు:", hi: "कोल्ड स्टोरेज लागत:" },
  "Status:": { te: "స్థితి:", hi: "स्थिति:" },
  "Location:": { te: "ప్రాంతం:", hi: "स्थान:" },
  "Crop:": { te: "పంట:", hi: "फसल:" },
  "Quantity:": { te: "పరిమాణం:", hi: "मात्रा:" },
  "Price:": { te: "ధర:", hi: "मूल्य:" },
  "Grade:": { te: "గ్రేడ్:", hi: "ग्रेड:" },
  "Agreement ID:": { te: "ఒప్పందం ID:", hi: "अनुबंध ID:" },
  "Date & Time:": { te: "తేదీ & సమయం:", hi: "दिनांक व समय:" },
  "Lot ID:": { te: "లాట్ ID:", hi: "लॉट ID:" },
  "Booking Slot Code:": { te: "స్లాట్ కోడ్:", hi: "स्लॉट कोड:" },
  "Payment Terms:": { te: "చెల్లింపు నిబంధనలు:", hi: "भुगतान शर्तें:" },
  "Payment Method:": { te: "చెల్లింపు విధానం:", hi: "भुगतान माध्यम:" },
  "Settlement Mode:": { te: "చెల్లింపు విధానం:", hi: "निपटान मोड:" },
  "UPI Ref:": { te: "UPI రిఫరెన్స్:", hi: "UPI संदर्भ:" },
  "UPI Reference:": { te: "UPI రిఫరెన్స్:", hi: "UPI संदर्भ:" },
};

function shouldProtectText(trimmed: string): boolean {
  if (!trimmed || trimmed.length <= 1) return true;

  // Pure numbers, currency, percentages, units, timestamps, time windows
  if (/^\s*[₹$€]?\s*[\d,./\-:+%]+\s*(?:kg|kgs|quintal|ton|tonnes|MT|g|L|ml|AM|PM)?\s*$/i.test(trimmed)) {
    return true;
  }

  // Business codes & unique IDs (Must NEVER be translated)
  if (/^(?:LOT|AGR-KL|TXN-KL|SLOT|NEG)-[\w\-]+/i.test(trimmed)) {
    return true;
  }
  if (/^UPI\/KL\/[\w\-]+/i.test(trimmed)) {
    return true;
  }
  if (/^[\w.\-_]+@[\w\-]+/i.test(trimmed)) {
    return true;
  }

  // Phone numbers (10 digits)
  if (/^\+?91[\s-]?\d{10}$/.test(trimmed) || /^\d{10}$/.test(trimmed)) {
    return true;
  }

  // GSTIN format (15 characters)
  if (/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(trimmed)) {
    return true;
  }

  // Bank IFSC code
  if (/^[A-Z]{4}0[A-Z0-9]{6}$/.test(trimmed)) {
    return true;
  }

  return false;
}

function isProtectedElement(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (
    tag === 'SCRIPT' ||
    tag === 'STYLE' ||
    tag === 'CODE' ||
    tag === 'PRE' ||
    tag === 'NOSCRIPT' ||
    tag === 'SVG' ||
    tag === 'PATH'
  ) {
    return true;
  }

  if (
    el.closest('.no-translate') ||
    el.closest('.font-mono') ||
    el.closest('.user-name') ||
    el.closest('.company-name') ||
    el.closest('.preserve-data')
  ) {
    return true;
  }

  return false;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('kisanlink_lang') as Language) || 'en';
  });

  const originalTextNodes = useRef<WeakMap<Node, string>>(new WeakMap());
  const isTranslatingRef = useRef<boolean>(false);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('kisanlink_lang', lang);
  };

  const t = (keyOrText: any): string => {
    if (!keyOrText) return '';
    const str = String(keyOrText);

    // If English requested
    if (language === 'en') {
      return (translations.en as any)[str] || getCanonicalEnglish(str);
    }

    // 1. Structured key in translations
    const dict = (translations as any)[language];
    if (dict && dict[str]) {
      return dict[str];
    }

    // 2. Phrase dictionary
    return translatePhrase(str, language);
  };

  // DOM Text & Attribute Translation Engine
  useEffect(() => {
    document.documentElement.lang = language;
    if (typeof document === 'undefined') return;

    const translateSingleText = (raw: string): string => {
      const trimmed = raw.trim();
      if (!trimmed || shouldProtectText(trimmed)) return raw;

      // 1. Resolve canonical English
      const canonicalEn = getCanonicalEnglish(trimmed);

      // If target language is English, return the canonical English representation
      if (language === 'en') {
        return raw.replace(trimmed, canonicalEn);
      }

      const phraseMap = PHRASE_TRANSLATIONS[language];
      if (!phraseMap) return raw;

      // 2. Exact match in target language
      if (phraseMap[canonicalEn]) {
        return raw.replace(trimmed, phraseMap[canonicalEn]);
      }
      if (phraseMap[trimmed]) {
        return raw.replace(trimmed, phraseMap[trimmed]);
      }

      // 3. Case-insensitive lookup
      const lower = canonicalEn.toLowerCase();
      for (const [k, v] of Object.entries(phraseMap)) {
        if (k.toLowerCase() === lower) {
          return raw.replace(trimmed, v);
        }
      }

      // 4. Prefix-based lookup for labels with dynamic numeric/currency values
      for (const [prefix, trans] of Object.entries(UI_PREFIX_MAP)) {
        // Check if trimmed starts with English prefix
        if (trimmed.startsWith(prefix)) {
          const suffix = trimmed.substring(prefix.length);
          const translatedPrefix = trans[language];
          return raw.replace(trimmed, `${translatedPrefix}${suffix}`);
        }
        // Check if trimmed starts with Telugu/Hindi prefix (from previous translation)
        const currentPrefix = trans.te === prefix ? trans.te : (trans.hi === prefix ? trans.hi : null);
        if (currentPrefix && trimmed.startsWith(currentPrefix)) {
          const suffix = trimmed.substring(currentPrefix.length);
          const targetPrefix = trans[language];
          return raw.replace(trimmed, `${targetPrefix}${suffix}`);
        }
      }

      return raw;
    };

    const translateNodes = (root: Node) => {
      if (!root) return;

      // 1. TreeWalker for visible Text nodes
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            const parent = node.parentElement;
            if (!parent || isProtectedElement(parent)) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      let currentNode = walker.nextNode();
      while (currentNode) {
        const raw = currentNode.nodeValue || '';
        const trimmed = raw.trim();

        if (trimmed && !shouldProtectText(trimmed)) {
          let newRaw = '';
          if (language === 'en') {
            const canonical = getCanonicalEnglish(trimmed);
            originalTextNodes.current.set(currentNode, canonical);
            newRaw = raw.replace(trimmed, canonical);
          } else {
            if (!originalTextNodes.current.has(currentNode)) {
              const canonical = getCanonicalEnglish(trimmed);
              originalTextNodes.current.set(currentNode, canonical);
            }
            newRaw = translateSingleText(raw);
          }

          if (newRaw && newRaw !== raw && currentNode.nodeValue !== newRaw) {
            currentNode.nodeValue = newRaw;
          }
        }
        currentNode = walker.nextNode();
      }

      // 2. Form Inputs & Textareas Placeholders
      if ((root as Element).querySelectorAll) {
        const inputs = (root as Element).querySelectorAll('input, textarea');
        inputs.forEach((el: any) => {
          if (isProtectedElement(el)) return;
          const ph = el.placeholder;
          if (ph) {
            if (!el.getAttribute('data-canonical-placeholder')) {
              el.setAttribute('data-canonical-placeholder', getCanonicalEnglish(ph));
            }
            const canonical = el.getAttribute('data-canonical-placeholder') || ph;
            const trPh = language === 'en' ? canonical : translatePhrase(canonical, language);
            if (trPh && el.placeholder !== trPh) {
              el.placeholder = trPh;
            }
          }
        });

        // 3. Select Dropdown Options
        const options = (root as Element).querySelectorAll('option');
        options.forEach((opt: any) => {
          if (isProtectedElement(opt)) return;
          const text = opt.text;
          if (text) {
            if (!opt.getAttribute('data-canonical-text')) {
              opt.setAttribute('data-canonical-text', getCanonicalEnglish(text));
            }
            const canonical = opt.getAttribute('data-canonical-text') || text;
            const trText = language === 'en' ? canonical : translatePhrase(canonical, language);
            if (trText && opt.text !== trText) {
              opt.text = trText;
            }
          }
        });
      }
    };

    // Synchronously execute full translation on body
    isTranslatingRef.current = true;
    try {
      translateNodes(document.body);
    } finally {
      isTranslatingRef.current = false;
    }

    // MutationObserver to translate any dynamically mounted components / route changes
    let debounceTimer: any = null;
    const observer = new MutationObserver(() => {
      if (isTranslatingRef.current) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (isTranslatingRef.current) return;
        isTranslatingRef.current = true;
        try {
          translateNodes(document.body);
        } finally {
          isTranslatingRef.current = false;
        }
      }, 30);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    return () => {
      observer.disconnect();
      clearTimeout(debounceTimer);
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
