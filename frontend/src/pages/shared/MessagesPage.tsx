import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { 
  MessageSquare, Send, ShieldCheck, User, Clock, CheckCheck, 
  RefreshCw, Sprout, Building2, AlertCircle, Info, Sparkles 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/dateUtils';

interface MessageItem {
  id: number;
  adminId: number;
  userId: number;
  conversationId: string;
  senderId: number;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: string;
  readStatus: boolean;
}

interface MessagesPageProps {
  portalType: 'farmer' | 'buyer';
}

export const MessagesPage: React.FC<MessagesPageProps> = ({ portalType }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const convIdFromUrl = searchParams.get('conversation_id');

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<any>(null);

  const fetchMessages = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const url = convIdFromUrl
        ? `/api/communication/messages?conversation_id=${encodeURIComponent(convIdFromUrl)}`
        : '/api/communication/messages';
      const res = await axios.get(url);
      if (Array.isArray(res.data)) {
        setMessages(res.data);
      }
    } catch (err: any) {
      console.error('Error loading messages:', err);
      if (!silent) {
        showToast('Failed to load messages. Please try again.', 'error');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Poll every 4 seconds for real-time incoming messages
    pollTimerRef.current = setInterval(() => {
      fetchMessages(true);
    }, 4000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Auto-scroll to bottom whenever messages list updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const res = await axios.post('/api/communication/send', {
        message: trimmed,
        conversation_id: convIdFromUrl || undefined
      });
      setInputText('');
      setMessages((prev) => [...prev, res.data]);
      showToast('Message sent to Administrator', 'success');
    } catch (err: any) {
      console.error('Error sending message:', err);
      showToast(err.response?.data?.detail || 'Could not send message. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isFarmer = portalType === 'farmer';
  const themeColor = isFarmer ? 'emerald' : 'purple';

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`p-3 rounded-xl ${isFarmer ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-purple-50 text-purple-600 border border-purple-200'}`}>
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Admin Support & Communications</h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Official Channel
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct, verified messaging line with the KisanLink Administration Desk.
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchMessages(false)}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer self-start sm:self-auto"
          title="Refresh messages"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Main Chat Box */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
        {/* Chat Top Banner */}
        <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-slate-900">
              <ShieldCheck className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">KisanLink Administrative Team</p>
              <p className="text-[11px] text-slate-300">Market Governance, KYC & Grievance Support</p>
            </div>
          </div>
          <div className="text-right flex items-center gap-2">
            {convIdFromUrl && (
              <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-md border border-slate-700 hidden sm:inline-block">
                Chat ID: {convIdFromUrl}
              </span>
            )}
            <span className="text-[11px] text-emerald-400 font-medium">● Connected</span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50">
          {loading && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
              <p className="text-xs font-medium">Loading secure communication history...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Messages Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                Have questions regarding your KYC verification, listings, lots, or fulfillment? Send a direct message to the admin team below.
              </p>
              <div className="text-[11px] bg-white border border-slate-200 text-slate-600 rounded-xl p-3 max-w-md text-left shadow-xs">
                <p className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  What can you ask the Admin?
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                  <li>Document or KYC verification updates</li>
                  <li>Produce listing approvals or quality grade queries</li>
                  <li>Trade handover, weighing, or settlement questions</li>
                </ul>
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.senderId === user?.user_id;

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    {!isMine ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-[11px] font-bold text-slate-700">Administrator</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[11px] font-bold text-slate-600">You ({m.senderName})</span>
                        {isFarmer ? (
                          <Sprout className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Building2 className="w-3 h-3 text-purple-600" />
                        )}
                      </>
                    )}
                    <span className="text-[10px] text-slate-400">
                      {formatDateTime(m.createdAt)}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] sm:max-w-md px-4 py-2.5 rounded-2xl text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words shadow-xs ${
                      isMine
                        ? isFarmer
                          ? 'bg-emerald-600 text-white rounded-br-xs'
                          : 'bg-purple-600 text-white rounded-br-xs'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                    }`}
                  >
                    {m.message}
                  </div>

                  {isMine && (
                    <div className="flex items-center gap-1 mt-0.5 px-1 text-[10px] text-slate-400">
                      {m.readStatus ? (
                        <span className="text-emerald-600 flex items-center gap-0.5">
                          <CheckCheck className="w-3 h-3" /> Read by Admin
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> Delivered
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Footer */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
          <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
            <textarea
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message to the Administrator (Press Enter to send)..."
              disabled={sending}
              className="flex-1 text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white resize-none transition"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className={`px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer whitespace-nowrap text-white ${
                !inputText.trim() || sending
                  ? 'bg-slate-300 cursor-not-allowed'
                  : isFarmer
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {sending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </>
              )}
            </button>
          </form>
          <p className="text-[10px] text-slate-400 mt-2 px-1">
            Official KisanLink correspondence. Responses from administrators will notify your account bell icon in real time.
          </p>
        </div>
      </div>
    </div>
  );
};
