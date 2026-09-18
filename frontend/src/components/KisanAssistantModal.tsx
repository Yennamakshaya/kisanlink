import React, { useState, useEffect } from 'react';
import { X, Bot, Send, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { VoiceInput } from './VoiceInput';
import axios from 'axios';

interface Message {
  sender: 'user' | 'bot';
  text: string;
  intent?: string;
  label?: string;
}

interface KisanAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KisanAssistantModal: React.FC<KisanAssistantModalProps> = ({ isOpen, onClose }) => {
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMessages([
      {
        sender: 'bot',
        text: t('kisanWelcome'),
        label: t('kisanAssistantTitle')
      }
    ]);
  }, [language]);

  if (!isOpen) return null;

  const quickPrompts = [
    t('promptTomato'),
    t('promptBuyer'),
    t('How to control Pink Bollworm in Cotton?'),
    t('How do digital agreements work?'),
    t('promptNetIncome'),
    t('promptAddCrop')
  ];

  const handleSend = (queryToSend?: string) => {
    const text = queryToSend || inputQuery;
    if (!text.trim()) return;

    const userMsg: Message = { sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    if (!queryToSend) setInputQuery('');
    setLoading(true);

    axios.post('/api/assistant/query', {
      query: text,
      language: language
    })
    .then(res => {
      const botMsg: Message = {
        sender: 'bot',
        text: res.data.answer,
        intent: res.data.intent,
        label: res.data.label || t('kisanAssistantTitle')
      };
      setMessages(prev => [...prev, botMsg]);
    })
    .catch(() => {
      const errorMsg: Message = {
        sender: 'bot',
        text: language === 'te' 
          ? "క్షమించండి, ప్రస్తుతం మీ అభ్యర్థనను ప్రాసెస్ చేయడం సాధ్యం కాలేదు. దయచేసి మళ్లీ ప్రయత్నించండి."
          : language === 'hi'
          ? "क्षमा करें, वर्तमान में आपके अनुरोध को संसाधित करने में असमर्थ हूँ। कृपया पुनः प्रयास करें।"
          : "Sorry, I am currently unable to process your request. Please try again.",
        label: t('kisanAssistantTitle')
      };
      setMessages(prev => [...prev, errorMsg]);
    })
    .finally(() => setLoading(false));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[560px] border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-900 text-white p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-2.5">
            <div className="bg-amber-400 p-2 rounded-xl text-emerald-950 shadow">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-1.5">
                {t('kisanAssistantTitle')}
                <span className="text-[10px] bg-emerald-800 text-emerald-200 font-semibold px-2 py-0.5 rounded-full border border-emerald-600">
                  {t('Online')}
                </span>
              </h3>
              <p className="text-[11px] text-emerald-200">{t('kisanAssistantSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  m.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                {m.label && m.sender === 'bot' && (
                  <span className="inline-block text-[10px] text-amber-700 bg-amber-50 font-bold px-1.5 py-0.5 rounded border border-amber-200/80 mt-1.5">
                    {m.label}
                  </span>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white text-slate-500 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                <span>{t('kisanThinking')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestions */}
        <div className="p-2 bg-white border-t border-slate-100 flex items-center space-x-1.5 overflow-x-auto">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full whitespace-nowrap border border-emerald-200 transition-colors cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Footer Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
          <VoiceInput onResult={(txt) => setInputQuery(txt)} />
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('kisanInputPlaceholder')}
            className="flex-1 text-sm bg-slate-100 text-slate-800 rounded-xl px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputQuery.trim()}
            className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
