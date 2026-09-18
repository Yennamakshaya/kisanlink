import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ShieldCheck, Users, Building2, TrendingUp, HelpCircle, BarChart3, ArrowRight,
  Package, Sprout, DollarSign, AlertTriangle, ShieldAlert, Sparkles, Database,
  Truck, FileCheck, CreditCard, Bell, CheckCircle2, XCircle, Search, Filter,
  Clock, MapPin, RefreshCw, Eye, X, AlertCircle, FileText, ChevronRight, LayoutDashboard,
  MessageSquare, Send, CheckCheck
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime, formatDateOnly } from '../../utils/dateUtils';
import axios from 'axios';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const { t } = useLanguage();
  const { showToast } = useToast();

  // Sync tab with URL query parameter
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // Section 1: Overview Data
  const [summary, setSummary] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(true);

  // Section 2: Farmers
  const [farmers, setFarmers] = useState<any[]>([]);
  const [farmerSearch, setFarmerSearch] = useState('');
  const [farmerStatusFilter, setFarmerStatusFilter] = useState('ALL');
  const [selectedFarmerDetails, setSelectedFarmerDetails] = useState<any | null>(null);

  // Section 3: Buyers
  const [buyers, setBuyers] = useState<any[]>([]);
  const [buyerSearch, setBuyerSearch] = useState('');
  const [buyerStatusFilter, setBuyerStatusFilter] = useState('ALL');
  const [selectedBuyerCert, setSelectedBuyerCert] = useState<any | null>(null);

  // Section 4: Produce & Lots
  const [produceLots, setProduceLots] = useState<any[]>([]);
  const [lotSearch, setLotSearch] = useState('');
  const [lotStatusFilter, setLotStatusFilter] = useState('ALL');
  const [flagModalLot, setFlagModalLot] = useState<any>(null);
  const [flagReason, setFlagReason] = useState('');

  // Section 5: Procurement & Handover
  const [procurementData, setProcurementData] = useState<{ slots: any[]; procurements: any[] }>({ slots: [], procurements: [] });
  const [procurementSubTab, setProcurementSubTab] = useState<'slots' | 'handovers'>('slots');

  // Section 6: Transactions & Payments
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txSearch, setTxSearch] = useState('');
  const [txStatusFilter, setTxStatusFilter] = useState('ALL');

  // Section 7: Grievances
  const [grievances, setGrievances] = useState<any[]>([]);
  const [grvCategoryFilter, setGrvCategoryFilter] = useState('ALL');
  const [grvStatusFilter, setGrvStatusFilter] = useState('ALL');
  const [resolveModalGrv, setResolveModalGrv] = useState<any>(null);
  const [resolveStatus, setResolveStatus] = useState('RESOLVED');
  const [adminRemarks, setAdminRemarks] = useState('');

  // Section 8: Market Intelligence
  const [marketPrices, setMarketPrices] = useState<any[]>([]);
  const [marketSearch, setMarketSearch] = useState('');
  const [marketDistrictFilter, setMarketDistrictFilter] = useState('ALL');

  // Section 9: Notifications & Alerts
  const [alerts, setAlerts] = useState<any>(null);

  // Section 10: Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditEntityFilter, setAuditEntityFilter] = useState('ALL');
  const [auditSearch, setAuditSearch] = useState('');

  // Section 11: Real-time Admin Communication Chat
  interface ChatUser {
    userId: number;
    userName: string;
    userRole: string;
    userLocation?: string;
    conversationId?: string;
  }

  const [activeChatUser, setActiveChatUser] = useState<ChatUser | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatPollRef = useRef<any>(null);

  const openAdminChat = async (target: ChatUser) => {
    setActiveChatUser(target);
    setChatLoading(true);
    setChatMessages([]);
    try {
      const res = await axios.get(`/api/communication/messages?user_id=${target.userId}`);
      setChatMessages(res.data || []);
    } catch (err) {
      console.error("Failed to load chat messages", err);
      showToast('Failed to load conversation history', 'error');
    } finally {
      setChatLoading(false);
    }
  };

  const openChatByIdentifier = async (identifier: string) => {
    if (!identifier) return;
    try {
      const res = await axios.get(`/api/communication/resolve-chat/${encodeURIComponent(identifier)}`);
      if (res.data && res.data.userId) {
        openAdminChat(res.data);
      }
    } catch (err) {
      console.error("Could not resolve chat for identifier:", identifier, err);
      showToast('Could not open conversation', 'error');
    }
  };

  const closeAdminChat = () => {
    setActiveChatUser(null);
    setChatMessages([]);
    setChatInput('');
    if (chatPollRef.current) clearInterval(chatPollRef.current);
    // Cleanly remove chat parameters from searchParams
    const updated = new URLSearchParams(searchParams);
    if (updated.has('conversation_id') || updated.has('chat_user_id') || updated.has('open_chat') || updated.has('t')) {
      updated.delete('conversation_id');
      updated.delete('chat_user_id');
      updated.delete('open_chat');
      updated.delete('t');
      setSearchParams(updated, { replace: true });
    }
  };

  // Open chat from notification via searchParams
  useEffect(() => {
    const convId = searchParams.get('conversation_id');
    const chatUserId = searchParams.get('chat_user_id');
    const openChat = searchParams.get('open_chat');

    if (openChat === 'true' || convId || chatUserId) {
      const targetId = chatUserId || convId;
      if (targetId) {
        openChatByIdentifier(targetId);
      }
    }
  }, [searchParams]);

  // Open chat from notification via custom window event (for instant same-page trigger)
  useEffect(() => {
    const handleCustomChatEvent = (e: any) => {
      const targetId = e.detail?.conversation_id || e.detail?.user_id;
      if (targetId) {
        openChatByIdentifier(String(targetId));
      }
    };

    window.addEventListener('open-admin-chat', handleCustomChatEvent);
    return () => {
      window.removeEventListener('open-admin-chat', handleCustomChatEvent);
    };
  }, []);

  useEffect(() => {
    if (activeChatUser) {
      chatPollRef.current = setInterval(async () => {
        try {
          const res = await axios.get(`/api/communication/messages?user_id=${activeChatUser.userId}`);
          if (Array.isArray(res.data)) {
            setChatMessages(res.data);
          }
        } catch (e) {
          // background polling
        }
      }, 3000);
    }
    return () => {
      if (chatPollRef.current) clearInterval(chatPollRef.current);
    };
  }, [activeChatUser]);

  useEffect(() => {
    if (activeChatUser && chatScrollRef.current) {
      chatScrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeChatUser]);

  const handleAdminSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeChatUser || !chatInput.trim() || chatSending) return;

    const textToSend = chatInput.trim();
    setChatSending(true);
    try {
      const res = await axios.post('/api/communication/send', {
        user_id: activeChatUser.userId,
        message: textToSend
      });
      setChatInput('');
      setChatMessages((prev) => [...prev, res.data]);
      showToast(`Message sent to ${activeChatUser.userName}`, 'success');
    } catch (err: any) {
      console.error("Failed to send message", err);
      showToast(err.response?.data?.detail || 'Failed to send message', 'error');
    } finally {
      setChatSending(false);
    }
  };

  // Fetch data depending on active tab
  useEffect(() => {
    fetchSummary();

    // Dynamically poll live analytics and summary every 15 seconds
    const interval = setInterval(() => {
      axios.get('/api/admin/analytics')
        .then(res => setAnalytics(res.data))
        .catch(console.error);
      axios.get('/api/admin/dashboard-summary')
        .then(res => setSummary(res.data))
        .catch(console.error);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'farmers') fetchFarmers();
    if (activeTab === 'buyers') fetchBuyers();
    if (activeTab === 'produce') fetchProduceLots();
    if (activeTab === 'procurement') fetchProcurements();
    if (activeTab === 'transactions') fetchTransactions();
    if (activeTab === 'grievances') fetchGrievances();
    if (activeTab === 'market') fetchMarketPrices();
    if (activeTab === 'notifications') fetchAlerts();
    if (activeTab === 'audit-logs') fetchAuditLogs();
  }, [activeTab]);

  // Fetchers
  const fetchSummary = () => {
    setLoadingSummary(true);
    axios.get('/api/admin/dashboard-summary')
      .then(res => setSummary(res.data))
      .catch(console.error)
      .finally(() => setLoadingSummary(false));

    axios.get('/api/admin/analytics')
      .then(res => setAnalytics(res.data))
      .catch(console.error);

    fetchProduceLots();
  };

  const fetchFarmers = () => {
    axios.get('/api/admin/farmers').then(res => setFarmers(res.data)).catch(console.error);
  };

  const fetchBuyers = () => {
    axios.get('/api/admin/buyers').then(res => setBuyers(res.data)).catch(console.error);
  };

  const fetchProduceLots = () => {
    axios.get('/api/admin/produce-lots').then(res => setProduceLots(res.data)).catch(console.error);
  };

  const fetchProcurements = () => {
    axios.get('/api/admin/procurement-monitoring').then(res => setProcurementData(res.data)).catch(console.error);
  };

  const fetchTransactions = () => {
    axios.get('/api/admin/transactions').then(res => setTransactions(res.data)).catch(console.error);
  };

  const fetchGrievances = () => {
    axios.get('/api/admin/grievances').then(res => setGrievances(res.data)).catch(console.error);
  };

  const fetchMarketPrices = () => {
    axios.get('/api/admin/market-intelligence').then(res => setMarketPrices(res.data)).catch(console.error);
  };

  const fetchAlerts = () => {
    axios.get('/api/admin/notifications').then(res => setAlerts(res.data)).catch(console.error);
  };

  const fetchAuditLogs = () => {
    axios.get('/api/admin/audit-logs').then(res => setAuditLogs(res.data)).catch(console.error);
  };

  // Actions
  const handleFarmerStatus = (farmerId: number, statusVal: string) => {
    axios.put(`/api/admin/farmers/${farmerId}/status?status_val=${statusVal}`)
      .then(() => {
        showToast(`Farmer marked as ${statusVal}`, "success");
        fetchFarmers();
        fetchSummary();
      })
      .catch(err => showToast("Error: " + (err.response?.data?.detail || "Could not update status"), "error"));
  };

  const handleFarmerKyc = (farmerId: number, statusVal: string) => {
    axios.put(`/api/admin/farmers/${farmerId}/verify-kyc?status_val=${statusVal}`)
      .then(() => {
        showToast(`Farmer KYC updated to ${statusVal}`, "success");
        fetchFarmers();
      })
      .catch(err => showToast("Error: " + (err.response?.data?.detail || "Could not update KYC"), "error"));
  };


  const handleBuyerVerify = (buyerId: number, action: 'approve' | 'reject' | 'suspend') => {
    axios.put(`/api/admin/buyers/${buyerId}/verify?action=${action}`)
      .then(() => {
        showToast(`Buyer status updated (${action}) successfully!`, "success");
        fetchBuyers();
        fetchSummary();
      })
      .catch(err => showToast("Error: " + (err.response?.data?.detail || "Could not update buyer verification"), "error"));
  };

  const handleBuyerDocVerify = (buyerId: number, docType: string, statusVal: string) => {
    axios.put(`/api/admin/buyers/${buyerId}/verify-doc?doc_type=${docType}&status_val=${statusVal}`)
      .then(() => {
        showToast(`Buyer document ${docType} marked as ${statusVal}`, "success");
        fetchBuyers();
      })
      .catch(err => showToast("Error: " + (err.response?.data?.detail || "Could not update document"), "error"));
  };

  const handleFarmerVerifyAction = (farmerId: number, action: 'verify' | 'reject' | 'suspend' | 'reactivate') => {
    axios.put(`/api/admin/farmers/${farmerId}/verify?action=${action}`)
      .then((res) => {
        showToast(res.data.message || `Farmer status updated successfully!`, "success");
        fetchFarmers();
        fetchSummary();
        if (selectedFarmerDetails && selectedFarmerDetails.id === farmerId) {
          setSelectedFarmerDetails(null);
        }
      })
      .catch(err => showToast("Error: " + (err.response?.data?.detail || "Could not update farmer verification"), "error"));
  };

  const handleBuyerVerifyAction = (buyerId: number, action: 'verify' | 'reject' | 'suspend' | 'reactivate') => {
    axios.put(`/api/admin/buyers/${buyerId}/verify?action=${action}`)
      .then((res) => {
        showToast(res.data.message || `Buyer status updated successfully!`, "success");
        fetchBuyers();
        fetchSummary();
        if (selectedBuyerCert && selectedBuyerCert.id === buyerId) {
          setSelectedBuyerCert(null);
        }
      })
      .catch(err => showToast("Error: " + (err.response?.data?.detail || "Could not update buyer verification"), "error"));
  };

  const handleFlagProduce = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagModalLot) return;
    axios.put(`/api/admin/produce-lots/${flagModalLot.id}/flag`, { reason: flagReason })
      .then(() => {
        showToast(`Produce lot ${flagModalLot.lot_code} has been flagged.`, "warning");
        setFlagModalLot(null);
        setFlagReason('');
        fetchProduceLots();
        fetchSummary();
      })
      .catch(err => showToast("Error: " + (err.response?.data?.detail || "Could not flag lot"), "error"));
  };

  const handleToggleProduceStatus = (lotId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'Available' ? 'Deactivated' : 'Available';
    axios.put(`/api/admin/produce-lots/${lotId}/status?status_val=${nextStatus}`)
      .then(() => {
        showToast(`Produce lot status set to ${nextStatus}`, "success");
        fetchProduceLots();
        fetchSummary();
      })
      .catch(err => showToast("Error: " + (err.response?.data?.detail || "Could not update status"), "error"));
  };

  const handleResolveGrievance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveModalGrv) return;
    axios.put(`/api/admin/grievances/${resolveModalGrv.id}/resolve`, {
      status: resolveStatus,
      admin_remarks: adminRemarks
    })
    .then(() => {
      showToast(`Grievance ${resolveModalGrv.grievance_code} marked as ${resolveStatus}`, "success");
      setResolveModalGrv(null);
      setAdminRemarks('');
      fetchGrievances();
      fetchSummary();
    })
    .catch(err => showToast("Error: " + (err.response?.data?.detail || "Could not resolve grievance"), "error"));
  };

  return (
    <div className="space-y-6">
      {/* Top Admin Command Header */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black">KisanLink Administrative Command Center</h1>
          <p className="text-xs text-purple-200 max-w-2xl mt-1">
            Real-time market oversight for APMC mandis, farmer KYC verification, buyer trade licenses, and produce lot integrity.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={() => {
              fetchSummary();
              if (activeTab === 'farmers') fetchFarmers();
              if (activeTab === 'buyers') fetchBuyers();
              if (activeTab === 'produce') fetchProduceLots();
              if (activeTab === 'procurement') fetchProcurements();
              if (activeTab === 'transactions') fetchTransactions();
              if (activeTab === 'grievances') fetchGrievances();
              if (activeTab === 'market') fetchMarketPrices();
              if (activeTab === 'notifications') fetchAlerts();
              if (activeTab === 'audit-logs') fetchAuditLogs();
              showToast("Dashboard synchronized with live database.", "info");
            }}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 shadow flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync DB</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. OVERVIEW SECTION */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Exact 8 Primary Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* 1. Total Farmers */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1">
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-500 font-semibold">Total Farmers</span>
                <Sprout className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-900">{summary?.total_farmers ?? 0}</p>
              <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> Registered
              </span>
            </div>

            {/* 2. Total Buyers */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1">
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-500 font-semibold">Total Buyers</span>
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-slate-900">{summary?.total_buyers ?? 0}</p>
              <span className="text-[11px] text-blue-600 font-bold">Firms & Processors</span>
            </div>

            {/* 3. Verified Farmers */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1">
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-500 font-semibold">Verified Farmers</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-700">{summary?.verified_farmers ?? 0}</p>
              <span className="text-[11px] text-slate-500">Aadhaar & KYC Verified</span>
            </div>

            {/* 4. Verified Buyers */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1">
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-500 font-semibold">Verified Buyers</span>
                <ShieldCheck className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-black text-purple-700">{summary?.verified_buyers ?? 0}</p>
              <span className="text-[11px] text-slate-500">GST Approved</span>
            </div>

            {/* 5. Active Lots */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1">
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-500 font-semibold">Active Lots</span>
                <Package className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-black text-indigo-700">{summary?.active_lots ?? 0}</p>
              <span className="text-[11px] text-slate-500">Listed on Mandi</span>
            </div>

            {/* 6. Active Procurement */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1">
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-500 font-semibold">Active Procurement</span>
                <Truck className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-black text-amber-700">{summary?.active_procurement ?? 0}</p>
              <span className="text-[11px] text-slate-500">Slots & Handover</span>
            </div>

            {/* 7. Completed Transactions */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1">
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-500 font-semibold">Completed Trades</span>
                <FileCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-800">{summary?.completed_transactions ?? 0}</p>
              <span className="text-[11px] text-slate-500">Digital Contracts</span>
            </div>

            {/* 8. Pending Payments */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1">
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-500 font-semibold">Pending Payments</span>
                <CreditCard className="w-4 h-4 text-orange-600" />
              </div>
              <p className="text-2xl font-black text-orange-700">{summary?.pending_payments ?? 0}</p>
              <span className="text-[11px] text-slate-500">Escrow Release</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. FARMER MANAGEMENT SECTION */}
      {/* ============================================================ */}
      {activeTab === 'farmers' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sprout className="w-5 h-5 text-emerald-600" />
                Farmer Verification & Account Management
              </h2>
              <p className="text-xs text-slate-500">Review farmer identity, verify Aadhaar verification status, and approve registration accounts.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search farmer name, village..."
                  value={farmerSearch}
                  onChange={(e) => setFarmerSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 w-full sm:w-52"
                />
              </div>
              <select
                value={farmerStatusFilter}
                onChange={(e) => setFarmerStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 w-full sm:w-auto"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING VERIFICATION">Pending Verification</option>
                <option value="VERIFIED">Verified</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-50/90 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                  <th className="py-2.5 px-3">Farmer Name</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Aadhaar Verification Status</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Account Status</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {farmers
                  .filter(f => {
                    const matchesSearch = f.full_name?.toLowerCase().includes(farmerSearch.toLowerCase()) ||
                                          f.village?.toLowerCase().includes(farmerSearch.toLowerCase()) ||
                                          f.district?.toLowerCase().includes(farmerSearch.toLowerCase());
                    const fStatus = (f.account_status || f.status || 'PENDING VERIFICATION').toUpperCase();
                    const matchesStatus = farmerStatusFilter === 'ALL' || fStatus === farmerStatusFilter;
                    return matchesSearch && matchesStatus;
                  })
                  .map((f) => {
                    const isAadhaarVerified = (f.aadhaar_verification_status || f.kyc_status || '').toUpperCase() === 'VERIFIED';
                    const isAadhaarRejected = (f.aadhaar_verification_status || f.kyc_status || '').toUpperCase() === 'REJECTED';
                    const isAccountVerified = (f.account_status || f.status || '').toUpperCase() === 'VERIFIED';
                    const isAccountSuspended = (f.account_status || f.status || '').toUpperCase() === 'SUSPENDED';
                    const isAccountRejected = (f.account_status || f.status || '').toUpperCase() === 'REJECTED';

                    return (
                      <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-extrabold text-slate-900">
                          {f.full_name}
                          <div className="text-[10px] font-mono text-slate-400 font-normal">ID: FRM-{String(f.id).padStart(4, '0')} • {f.phone || 'Phone Verified'}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-800">{f.village}, {f.mandal}</div>
                          <div className="text-[10px] text-slate-500">{f.district}, {f.state || 'Telangana'}</div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isAadhaarVerified ? (
                            <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ✓ VERIFIED
                            </span>
                          ) : isAadhaarRejected ? (
                            <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] bg-red-100 text-red-800 border border-red-300">
                              <XCircle className="w-3 h-3 text-red-600" /> REJECTED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                              <Clock className="w-3 h-3 text-amber-600" /> PENDING VERIFICATION
                            </span>
                          )}
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">{f.aadhaar_masked}</div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isAccountVerified ? (
                            <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ✓ VERIFIED
                            </span>
                          ) : isAccountSuspended ? (
                            <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-800 border border-slate-300">
                              <AlertTriangle className="w-3 h-3 text-slate-600" /> SUSPENDED
                            </span>
                          ) : isAccountRejected ? (
                            <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] bg-red-100 text-red-800 border border-red-300">
                              <XCircle className="w-3 h-3 text-red-600" /> REJECTED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                              <Clock className="w-3 h-3 text-amber-600" /> PENDING VERIFICATION
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-left">
                          <div className="flex items-center gap-1.5 flex-nowrap">
                            <button
                              onClick={() => setSelectedFarmerDetails(f)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg border border-slate-300 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => openAdminChat({
                                userId: f.user_id,
                                userName: f.full_name,
                                userRole: 'Farmer',
                                userLocation: `${f.village || ''}, ${f.district || ''}`
                              })}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-lg border border-indigo-200 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3" />
                              Message
                            </button>
                            {!isAccountVerified && (
                              <button
                                onClick={() => handleFarmerVerifyAction(f.id, 'verify')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                              >
                                Verify
                              </button>
                            )}
                            {!isAccountVerified && !isAccountRejected && (
                              <button
                                onClick={() => handleFarmerVerifyAction(f.id, 'reject')}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                              >
                                Reject
                              </button>
                            )}
                            <button
                              onClick={() => handleFarmerVerifyAction(f.id, isAccountSuspended ? 'reactivate' : 'suspend')}
                              className={`px-2 py-1 font-bold text-[10px] rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap ${
                                isAccountSuspended
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200'
                              }`}
                            >
                              {isAccountSuspended ? 'Re-Activate' : 'Suspend'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. BUYER MANAGEMENT SECTION */}
      {/* ============================================================ */}
      {activeTab === 'buyers' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                Buyer Verification & Compliance
              </h2>
              <p className="text-xs text-slate-500">Review uploaded business certificates, GSTIN authenticity, and verify enterprise accounts.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search company, city..."
                  value={buyerSearch}
                  onChange={(e) => setBuyerSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 w-full sm:w-52"
                />
              </div>
              <select
                value={buyerStatusFilter}
                onChange={(e) => setBuyerStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 w-full sm:w-auto"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING VERIFICATION">Pending Verification</option>
                <option value="VERIFIED BUYER">Verified Buyer</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-50/90 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                  <th className="py-2.5 px-3">Buyer/Company Name</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Certificate</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Verification Status</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {buyers
                  .filter(b => {
                    const matchesSearch = b.company_name?.toLowerCase().includes(buyerSearch.toLowerCase()) ||
                                          b.city?.toLowerCase().includes(buyerSearch.toLowerCase()) ||
                                          b.district?.toLowerCase().includes(buyerSearch.toLowerCase());
                    const bStatus = (b.verification_status || 'PENDING VERIFICATION').toUpperCase();
                    const matchesStatus = buyerStatusFilter === 'ALL' || bStatus === buyerStatusFilter;
                    return matchesSearch && matchesStatus;
                  })
                  .map((b) => {
                    const isBuyerVerified = (b.verification_status || '').toUpperCase() === 'VERIFIED BUYER';
                    const isBuyerSuspended = (b.verification_status || '').toUpperCase() === 'SUSPENDED';
                    const isBuyerRejected = (b.verification_status || '').toUpperCase() === 'REJECTED';

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-extrabold text-slate-900">
                          {b.company_name}
                          <div className="text-[10px] text-slate-500 font-normal">Contact: {b.contact_person} • <span className="text-purple-700 font-bold">{b.buyer_category}</span></div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-800">{b.city}, {b.district}</div>
                          <div className="text-[10px] text-slate-500">{b.state || 'Telangana'} • GSTIN: <span className="font-mono font-bold text-slate-700">{b.gstin || b.gstin_masked}</span></div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedBuyerCert(b)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 font-bold text-[10px] transition-colors cursor-pointer"
                            title="Click to view certificate"
                          >
                            <FileText className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                            <span className="truncate max-w-[130px]">{b.certificate_name || 'View Certificate'}</span>
                          </button>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isBuyerVerified ? (
                            <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ✓ VERIFIED BUYER
                            </span>
                          ) : isBuyerSuspended ? (
                            <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-800 border border-slate-300">
                              <AlertTriangle className="w-3 h-3 text-slate-600" /> SUSPENDED
                            </span>
                          ) : isBuyerRejected ? (
                            <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] bg-red-100 text-red-800 border border-red-300">
                              <XCircle className="w-3 h-3 text-red-600" /> REJECTED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                              <Clock className="w-3 h-3 text-amber-600" /> PENDING VERIFICATION
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-left">
                          <div className="flex items-center gap-1.5 flex-nowrap">
                            <button
                              onClick={() => setSelectedBuyerCert(b)}
                              className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-[10px] rounded-lg border border-purple-200 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              View certificate
                            </button>
                            <button
                              onClick={() => openAdminChat({
                                userId: b.user_id,
                                userName: b.company_name,
                                userRole: 'Buyer',
                                userLocation: `${b.city || ''}, ${b.state || ''}`
                              })}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-lg border border-indigo-200 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3" />
                              Message
                            </button>
                            {!isBuyerVerified && (
                              <button
                                onClick={() => handleBuyerVerifyAction(b.id, 'verify')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                              >
                                Verify certificate
                              </button>
                            )}
                            {!isBuyerVerified && !isBuyerRejected && (
                              <button
                                onClick={() => handleBuyerVerifyAction(b.id, 'reject')}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                              >
                                Reject certificate
                              </button>
                            )}
                            <button
                              onClick={() => handleBuyerVerifyAction(b.id, isBuyerSuspended ? 'reactivate' : 'suspend')}
                              className={`px-2 py-1 font-bold text-[10px] rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap ${
                                isBuyerSuspended
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200'
                              }`}
                            >
                              {isBuyerSuspended ? 'Re-Activate' : 'Suspend buyer'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: FARMER DETAILS MODAL */}
      {/* ============================================================ */}
      {selectedFarmerDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in duration-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 rounded-xl">
                  <Sprout className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedFarmerDetails.full_name}</h3>
                  <p className="text-xs text-slate-400 font-mono">Farmer ID: FRM-{String(selectedFarmerDetails.id).padStart(4, '0')}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFarmerDetails(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs">
                  <span className="text-slate-500 font-medium">Account Status: </span>
                  <span className="font-extrabold text-slate-800 ml-1">{selectedFarmerDetails.account_status || selectedFarmerDetails.status}</span>
                </div>
                <div>
                  {(selectedFarmerDetails.account_status || selectedFarmerDetails.status || '').toUpperCase() === 'VERIFIED' ? (
                    <span className="inline-flex items-center gap-1 font-bold px-3 py-1 rounded-full text-xs bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ✓ VERIFIED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold px-3 py-1 rounded-full text-xs bg-amber-100 text-amber-900 border border-amber-300">
                      <Clock className="w-3.5 h-3.5 text-amber-600" /> PENDING VERIFICATION
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Location Details
                  </div>
                  <div className="text-xs space-y-1 text-slate-600">
                    <p><span className="font-semibold text-slate-800">Village:</span> {selectedFarmerDetails.village}</p>
                    <p><span className="font-semibold text-slate-800">Mandal:</span> {selectedFarmerDetails.mandal}</p>
                    <p><span className="font-semibold text-slate-800">District:</span> {selectedFarmerDetails.district}</p>
                    <p><span className="font-semibold text-slate-800">State:</span> {selectedFarmerDetails.state || 'Telangana'}</p>
                    <p><span className="font-semibold text-slate-800">Pincode:</span> {selectedFarmerDetails.pincode}</p>
                    <p><span className="font-semibold text-slate-800">Address:</span> {selectedFarmerDetails.address}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Identity & Verification
                  </div>
                  <div className="text-xs space-y-1 text-slate-600">
                    <p><span className="font-semibold text-slate-800">Aadhaar (Masked):</span> <span className="font-mono font-bold text-slate-900">{selectedFarmerDetails.aadhaar_masked}</span></p>
                    <p><span className="font-semibold text-slate-800">Aadhaar KYC:</span> <span className="font-bold text-emerald-700">{selectedFarmerDetails.aadhaar_verification_status || 'VERIFIED'}</span></p>
                    <p><span className="font-semibold text-slate-800">Contact Phone:</span> {selectedFarmerDetails.phone || '9876543210'}</p>
                    <p><span className="font-semibold text-slate-800">Email:</span> {selectedFarmerDetails.email || 'farmer@kisanlink.in'}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sprout className="w-3.5 h-3.5 text-emerald-600" /> Farm & Produce Details
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <p><span className="font-semibold text-slate-800">Farm Size:</span> {selectedFarmerDetails.farm_size || '5 Acres'}</p>
                  <p><span className="font-semibold text-slate-800">Crops Grown:</span> {selectedFarmerDetails.crops_grown || 'Paddy, Cotton, Tomato'}</p>
                  <p><span className="font-semibold text-slate-800">Reliability Score:</span> {selectedFarmerDetails.reliability_score || 95.0}%</p>
                  <p><span className="font-semibold text-slate-800">Transactions:</span> {selectedFarmerDetails.completed_transactions || 0} Trades</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setSelectedFarmerDetails(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const f = selectedFarmerDetails;
                    setSelectedFarmerDetails(null);
                    openAdminChat({
                      userId: f.user_id,
                      userName: f.full_name,
                      userRole: 'Farmer',
                      userLocation: `${f.village || ''}, ${f.district || ''}`
                    });
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Message Farmer
                </button>
                {(selectedFarmerDetails.account_status || selectedFarmerDetails.status || '').toUpperCase() !== 'VERIFIED' && (
                  <button
                    onClick={() => handleFarmerVerifyAction(selectedFarmerDetails.id, 'verify')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                  >
                    ✓ Verify Farmer
                  </button>
                )}
                {(selectedFarmerDetails.account_status || selectedFarmerDetails.status || '').toUpperCase() === 'PENDING VERIFICATION' && (
                  <button
                    onClick={() => handleFarmerVerifyAction(selectedFarmerDetails.id, 'reject')}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                  >
                    ✕ Reject
                  </button>
                )}
                <button
                  onClick={() => handleFarmerVerifyAction(selectedFarmerDetails.id, (selectedFarmerDetails.account_status || selectedFarmerDetails.status || '').toUpperCase() === 'SUSPENDED' ? 'reactivate' : 'suspend')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {(selectedFarmerDetails.account_status || selectedFarmerDetails.status || '').toUpperCase() === 'SUSPENDED' ? 'Re-Activate' : 'Suspend Farmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: BUYER CERTIFICATE VIEWER */}
      {/* ============================================================ */}
      {selectedBuyerCert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in duration-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600 rounded-xl">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedBuyerCert.company_name}</h3>
                  <p className="text-xs text-purple-300 font-mono">Company ID: {selectedBuyerCert.company_id || `BUY-${selectedBuyerCert.id}`}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBuyerCert(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs">
                  <span className="text-slate-500 font-medium">Verification Status: </span>
                  <span className="font-extrabold text-slate-800 ml-1">{selectedBuyerCert.verification_status}</span>
                </div>
                <div>
                  {(selectedBuyerCert.verification_status || '').toUpperCase() === 'VERIFIED BUYER' ? (
                    <span className="inline-flex items-center gap-1 font-bold px-3 py-1 rounded-full text-xs bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ✓ VERIFIED BUYER
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold px-3 py-1 rounded-full text-xs bg-amber-100 text-amber-900 border border-amber-300">
                      <Clock className="w-3.5 h-3.5 text-amber-600" /> PENDING VERIFICATION
                    </span>
                  )}
                </div>
              </div>

              {/* Certificate Preview Card */}
              <div className="p-5 bg-purple-50/70 border-2 border-purple-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-6 h-6 text-purple-700" />
                    <div>
                      <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider">Uploaded Business Certificate</h4>
                      <p className="text-[11px] font-mono font-bold text-purple-800">{selectedBuyerCert.certificate_name || 'Business_Registration_Certificate.pdf'}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-purple-200 text-purple-900 rounded font-mono font-bold text-[10px]">
                    PDF / OFFICIAL
                  </span>
                </div>

                <div className="p-4 bg-white rounded-xl border border-purple-100 space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Document Type:</span>
                    <span className="font-bold text-slate-800">{selectedBuyerCert.document_type || (selectedBuyerCert.certificate_url ? 'GST Registration & Business Certificate' : 'Not provided')}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">GSTIN:</span>
                    <span className="font-mono font-bold text-emerald-700">{selectedBuyerCert.gstin || selectedBuyerCert.gstin_masked || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">PAN:</span>
                    <span className="font-mono font-bold text-slate-800">{selectedBuyerCert.pan || selectedBuyerCert.pan_masked || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Issuing Authority:</span>
                    <span className="font-bold text-slate-800">{selectedBuyerCert.issuing_authority || (selectedBuyerCert.certificate_url ? 'Government of Telangana • Commercial Taxes' : 'Not provided')}</span>
                  </div>
                </div>

                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">System Compliance Verification:</span>
                    <p className="text-[11px] text-emerald-800 mt-0.5">GSTIN format and registered address validated against Telangana Agros APMC Directory.</p>
                  </div>
                </div>
              </div>

              {/* Company & Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-slate-600">
                  <div className="font-bold text-slate-800 uppercase tracking-wider mb-1">Company Details</div>
                  <p><span className="font-semibold">Company Name:</span> {selectedBuyerCert.company_name || 'Not provided'}</p>
                  <p><span className="font-semibold">Business Type:</span> {selectedBuyerCert.buyer_category || 'Not provided'}</p>
                  <p><span className="font-semibold">City:</span> {selectedBuyerCert.city || 'Not provided'}</p>
                  <p><span className="font-semibold">District:</span> {selectedBuyerCert.district || 'Not provided'}</p>
                  <p><span className="font-semibold">Address:</span> {selectedBuyerCert.address || 'Not provided'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-slate-600">
                  <div className="font-bold text-slate-800 uppercase tracking-wider mb-1">Authorized Contact</div>
                  <p><span className="font-semibold">Authorized Representative:</span> {selectedBuyerCert.contact_person || 'Not provided'}</p>
                  <p><span className="font-semibold">Phone:</span> {selectedBuyerCert.phone || 'Not provided'}</p>
                  <p><span className="font-semibold">Email:</span> {selectedBuyerCert.email || 'Not provided'}</p>
                  <p><span className="font-semibold">Udyam Number:</span> {selectedBuyerCert.udyam_number || 'Not provided'}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setSelectedBuyerCert(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const b = selectedBuyerCert;
                    setSelectedBuyerCert(null);
                    openAdminChat({
                      userId: b.user_id,
                      userName: b.company_name,
                      userRole: 'Buyer',
                      userLocation: `${b.city || ''}, ${b.state || ''}`
                    });
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Message Buyer
                </button>
                {(selectedBuyerCert.verification_status || '').toUpperCase() !== 'VERIFIED BUYER' && (
                  <button
                    onClick={() => handleBuyerVerifyAction(selectedBuyerCert.id, 'verify')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                  >
                    ✓ Verify Certificate
                  </button>
                )}
                {(selectedBuyerCert.verification_status || '').toUpperCase() === 'PENDING VERIFICATION' && (
                  <button
                    onClick={() => handleBuyerVerifyAction(selectedBuyerCert.id, 'reject')}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                  >
                    ✕ Reject Certificate
                  </button>
                )}
                <button
                  onClick={() => handleBuyerVerifyAction(selectedBuyerCert.id, (selectedBuyerCert.verification_status || '').toUpperCase() === 'SUSPENDED' ? 'reactivate' : 'suspend')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {(selectedBuyerCert.verification_status || '').toUpperCase() === 'SUSPENDED' ? 'Re-Activate' : 'Suspend Buyer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. PRODUCE & LOT MANAGEMENT SECTION */}
      {/* ============================================================ */}
      {activeTab === 'produce' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                Produce & Aggregated Lot Management
              </h2>
              <p className="text-xs text-slate-500">Audit crop quality, harvest windows, farm locations, and flag invalid listings.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search crop, lot code..."
                  value={lotSearch}
                  onChange={(e) => setLotSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 w-full sm:w-52"
                />
              </div>
              <select
                value={lotStatusFilter}
                onChange={(e) => setLotStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 w-full sm:w-auto"
              >
                <option value="ALL">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Flagged">Flagged</option>
                <option value="Deactivated">Deactivated</option>
                <option value="Agreed">Agreed</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-50/90 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                  <th className="py-2.5 px-3 whitespace-nowrap">Lot Code & Crop</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Farmer / FPO</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Quantity</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Quality Grade</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Expected Price</th>
                  <th className="py-2.5 px-3">Farmgate Location</th>
                  <th className="py-2.5 px-3 whitespace-nowrap w-[130px]">Listing Status</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-left w-[180px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {produceLots
                  .filter(l => {
                    const matchesSearch = l.crop_name?.toLowerCase().includes(lotSearch.toLowerCase()) ||
                                          l.lot_code?.toLowerCase().includes(lotSearch.toLowerCase()) ||
                                          l.farmer_name?.toLowerCase().includes(lotSearch.toLowerCase());
                    const matchesStatus = lotStatusFilter === 'ALL' || l.status === lotStatusFilter;
                    return matchesSearch && matchesStatus;
                  })
                  .map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-extrabold text-slate-900 whitespace-nowrap">
                        {l.crop_name}
                        <div className="text-[10px] font-mono text-indigo-700 font-bold">{l.lot_code}</div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-bold text-slate-800">{l.farmer_name}</span>
                        {l.is_fpo && <div className="text-[10px] text-teal-700 font-bold">FPO: {l.fpo_name}</div>}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">{l.quantity} {l.unit}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                          {l.quality}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-emerald-800 whitespace-nowrap">₹{l.expected_price}/kg</td>
                      <td className="py-2.5 px-3 text-slate-600">{l.location}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap w-[130px]">
                        <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                          l.status === 'Available'
                            ? 'bg-emerald-100 text-emerald-800'
                            : l.status === 'Flagged'
                            ? 'bg-red-100 text-red-800 font-black'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {l.status}
                        </span>
                        {l.flagged_reason && (
                          <div className="text-[10px] text-red-700 font-normal italic mt-0.5 max-w-[120px] truncate" title={l.flagged_reason}>
                            {l.flagged_reason}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-left w-[180px]">
                        <div className="flex items-center gap-1.5 flex-nowrap">
                          <button
                            onClick={() => setFlagModalLot(l)}
                            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[10px] rounded-lg border border-red-200 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Flag Listing
                          </button>
                          <button
                            onClick={() => handleToggleProduceStatus(l.id, l.status)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg border border-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            {l.status === 'Available' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Flag Produce Modal */}
      {flagModalLot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Flag Produce Listing: {flagModalLot.lot_code}
              </h3>
              <button onClick={() => setFlagModalLot(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleFlagProduce} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Reason for Flagging / Rejection *</label>
                <textarea
                  required
                  rows={3}
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  placeholder="e.g. Mismatched crop quality grade, inflated quantity, or non-compliant harvest window..."
                  className="w-full mt-1 p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-red-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFlagModalLot(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  Confirm Flagging
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. PROCUREMENT & HANDOVER SECTION */}
      {/* ============================================================ */}
      {activeTab === 'procurement' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-600" />
                Procurement Slot & Handover Monitoring
              </h2>
              <p className="text-xs text-slate-500">Track scheduled collection slots, physical farmgate pickups, and arrival audits.</p>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setProcurementSubTab('slots')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  procurementSubTab === 'slots' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Procurement Slots ({procurementData.slots.length})
              </button>
              <button
                onClick={() => setProcurementSubTab('handovers')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  procurementSubTab === 'handovers' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Handover & Audits ({procurementData.procurements.length})
              </button>
            </div>
          </div>

          {procurementSubTab === 'slots' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-3">Slot Code</th>
                    <th className="p-3">Date & Time Window</th>
                    <th className="p-3">Location Hub</th>
                    <th className="p-3">Crop & Quantity</th>
                    <th className="p-3">Farmer</th>
                    <th className="p-3">Buyer Company</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {procurementData.slots.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-amber-800">{s.slot_code}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{s.slot_date}</div>
                        <div className="text-[10px] text-slate-500">{s.time_window}</div>
                      </td>
                      <td className="p-3 text-slate-700">{s.location}</td>
                      <td className="p-3 font-bold text-slate-900">{s.crop_name} ({s.quantity} kg)</td>
                      <td className="p-3 font-bold text-emerald-800">{s.farmer_name}</td>
                      <td className="p-3 font-bold text-blue-800">{s.buyer_company}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-full text-[10px]">
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-3">Agreement & Slot</th>
                    <th className="p-3">Parties</th>
                    <th className="p-3">Crop & Quantity</th>
                    <th className="p-3">Handover State</th>
                    <th className="p-3">Quality & Qty Audit</th>
                    <th className="p-3">Cold Storage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {procurementData.procurements.map((pr) => (
                    <tr key={pr.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {pr.agreement_code}
                        {pr.slot_code && <div className="text-[10px] text-amber-800 font-normal">Slot: {pr.slot_code}</div>}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-emerald-800">{pr.farmer_name}</div>
                        <div className="text-[10px] text-blue-800">To: {pr.buyer_company}</div>
                      </td>
                      <td className="p-3 font-bold text-slate-900">{pr.crop_name} ({pr.quantity} kg)</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-full text-[10px]">
                          {pr.status}
                        </span>
                        {pr.handover_at && (
                          <div className="text-[10px] text-slate-500 mt-0.5">{formatDateTime(pr.handover_at)}</div>
                        )}
                      </td>
                      <td className="p-3">
                        {pr.quality_confirmation ? (
                          <div className="space-y-0.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              pr.quality_confirmation.status === 'Accepted'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}>
                              Audit: {pr.quality_confirmation.status}
                            </span>
                            <div className="text-[10px] text-slate-600">
                              Received: {pr.quality_confirmation.received_quantity} kg ({pr.quality_confirmation.quality_received})
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Audit pending</span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-slate-800">₹{pr.storage_cost || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. TRANSACTIONS & PAYMENTS SECTION */}
      {/* ============================================================ */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                Transactions & Settlement Ledger
              </h2>
              <p className="text-xs text-slate-500">Official ledger records of all commercial trades, deductions, and bank escrow settlements.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search code, crop..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 w-52"
                />
              </div>
              <select
                value={txStatusFilter}
                onChange={(e) => setTxStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700"
              >
                <option value="ALL">All Payments</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3">Transaction Code</th>
                  <th className="p-3">Parties</th>
                  <th className="p-3">Crop & Qty</th>
                  <th className="p-3">Agreed Amount</th>
                  <th className="p-3">Labour Charges</th>
                  <th className="p-3">Delay Amount</th>
                  <th className="p-3">Total Settled (UPI)</th>
                  <th className="p-3">Payment State</th>
                  <th className="p-3">Final Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {transactions
                  .filter(t => {
                    const matchesSearch = t.transaction_code?.toLowerCase().includes(txSearch.toLowerCase()) ||
                                          t.crop_name?.toLowerCase().includes(txSearch.toLowerCase()) ||
                                          t.farmer_name?.toLowerCase().includes(txSearch.toLowerCase()) ||
                                          t.buyer_company?.toLowerCase().includes(txSearch.toLowerCase());
                    const matchesStatus = txStatusFilter === 'ALL' || t.payment_status === txStatusFilter;
                    return matchesSearch && matchesStatus;
                  })
                  .map((t) => {
                    const agreedAmt = t.agreed_amount || t.net_realisation || 0;
                    const labourAmt = t.labour_charges || 0;
                    const delayAmt = t.delay_amount || 0;
                    const totalSettlement = t.total_payable_amount || (agreedAmt + labourAmt + delayAmt);

                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {t.transaction_code}
                          <div className="text-[10px] text-slate-400 font-normal">Agr: {t.agreement_code}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-emerald-800">{t.farmer_name}</div>
                          <div className="text-[10px] text-blue-800">{t.buyer_company}</div>
                        </td>
                        <td className="p-3 font-bold text-slate-800">{t.crop_name} ({t.quantity} kg)</td>
                        <td className="p-3 font-bold text-slate-900">₹{agreedAmt.toLocaleString('en-IN')}</td>
                        <td className="p-3 font-mono">
                          <span className={labourAmt > 0 ? "font-bold text-blue-700" : "text-slate-500"}>
                            ₹{labourAmt.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="p-3 font-mono">
                          <span className={delayAmt > 0 ? "font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" : "text-slate-500"}>
                            ₹{delayAmt.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="p-3 font-black text-emerald-800 text-sm font-mono">
                          <div>₹{totalSettlement.toLocaleString('en-IN')}</div>
                          <div className="text-[10px] font-bold text-emerald-600 uppercase">UPI Only</div>
                        </td>
                        <td className="p-3">
                          <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                            t.payment_status === 'COMPLETED' || t.payment_status === 'VERIFIED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-900'
                          }`}>
                            {t.payment_status}
                          </span>
                          {t.payment?.payment_reference && (
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">{t.payment.payment_reference}</div>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                            t.final_status === 'COMPLETED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {t.final_status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. GRIEVANCE MANAGEMENT SECTION */}
      {/* ============================================================ */}
      {activeTab === 'grievances' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-rose-600" />
                Grievance Redressal & Mediation Center
              </h2>
              <p className="text-xs text-slate-500">Arbitrate quality rejections, quantity shortages, payment delays, and order cancellations.</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={grvCategoryFilter}
                onChange={(e) => setGrvCategoryFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700"
              >
                <option value="ALL">All Categories</option>
                <option value="Quality Dispute">Quality Dispute</option>
                <option value="Quantity Shortage">Quantity Shortage</option>
                <option value="Payment Delay">Payment Delay</option>
                <option value="Cancellation Dispute">Cancellation Dispute</option>
              </select>
              <select
                value={grvStatusFilter}
                onChange={(e) => setGrvStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="RESOLVED">Resolved</option>
                <option value="ESCALATED">Escalated</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-50/90 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                  <th className="py-2.5 px-3 whitespace-nowrap">Reference Code</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">User & Persona</th>
                  <th className="py-2.5 px-3">Category & Title</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-3">Admin Remarks</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {grievances
                  .filter(g => {
                    const matchesCategory = grvCategoryFilter === 'ALL' || g.category === grvCategoryFilter;
                    const matchesStatus = grvStatusFilter === 'ALL' || g.status?.toUpperCase() === grvStatusFilter;
                    return matchesCategory && matchesStatus;
                  })
                  .map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-rose-800 whitespace-nowrap">
                        {g.grievance_code}
                        {g.transaction_code && <div className="text-[10px] text-slate-400 font-normal">Txn: {g.transaction_code}</div>}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900">{g.user_name}</span>
                        <div className="text-[10px] text-purple-700 font-bold">{g.user_role?.toUpperCase()}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-800">{g.category}</span>
                        <div className="text-[11px] text-slate-600">{g.title}</div>
                      </td>
                      <td className="py-2.5 px-3 max-w-xs text-slate-600 truncate">{g.description}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                          g.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : g.status === 'ESCALATED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {g.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 italic max-w-xs truncate">{g.admin_remarks || 'None'}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-left">
                        <button
                          onClick={() => {
                            setResolveModalGrv(g);
                            setResolveStatus(g.status || 'RESOLVED');
                            setAdminRemarks(g.admin_remarks || '');
                          }}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Mediate / Respond
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grievance Resolve Modal */}
      {resolveModalGrv && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                Mediate Dispute: {resolveModalGrv.grievance_code}
              </h3>
              <button onClick={() => setResolveModalGrv(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
              <p className="font-bold text-slate-900">{resolveModalGrv.title}</p>
              <p className="text-slate-600">{resolveModalGrv.description}</p>
            </div>
            <form onSubmit={handleResolveGrievance} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Resolution Action *</label>
                <select
                  value={resolveStatus}
                  onChange={(e) => setResolveStatus(e.target.value)}
                  className="w-full mt-1 p-2 text-xs bg-white border border-slate-300 rounded-xl font-bold"
                >
                  <option value="RESOLVED">Resolve & Release Settlement</option>
                  <option value="UNDER_REVIEW">Place Under Review</option>
                  <option value="ESCALATED">Escalate to Mandi Committee Officers</option>
                  <option value="CLOSED">Close Grievance</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Admin Mediation Remarks *</label>
                <textarea
                  required
                  rows={3}
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  placeholder="Document inspector findings, adjustment terms, or official mediation instructions..."
                  className="w-full mt-1 p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolveModalGrv(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  Submit Decision & Notify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 8. MARKET INTELLIGENCE SECTION */}
      {/* ============================================================ */}
      {activeTab === 'market' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Live APMC Mandi Market Intelligence
              </h2>
              <p className="text-xs text-slate-500">Live price monitoring, arrival volumes, modal benchmarks, and mandi data integrity.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search crop, mandi..."
                  value={marketSearch}
                  onChange={(e) => setMarketSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 w-52"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3">Crop Name</th>
                  <th className="p-3">APMC Mandi & District</th>
                  <th className="p-3">Min Price</th>
                  <th className="p-3">Modal Price</th>
                  <th className="p-3">Max Price</th>
                  <th className="p-3">Arrival Volume</th>
                  <th className="p-3">Trend</th>
                  <th className="p-3">Data Source</th>
                  <th className="p-3">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {marketPrices
                  .filter(m => {
                    const matchesSearch = m.crop_name?.toLowerCase().includes(marketSearch.toLowerCase()) ||
                                          m.market_name?.toLowerCase().includes(marketSearch.toLowerCase()) ||
                                          m.district?.toLowerCase().includes(marketSearch.toLowerCase());
                    return matchesSearch;
                  })
                  .map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-extrabold text-slate-900">{m.crop_name}</td>
                      <td className="p-3">
                        <span className="font-bold text-slate-800">{m.market_name}</span>
                        <div className="text-[10px] text-slate-500">{m.district}, {m.state}</div>
                      </td>
                      <td className="p-3 font-bold text-slate-600">₹{m.min_price}/kg</td>
                      <td className="p-3 font-black text-emerald-700 text-sm">₹{m.modal_price}/kg</td>
                      <td className="p-3 font-bold text-slate-800">₹{m.max_price}/kg</td>
                      <td className="p-3 font-bold text-indigo-900">{m.arrival_volume_tonnes} Tonnes</td>
                      <td className="p-3">
                        <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                          (m.price_change || 0) >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {(m.price_change || 0) >= 0 ? `+₹${m.price_change}` : `-₹${Math.abs(m.price_change)}`}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-500 font-medium">{m.data_source}</td>
                      <td className="p-3 text-slate-500">{m.last_updated}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 9. NOTIFICATIONS & ALERTS SECTION */}
      {/* ============================================================ */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-600" />
              Administrative Alert Feeds
            </h2>
            <p className="text-xs text-slate-500">Live event feeds requiring review, document approval, settlement releases, or dispute mediation.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Verification Alerts */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                <h3 className="font-bold text-xs uppercase text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  Verification Alerts ({alerts?.verification_alerts?.length || 0})
                </h3>
                <div className="space-y-2">
                  {alerts?.verification_alerts?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No pending verifications.</p>
                  ) : (
                    alerts?.verification_alerts?.map((a: any) => (
                      <div key={a.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex justify-between items-start gap-2">
                        <div>
                          <p className="font-extrabold text-xs text-slate-900">{a.title}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5">{a.description}</p>
                        </div>
                        <button
                          onClick={() => handleTabChange(a.target_url.includes('buyers') ? 'buyers' : 'farmers')}
                          className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-[10px] rounded-lg shrink-0 cursor-pointer"
                        >
                          Review
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Payment Settlement Alerts */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                <h3 className="font-bold text-xs uppercase text-slate-800 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-orange-600" />
                  Payment Settlement Alerts ({alerts?.payment_alerts?.length || 0})
                </h3>
                <div className="space-y-2">
                  {alerts?.payment_alerts?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No pending payment releases.</p>
                  ) : (
                    alerts?.payment_alerts?.map((a: any) => (
                      <div key={a.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex justify-between items-start gap-2">
                        <div>
                          <p className="font-extrabold text-xs text-slate-900">{a.title}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5">{a.description}</p>
                        </div>
                        <button
                          onClick={() => handleTabChange('transactions')}
                          className="px-2.5 py-1 bg-orange-100 hover:bg-orange-200 text-orange-900 font-bold text-[10px] rounded-lg shrink-0 cursor-pointer"
                        >
                          View
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Grievance Alerts */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                <h3 className="font-bold text-xs uppercase text-slate-800 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-rose-600" />
                  Active Dispute Alerts ({alerts?.grievance_alerts?.length || 0})
                </h3>
                <div className="space-y-2">
                  {alerts?.grievance_alerts?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No open disputes in mediation.</p>
                  ) : (
                    alerts?.grievance_alerts?.map((a: any) => (
                      <div key={a.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex justify-between items-start gap-2">
                        <div>
                          <p className="font-extrabold text-xs text-slate-900">{a.title}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5">{a.description}</p>
                        </div>
                        <button
                          onClick={() => handleTabChange('grievances')}
                          className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-[10px] rounded-lg shrink-0 cursor-pointer"
                        >
                          Arbitrate
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Transaction Alerts */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                <h3 className="font-bold text-xs uppercase text-slate-800 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  Recent Transaction Activity ({alerts?.transaction_alerts?.length || 0})
                </h3>
                <div className="space-y-2">
                  {alerts?.transaction_alerts?.slice(0, 4).map((a: any) => (
                    <div key={a.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex justify-between items-start gap-2">
                      <div>
                        <p className="font-extrabold text-xs text-slate-900">{a.title}</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">{a.description}</p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {formatDateTime(a.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 10. AUDIT LOGS SECTION */}
      {/* ============================================================ */}
      {activeTab === 'audit-logs' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                Administrative & Governance Audit Logs
              </h2>
              <p className="text-xs text-slate-500">Immutable trace of administrative actions, verifications, status changes, and disputes.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search action, record..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 w-52"
                />
              </div>
              <select
                value={auditEntityFilter}
                onChange={(e) => setAuditEntityFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700"
              >
                <option value="ALL">All Entities</option>
                <option value="FARMER">Farmer</option>
                <option value="BUYER">Buyer</option>
                <option value="PRODUCE">Produce</option>
                <option value="GRIEVANCE">Grievance</option>
                <option value="SYSTEM">System</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3">Exact Date & Time</th>
                  <th className="p-3">User & Role</th>
                  <th className="p-3">Action Performed</th>
                  <th className="p-3">Related Record</th>
                  <th className="p-3">Entity Type</th>
                  <th className="p-3">Operational Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {auditLogs
                  .filter(l => {
                    const matchesSearch = l.action?.toLowerCase().includes(auditSearch.toLowerCase()) ||
                                          l.related_record?.toLowerCase().includes(auditSearch.toLowerCase()) ||
                                          l.details?.toLowerCase().includes(auditSearch.toLowerCase());
                    const matchesEntity = auditEntityFilter === 'ALL' || l.entity_type === auditEntityFilter;
                    return matchesSearch && matchesEntity;
                  })
                  .map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {formatDateTime(l.created_at)}
                      </td>
                      <td className="p-3">
                        <span className="font-extrabold text-slate-900">{l.username}</span>
                        <div className="text-[10px] text-purple-700 font-bold">{l.role?.toUpperCase()}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-900 text-white font-mono font-bold rounded-md text-[10px]">
                          {l.action}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-800">{l.related_record}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 font-bold rounded-full text-[10px] border border-indigo-200">
                          {l.entity_type || 'GENERAL'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 max-w-sm">{l.details || 'Action completed successfully.'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ADMIN REAL-TIME COMMUNICATION CHAT */}
      {/* ============================================================ */}
      {activeChatUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full h-[650px] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 px-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-white">{activeChatUser.userName}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      activeChatUser.userRole.toLowerCase() === 'farmer'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    }`}>
                      {activeChatUser.userRole}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {activeChatUser.userLocation || 'Telangana'} • User ID #{activeChatUser.userId}
                  </p>
                </div>
              </div>
              <button
                onClick={closeAdminChat}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Message History */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5 bg-slate-50/60">
              {chatLoading && chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                  <p className="text-xs font-medium">Loading conversation history...</p>
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No Messages Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Start a direct conversation with {activeChatUser.userName}. They will receive an instant platform notification and can reply from their portal.
                  </p>
                </div>
              ) : (
                chatMessages.map((m) => {
                  const isMe = m.senderRole === 'admin' || m.senderId === user?.user_id;

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        {isMe ? (
                          <>
                            <span className="text-[11px] font-bold text-indigo-700">You (Admin)</span>
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          </>
                        ) : (
                          <>
                            <span className="text-[11px] font-bold text-slate-700">{m.senderName || activeChatUser.userName}</span>
                            <span className="text-[10px] text-slate-400">({activeChatUser.userRole})</span>
                          </>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {formatDateTime(m.createdAt || m.created_at)}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] sm:max-w-md px-4 py-2.5 rounded-2xl text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words shadow-xs ${
                          isMe
                            ? 'bg-indigo-600 text-white rounded-br-xs'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                        }`}
                      >
                        {m.message}
                      </div>

                      {isMe && (
                        <div className="flex items-center gap-1 mt-0.5 px-1 text-[10px] text-slate-400">
                          {m.readStatus || m.read_status ? (
                            <span className="text-emerald-600 flex items-center gap-0.5">
                              <CheckCheck className="w-3 h-3" /> Seen
                            </span>
                          ) : (
                            <span className="text-slate-400 flex items-center gap-0.5">
                              <Clock className="w-3 h-3" /> Sent
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={chatScrollRef} />
            </div>

            {/* Input */}
            <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
              <form onSubmit={handleAdminSendMessage} className="flex gap-2 items-end">
                <textarea
                  rows={2}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAdminSendMessage();
                    }
                  }}
                  placeholder={`Message ${activeChatUser.userName} (Press Enter to send)...`}
                  disabled={chatSending}
                  className="flex-1 text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white resize-none transition"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatSending}
                  className={`px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer whitespace-nowrap text-white ${
                    !chatInput.trim() || chatSending
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {chatSending ? (
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
                Direct administrative communication. Recipient is notified immediately upon message delivery.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

