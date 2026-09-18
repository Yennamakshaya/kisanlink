import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { 
  ArrowLeftRight, CheckCircle2, XCircle, Send, MessageSquare, Sparkles, 
  Building2, User as UserIcon, TrendingUp, Truck, Shield, AlertCircle, ArrowRight, 
  RefreshCw, Clock, Inbox, Check, FileText, Calendar, MapPin, Tag
} from 'lucide-react';
import axios from 'axios';
import { formatDateTime } from '../../utils/dateUtils';

export const NegotiationsPage: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetOfferId = searchParams.get('offer_id');
  const targetTab = searchParams.get('tab');
  const isRequestsRoute = location.pathname.includes('/requests') || location.pathname.includes('/incoming-requests');

  // Active Tab state: 'negotiations' or 'requests'
  const [activeTab, setActiveTab] = useState<'negotiations' | 'requests'>(
    targetTab === 'requests' || isRequestsRoute ? 'requests' : 'negotiations'
  );

  // Data states
  const [offers, setOffers] = useState<any[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Counter offer form state (for active negotiations)
  const [counterPrice, setCounterPrice] = useState<number>(31);
  const [counterQty, setCounterQty] = useState<number>(500);
  const [counterMsg, setCounterMsg] = useState('');
  const [counterPaymentTerms, setCounterPaymentTerms] = useState<string>('Within 3 Days');
  const [counterCustomPayment, setCounterCustomPayment] = useState<string>('');
  const [counterColdStorage, setCounterColdStorage] = useState<boolean>(false);
  const [counterStorageDuration, setCounterStorageDuration] = useState<string>('7 Days');
  const [counterStorageCost, setCounterStorageCost] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCounterForm, setShowCounterForm] = useState<boolean>(false);

  // Buyer response form state (for pending farmer requests)
  const [buyerOfferPrice, setBuyerOfferPrice] = useState<number>(30);
  const [buyerOfferQty, setBuyerOfferQty] = useState<number>(500);
  const [buyerOfferQuality, setBuyerOfferQuality] = useState<string>('Grade A');
  const [buyerOfferPickupDate, setBuyerOfferPickupDate] = useState<string>('');
  const [buyerOfferLocation, setBuyerOfferLocation] = useState<string>('');
  const [buyerOfferPaymentTerms, setBuyerOfferPaymentTerms] = useState<string>('Within 3 Days');
  const [buyerOfferCustomPayment, setBuyerOfferCustomPayment] = useState<string>('');
  const [buyerOfferColdStorage, setBuyerOfferColdStorage] = useState<boolean>(false);
  const [buyerOfferStorageDuration, setBuyerOfferStorageDuration] = useState<string>('7 Days');
  const [buyerOfferStorageCost, setBuyerOfferStorageCost] = useState<number>(0);
  const [buyerOfferNotes, setBuyerOfferNotes] = useState<string>('');
  const [requestErrorMsg, setRequestErrorMsg] = useState<string | null>(null);
  const [showCustomOfferForm, setShowCustomOfferForm] = useState<boolean>(false);

  const isFarmer = user?.role === 'farmer';
  const isBuyer = user?.role === 'buyer';
  const selectedOfferIdRef = useRef<number | null>(null);
  const selectedRequestIdRef = useRef<number | null>(null);
  const hasAutoSwitchedTabRef = useRef<boolean>(false);

  // Synchronize targetTab query param or route
  useEffect(() => {
    if (targetTab === 'requests' || isRequestsRoute) {
      setActiveTab('requests');
    }
  }, [targetTab, isRequestsRoute]);

  const fetchData = (selectOfferId?: number, selectReqId?: number, isBackground = false) => {
    if (!isBackground) setLoading(true);

    Promise.all([
      axios.get('/api/workflow/offers').catch(err => ({ data: [] })),
      axios.get('/api/workflow/requests').catch(err => ({ data: [] }))
    ])
    .then(([offersRes, requestsRes]) => {
      const offersData = offersRes.data || [];
      const requestsData = requestsRes.data || [];

      setOffers(offersData);
      setRequests(requestsData);

      const pendingRequests = requestsData.filter((r: any) => r.status === 'PENDING');

      // Auto-switch to requests tab if there are 0 active negotiations but incoming pending requests
      if (!hasAutoSwitchedTabRef.current && offersData.length === 0 && pendingRequests.length > 0 && !targetOfferId) {
        setActiveTab('requests');
        hasAutoSwitchedTabRef.current = true;
      }

      // Handle Offer selection
      if (offersData.length > 0) {
        const currentTargetId = selectOfferId || selectedOfferIdRef.current || (targetOfferId ? Number(targetOfferId) : null);
        let found = null;
        if (currentTargetId) {
          found = offersData.find((o: any) => o.id === currentTargetId || o.negotiation_id === `NEG-${currentTargetId.toString().padStart(4, '0')}`);
        }
        const activeOffer = found || offersData[0];
        setSelectedOffer(activeOffer);
        selectedOfferIdRef.current = activeOffer.id;
        
        if (!isBackground) {
          setCounterPrice(activeOffer.price_per_kg || 31);
          setCounterQty(activeOffer.quantity || 500);
          setCounterPaymentTerms(activeOffer.payment_terms || 'Within 3 Days');
          setCounterColdStorage(!!activeOffer.cold_storage_required);
          setCounterStorageDuration(activeOffer.storage_duration || '7 Days');
          setCounterStorageCost(activeOffer.storage_cost || 0);
        }
      } else {
        setSelectedOffer(null);
        selectedOfferIdRef.current = null;
      }

      // Handle Request selection
      if (requestsData.length > 0) {
        const currentReqId = selectReqId || selectedRequestIdRef.current;
        let foundReq = null;
        if (currentReqId) {
          foundReq = requestsData.find((r: any) => r.id === currentReqId);
        }
        const activeReq = foundReq || pendingRequests[0] || requestsData[0];
        setSelectedRequest(activeReq);
        selectedRequestIdRef.current = activeReq.id;

        if (!isBackground) {
          syncBuyerOfferForm(activeReq);
        }
      } else {
        setSelectedRequest(null);
        selectedRequestIdRef.current = null;
      }
    })
    .catch(console.error)
    .finally(() => {
      if (!isBackground) setLoading(false);
    });
  };

  const syncBuyerOfferForm = (req: any) => {
    if (!req) return;
    setBuyerOfferPrice(req.expected_price || 30);
    setBuyerOfferQty(req.quantity || 500);
    setBuyerOfferQuality(req.quality || 'Grade A');
    setBuyerOfferLocation(req.farmer_location || 'Farmer Farm Site');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    setBuyerOfferPickupDate(futureDate.toISOString().split('T')[0]);
    setBuyerOfferPaymentTerms(req.payment_terms || 'Within 3 Days');
    setBuyerOfferColdStorage(!!req.cold_storage_required);
    setBuyerOfferStorageDuration(req.storage_duration || '7 Days');
    setBuyerOfferStorageCost(req.storage_cost || 0);
    setBuyerOfferNotes('');
    setRequestErrorMsg(null);
  };

  useEffect(() => {
    fetchData();

    // Auto-poll every 4 seconds so farmer and buyer see state changes in real-time
    const pollTimer = setInterval(() => {
      fetchData(selectedOfferIdRef.current || undefined, selectedRequestIdRef.current || undefined, true);
    }, 4000);

    return () => clearInterval(pollTimer);
  }, [targetOfferId]);

  const handleSelectOffer = (offer: any) => {
    setSelectedOffer(offer);
    selectedOfferIdRef.current = offer.id;
    setCounterPrice(offer.price_per_kg);
    setCounterQty(offer.quantity);
    setCounterPaymentTerms(offer.payment_terms || 'Within 3 Days');
    setCounterColdStorage(!!offer.cold_storage_required);
    setCounterStorageDuration(offer.storage_duration || '7 Days');
    setCounterStorageCost(offer.storage_cost || 0);
    setShowCounterForm(false);
    setErrorMsg(null);
  };

  const handleSelectRequest = (req: any) => {
    setSelectedRequest(req);
    selectedRequestIdRef.current = req.id;
    syncBuyerOfferForm(req);
  };

  // Dynamic calculations for counter input in active negotiations (Transport handled by Farmer, ZERO deduction)
  const dynamicGross = Math.round(counterPrice * counterQty);
  const dynamicStorage = counterColdStorage ? (Number(counterStorageCost) || 0) : 0;
  const dynamicNet = Math.max(0, dynamicGross - dynamicStorage);
  const dynamicNetPerKg = counterQty > 0 ? (dynamicNet / counterQty).toFixed(2) : counterPrice;

  // Dynamic calculations for buyer offer on request
  const buyerGross = Math.round(buyerOfferPrice * buyerOfferQty);
  const buyerStorage = buyerOfferColdStorage ? (Number(buyerOfferStorageCost) || 0) : 0;
  const buyerNet = Math.max(0, buyerGross - buyerStorage);
  const buyerNetPerKg = buyerOfferQty > 0 ? (buyerNet / buyerOfferQty).toFixed(2) : buyerOfferPrice;

  // Counter offer submission
  const handleSendCounter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffer) return;
    if (!counterPrice || counterPrice <= 0) {
      setErrorMsg("Please enter a valid price per kg greater than ₹0.");
      return;
    }
    if (!counterQty || counterQty <= 0) {
      setErrorMsg("Please enter a valid quantity greater than 0 kg.");
      return;
    }

    const effectivePaymentTerms = counterPaymentTerms === 'Custom Payment Term'
      ? (counterCustomPayment.trim() || 'Within 3 Days')
      : counterPaymentTerms;

    setErrorMsg(null);
    setActionLoading(true);

    axios.post(`/api/workflow/offers/${selectedOffer.id}/counter`, {
      offer_id: selectedOffer.id,
      price_per_kg: Number(counterPrice),
      quantity: Number(counterQty),
      payment_terms: effectivePaymentTerms,
      cold_storage_required: counterColdStorage,
      storage_cost: counterColdStorage ? Number(counterStorageCost) : 0,
      storage_duration: counterColdStorage ? counterStorageDuration : '',
      message: counterMsg.trim() || `Counter offer: ₹${counterPrice}/kg for ${counterQty} kg (${isFarmer ? 'Farmer' : 'Buyer'}) - Terms: ${effectivePaymentTerms}`
    })
    .then(res => {
      setCounterMsg('');
      setShowCounterForm(false);
      showToast("✓ Counter-offer submitted successfully.", "success");
      fetchData(selectedOffer.id, selectedRequestIdRef.current || undefined);
    })
    .catch(err => {
      setErrorMsg(err.response?.data?.detail || "Failed to submit counter offer.");
    })
    .finally(() => setActionLoading(false));
  };

  // Buyer submits official procurement offer responding to Farmer Request
  const handleSendBuyerOfferOnRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    if (!buyerOfferPrice || buyerOfferPrice <= 0) {
      setRequestErrorMsg("Please enter a valid offered price greater than ₹0.");
      return;
    }
    if (!buyerOfferQty || buyerOfferQty <= 0) {
      setRequestErrorMsg("Please enter a valid offered quantity greater than 0 kg.");
      return;
    }

    const effectivePaymentTerms = buyerOfferPaymentTerms === 'Custom Payment Term'
      ? (buyerOfferCustomPayment.trim() || 'Within 3 Days')
      : buyerOfferPaymentTerms;

    setRequestErrorMsg(null);
    setActionLoading(true);

    axios.post(`/api/workflow/requests/${selectedRequest.id}/offer`, {
      request_id: selectedRequest.id,
      offered_price: Number(buyerOfferPrice),
      quantity: Number(buyerOfferQty),
      pickup_date: buyerOfferPickupDate,
      delivery_location: buyerOfferLocation,
      payment_terms: effectivePaymentTerms,
      cold_storage_required: buyerOfferColdStorage,
      storage_cost: buyerOfferColdStorage ? Number(buyerOfferStorageCost) : 0,
      storage_duration: buyerOfferColdStorage ? buyerOfferStorageDuration : '',
      message: buyerOfferNotes.trim() || `Official Offer: ₹${buyerOfferPrice}/kg for ${buyerOfferQty} kg ${selectedRequest.crop_name}. Terms: ${effectivePaymentTerms}`
    })
    .then(res => {
      showToast("✓ Official offer sent to farmer! Active negotiation created.", "success");
      // Switch automatically to Active Negotiations tab and select new offer
      setActiveTab('negotiations');
      const newOfferId = res.data.offer_id;
      fetchData(newOfferId, selectedRequest.id);
    })
    .catch(err => {
      setRequestErrorMsg(err.response?.data?.detail || "Failed to submit procurement offer.");
    })
    .finally(() => setActionLoading(false));
  };

  const handleDirectAcceptRequest = () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    axios.post(`/api/workflow/requests/${selectedRequest.id}/accept`)
      .then(res => {
        showToast("Request Accepted", "success");
        setActiveTab('negotiations');
        const newOfferId = res.data.offer_id;
        fetchData(newOfferId, selectedRequest.id);
      })
      .catch(err => {
        showToast("Error accepting request: " + (err.response?.data?.detail || "Please try again."), "error");
      })
      .finally(() => setActionLoading(false));
  };

  // Modals state
  const [showAcceptModal, setShowAcceptModal] = useState<boolean>(false);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [showDeclineRequestModal, setShowDeclineRequestModal] = useState<boolean>(false);

  const confirmAcceptOffer = () => {
    if (!selectedOffer) return;
    setActionLoading(true);
    setShowAcceptModal(false);
    axios.post(`/api/workflow/offers/${selectedOffer.id}/accept`)
      .then(res => {
        showToast("✓ Negotiation Accepted! Digital Commercial Agreement generated.", "success");
        if (isFarmer) {
          navigate(`/farmer/agreement/${res.data.agreement_id}`);
        } else {
          navigate('/buyer/agreements');
        }
      })
      .catch(err => {
        showToast("Error accepting offer: " + (err.response?.data?.detail || "Please try again."), "error");
      })
      .finally(() => setActionLoading(false));
  };

  const confirmRejectOffer = () => {
    if (!selectedOffer) return;
    setActionLoading(true);
    setShowRejectModal(false);
    axios.post(`/api/workflow/offers/${selectedOffer.id}/reject`)
      .then(() => {
        showToast("✓ Negotiation declined/rejected.", "info");
        fetchData(selectedOffer.id, selectedRequestIdRef.current || undefined);
      })
      .catch(err => {
        showToast("Error rejecting offer: " + (err.response?.data?.detail || "Please try again."), "error");
      })
      .finally(() => setActionLoading(false));
  };

  const confirmDeclineRequest = () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    setShowDeclineRequestModal(false);
    axios.post(`/api/workflow/requests/${selectedRequest.id}/reject`)
      .then(() => {
        showToast("Request Rejected", "info");
        fetchData(selectedOfferIdRef.current || undefined, selectedRequest.id);
      })
      .catch(err => {
        showToast("Error rejecting request: " + (err.response?.data?.detail || "Please try again."), "error");
      })
      .finally(() => setActionLoading(false));
  };

  const isOfferAccepted = selectedOffer?.status?.toUpperCase() === 'ACCEPTED';
  const isOfferRejected = selectedOffer?.status?.toUpperCase() === 'REJECTED';
  const isMyTurn = selectedOffer?.is_my_turn && !isOfferAccepted && !isOfferRejected;
  const negotiationCode = selectedOffer?.negotiation_code || (selectedOffer?.id ? `NEG-${selectedOffer.id.toString().padStart(4, '0')}` : 'NEG-0001');

  const pendingRequestsCount = requests.filter(r => r.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-emerald-600" />
            {t('priceNegotiationTitle')}
          </h1>
          <p className="text-xs text-slate-500">
            {isFarmer 
              ? t('farmerNegotiationDesc') 
              : t('buyerNegotiationDesc')}
          </p>
        </div>

        <button
          onClick={() => fetchData(selectedOffer?.id, selectedRequest?.id)}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t('refreshThread')}</span>
        </button>
      </div>

      {/* Main Grid: Left List (with Tabs), Right Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Segmented Tab Selector + Item List */}
        <div className="space-y-3">
          
          {/* Segmented Tab Navigation */}
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('negotiations')}
              className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'negotiations'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('activeNegotiations')}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'negotiations' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-200 text-slate-600'
              }`}>
                {offers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'requests'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Inbox className="w-3.5 h-3.5 text-blue-600" />
              <span>{isBuyer ? t('incomingRequests') : t('sentRequests')}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                pendingRequestsCount > 0
                  ? 'bg-amber-500 text-slate-950 font-black animate-pulse'
                  : activeTab === 'requests' ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-slate-200 text-slate-600'
              }`}>
                {requests.length}
              </span>
            </button>
          </div>

          {/* TAB 1: ACTIVE NEGOTIATIONS LIST */}
          {activeTab === 'negotiations' && (
            <>
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                  Loading negotiations...
                </div>
              ) : offers.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 space-y-3">
                  <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                    <ArrowLeftRight className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{t('noActiveNegotiations')}</p>

                  {/* If there are pending requests, suggest switching to requests tab */}
                  {requests.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left space-y-1.5">
                      <p className="text-xs font-bold text-amber-900 flex items-center gap-1">
                        <Inbox className="w-3.5 h-3.5 text-amber-600" />
                        <span>{requests.length} Procurement Request(s) available</span>
                      </p>
                      <p className="text-[11px] text-amber-800">
                        {isBuyer 
                          ? "Farmers have submitted procurement requests. Respond with an offer to start active negotiations."
                          : "You have submitted procurement requests. View their status."}
                      </p>
                      <button
                        onClick={() => setActiveTab('requests')}
                        className="w-full mt-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        View {isBuyer ? "Incoming" : "Sent"} Requests ({requests.length})
                      </button>
                    </div>
                  )}

                  {isFarmer ? (
                    <button
                      onClick={() => navigate('/farmer/buyers')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{t('goToBuyersList')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/buyer/search-farmers')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{t('searchFarmersBtn')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {offers.map(o => {
                    const isSelected = selectedOffer?.id === o.id;
                    const statusUpper = o.status?.toUpperCase();
                    let badgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
                    let statusText = o.turn_status || o.status;

                    if (statusUpper === 'ACCEPTED') {
                      badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                      statusText = t('statusAccepted');
                    } else if (statusUpper === 'REJECTED') {
                      badgeClass = 'bg-red-100 text-red-800 border-red-300';
                      statusText = t('statusRejected');
                    } else if (o.is_my_turn) {
                      badgeClass = isFarmer ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold' : 'bg-blue-100 text-blue-900 border-blue-300 font-extrabold';
                      statusText = t('statusActionRequired');
                    } else {
                      badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                      statusText = isFarmer ? t('statusWaitingBuyer') : t('statusWaitingFarmer');
                    }

                    const cardCode = o.negotiation_code || `NEG-${o.id.toString().padStart(4, '0')}`;

                    return (
                      <div
                        key={o.id}
                        onClick={() => handleSelectOffer(o)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? isFarmer
                              ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-200 shadow-sm'
                              : 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-200 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-extrabold text-sm text-slate-900">{o.crop_name}</h4>
                              <span className="font-mono text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded">
                                {cardCode}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {isFarmer ? `${t('buyerRole')}: ${o.buyer_company}` : `${t('farmerRole')}: ${o.farmer_name}`}
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                            {statusText}
                          </span>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{t('latestOffer')}</span>
                            <p className="font-black text-emerald-700">₹{o.price_per_kg}/kg</p>
                            <span className="text-[10px] text-slate-500">From: {o.latest_offer_from || (o.current_offer_by === 'farmer' ? t('farmerRole') : t('buyerRole'))}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{t('totalQuantity')}</span>
                            <p className="font-bold text-slate-800">{o.quantity} kg</p>
                            <span className="text-[10px] text-slate-400">{formatDateTime(o.updated_at || o.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* TAB 2: PROCUREMENT REQUESTS LIST */}
          {activeTab === 'requests' && (
            <>
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                  Loading requests...
                </div>
              ) : requests.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 space-y-3">
                  <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                    <Inbox className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{t('noRequestsFound')}</p>
                  {isFarmer ? (
                    <button
                      onClick={() => navigate('/farmer/buyers')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{t('goToBuyersList')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/buyer/search-farmers')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{t('searchFarmersBtn')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {requests.map(r => {
                    const isSelected = selectedRequest?.id === r.id;
                    const statusUpper = r.status?.toUpperCase();
                    let badgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold';
                    let statusLabel = 'Pending Review';

                    if (statusUpper === 'ACCEPTED') {
                      badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold';
                      statusLabel = 'Request Accepted ✓';
                    } else if (statusUpper === 'REJECTED') {
                      badgeClass = 'bg-red-100 text-red-800 border-red-300 font-bold';
                      statusLabel = 'Request Rejected';
                    }

                    return (
                      <div
                        key={r.id}
                        onClick={() => handleSelectRequest(r)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? isBuyer
                              ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-200 shadow-sm'
                              : 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-200 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-extrabold text-sm text-slate-900">{r.crop_name}</h4>
                              <span className="font-mono text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded">
                                {r.request_code}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {isBuyer ? `${t('farmerRole')}: ${r.farmer_name}` : `${t('buyerRole')}: ${r.buyer_company}`}
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                            {statusLabel}
                          </span>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{t('expectedPrice')}</span>
                            <p className="font-black text-emerald-700">₹{r.expected_price}/kg</p>
                            <span className="text-[10px] text-slate-500">{r.quality || 'Grade A'}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{t('quantity')}</span>
                            <p className="font-bold text-slate-800">{r.quantity} kg</p>
                            <span className="text-[10px] text-slate-400">{formatDateTime(r.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

        </div>

        {/* Right Column: Negotiation or Request Workspace */}
        <div className="lg:col-span-2">
          
          {/* WORKSPACE VIEW 1: ACTIVE NEGOTIATION WORKSPACE */}
          {activeTab === 'negotiations' && (
            <>
              {selectedOffer ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
                  
                  {/* Header: Key Negotiation Information Bar */}
                  <div className="border-b border-slate-100 pb-4 space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <span className="text-[11px] bg-slate-900 text-white font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {t('negotiationId')}: {negotiationCode}
                        </span>
                        <h2 className="text-xl font-black text-slate-900 mt-1">
                          {t('priceNegotiationTitle')}: {selectedOffer.crop_name} ({selectedOffer.quantity} kg)
                        </h2>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                          isOfferAccepted 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                            : isOfferRejected
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : isMyTurn
                            ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          {t('status')}: {isOfferAccepted ? t('statusAccepted') : isOfferRejected ? t('statusRejected') : isMyTurn ? t('statusActionRequired') : (isFarmer ? t('statusWaitingBuyer') : t('statusWaitingFarmer'))}
                        </span>
                      </div>
                    </div>

                    {/* Key Details Strip */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px]">{t('farmerSeller')}</span>
                        <p className="font-extrabold text-slate-800 flex items-center gap-1 mt-0.5">
                          <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{selectedOffer.farmer_name}</span>
                        </p>
                        <p className="text-[11px] text-slate-500">{selectedOffer.farmer_location}</p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px]">{t('buyerProcurer')}</span>
                        <p className="font-extrabold text-slate-800 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>{selectedOffer.buyer_company}</span>
                        </p>
                        <p className="text-[11px] text-slate-500">{selectedOffer.buyer_location}</p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px]">{t('benchmark')}</span>
                        <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                          ₹{selectedOffer.market_price_benchmark || 28}/kg
                        </p>
                        <p className="text-[11px] text-slate-500">{t('liveModalRate')}</p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px]">{t('latestOfferRate')}</span>
                        <p className="font-black text-emerald-700 text-base mt-0.5">
                          ₹{selectedOffer.price_per_kg}/kg
                        </p>
                        <p className="text-[11px] text-slate-500">{t('grossValue')}: ₹{selectedOffer.total_value?.toLocaleString()}</p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px]">Payment Terms & Mode</span>
                        <p className="font-bold text-blue-800 text-xs mt-0.5 flex items-center gap-1">
                          <span>{selectedOffer.payment_terms || 'Within 3 Days'}</span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">UPI Only</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {selectedOffer.cold_storage_required ? `Cold Storage: ₹${selectedOffer.storage_cost || 0}` : 'Cold Storage: ₹0 (Not Required)'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Turn Banner */}
                  {!isOfferAccepted && !isOfferRejected && (
                    <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
                      isMyTurn 
                        ? 'bg-amber-50 border-amber-300 text-amber-950 font-medium'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      <Clock className={`w-5 h-5 flex-shrink-0 ${isMyTurn ? 'text-amber-600' : 'text-slate-400'}`} />
                      <div>
                        <p className="font-black text-sm">
                          {isMyTurn ? t('statusActionRequired') : (isFarmer ? t('statusWaitingBuyer') : t('statusWaitingFarmer'))}
                        </p>
                        <p className="mt-0.5">
                          {isMyTurn 
                            ? `The latest offer of ₹${selectedOffer.price_per_kg}/kg for ${selectedOffer.quantity} kg was submitted by ${selectedOffer.latest_offer_from || (selectedOffer.current_offer_by === 'farmer' ? 'Farmer' : 'Buyer')}. You may accept, reject, or propose a counter-offer.`
                            : `Your offer of ₹${selectedOffer.price_per_kg}/kg for ${selectedOffer.quantity} kg has been delivered. Waiting for response.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* AI Net Realisation Recommendation Card */}
                  <div className="bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-200/80 p-4 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        {t('aiTargetPrice')}
                      </span>
                      <span className="text-xs font-black text-emerald-900 bg-white/80 px-2.5 py-0.5 rounded-full border border-emerald-300">
                        Target: ₹{selectedOffer.ai_target_price || selectedOffer.price_per_kg}/kg
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {selectedOffer.ai_explanation?.[language] || selectedOffer.ai_explanation?.en || selectedOffer.ai_explanation || "Based on current market price, buyer offer, and expected farmer net realisation."}
                    </p>
                  </div>

                  {/* Offer Financial Calculation Box (Live Dynamic Breakdown) */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                      {t('financialBreakdown')}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-400 font-bold uppercase text-[10px]">{t('expectedPrice')}</span>
                        <p className="font-extrabold text-slate-900 text-sm">₹{counterPrice}/kg</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-400 font-bold uppercase text-[10px]">{t('quantity')}</span>
                        <p className="font-bold text-slate-900 text-sm">{counterQty} kg</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-400 font-bold uppercase text-[10px]">{t('grossValue')}</span>
                        <p className="font-bold text-slate-900 text-sm">₹{dynamicGross.toLocaleString()}</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-400 font-bold uppercase text-[10px]">Cold Storage</span>
                        <p className="font-bold text-slate-800 text-sm">
                          {dynamicStorage > 0 ? `- ₹${dynamicStorage.toLocaleString()}` : '₹0'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-emerald-100 p-3 rounded-lg border border-emerald-300 flex items-center justify-between">
                      <div>
                        <span className="text-emerald-950 font-bold uppercase text-[10px]">{t('netRealisationToFarmer')}</span>
                        <p className="text-xs text-emerald-800">Gross Value - Cold Storage (Transport Handled by Farmer, ₹0 Platform Deduction)</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-emerald-950">₹{dynamicNet.toLocaleString()}</p>
                        <p className="text-[11px] font-bold text-emerald-800">{t('netRealisation')} ₹{dynamicNetPerKg}/kg</p>
                      </div>
                    </div>
                  </div>

                  {/* Negotiation Chat / Chronological Timeline */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                        {t('negotiationHistory')}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-semibold">{selectedOffer.negotiations?.length || 0} {t('messagesLogged')}</span>
                    </div>

                    <div className="bg-slate-100/70 rounded-xl p-4 space-y-3 max-h-72 overflow-y-auto border border-slate-200">
                      {selectedOffer.negotiations?.map((n: any, idx: number) => {
                        const isLast = idx === selectedOffer.negotiations.length - 1;
                        const isFromFarmer = n.sender_role === 'farmer';
                        const isSentByMe = (n.sender_role?.toLowerCase() === user?.role?.toLowerCase());

                        return (
                          <div
                            key={n.id || idx}
                            className={`flex flex-col ${isSentByMe ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`max-w-[85%] p-3.5 rounded-2xl text-xs space-y-1.5 shadow-sm border ${
                                isSentByMe
                                  ? 'bg-emerald-800 text-white rounded-tr-none border-emerald-700'
                                  : 'bg-white text-slate-900 rounded-tl-none border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-4 text-[10px] opacity-80 border-b border-white/20 pb-1">
                                <span className="font-bold flex items-center gap-1">
                                  {isFromFarmer ? <UserIcon className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                                  {n.sender_name} ({isSentByMe ? 'You' : n.sender_role?.toUpperCase()})
                                </span>
                                <span>{formatDateTime(n.created_at)}</span>
                              </div>

                              <div className="flex items-center justify-between gap-3 pt-0.5">
                                <p className="font-black text-sm">
                                  Proposed: ₹{n.price_per_kg}/kg ({n.quantity} kg)
                                </p>
                                {isLast && (
                                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide shadow-sm ${
                                    isOfferAccepted ? 'bg-emerald-300 text-emerald-950' : isOfferRejected ? 'bg-red-300 text-red-950' : 'bg-amber-400 text-slate-950'
                                  }`}>
                                    {isOfferAccepted ? 'AGREED FINAL' : isOfferRejected ? 'REJECTED' : 'LATEST OFFER'}
                                  </span>
                                )}
                              </div>

                              {(n.payment_terms || n.cold_storage_required) && (
                                <div className="flex flex-wrap gap-2 text-[10px] opacity-90 pt-0.5">
                                  {n.payment_terms && (
                                    <span className="bg-black/15 px-1.5 py-0.5 rounded font-medium">Terms: {n.payment_terms}</span>
                                  )}
                                  {n.cold_storage_required && (
                                    <span className="bg-black/15 px-1.5 py-0.5 rounded font-medium">Cold Storage: ₹{n.storage_cost || 0} ({n.storage_duration || 'Applied'})</span>
                                  )}
                                </div>
                              )}

                              {n.message && (
                                <p className={`text-xs ${isSentByMe ? 'text-emerald-100' : 'text-slate-600'} leading-relaxed`}>
                                  "{n.message}"
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Section based on Negotiation Status */}
                  {isOfferAccepted ? (
                    <div className="bg-emerald-50 border-2 border-emerald-300 p-5 rounded-2xl space-y-3 animate-in fade-in">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-md">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-black text-emerald-950 text-base">{t('negotiationAgreed')}</h3>
                          <p className="text-xs text-emerald-800">
                            {t('finalAgreedPrice')}: <span className="font-extrabold">₹{selectedOffer.price_per_kg}/kg</span> ({selectedOffer.quantity} kg) | {t('netRealisation')}: <span className="font-extrabold">₹{selectedOffer.net_realisation?.toLocaleString()}</span>
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-end border-t border-emerald-200/80">
                        <button
                          onClick={() => {
                            if (isFarmer) {
                              if (selectedOffer.agreement_id) {
                                navigate(`/farmer/agreement/${selectedOffer.agreement_id}`);
                              } else {
                                navigate('/farmer/agreements');
                              }
                            } else {
                              navigate('/buyer/agreements');
                            }
                          }}
                          className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Shield className="w-4 h-4" />
                          <span>{t('viewAndSignAgreement')}</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : isOfferRejected ? (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center space-y-1">
                      <p className="font-bold text-red-900 text-sm flex items-center justify-center gap-1.5">
                        <XCircle className="w-4 h-4 text-red-600" />
                        {t('negotiationClosed')}
                      </p>
                      <p className="text-xs text-red-700">{t('negotiationClosedDesc')}</p>
                    </div>
                  ) : !isMyTurn ? (
                    /* Waiting state: User has submitted their offer/counter and is waiting for other party */
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-3">
                      <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto shadow-xs">
                        <Clock className="w-6 h-6 animate-pulse text-amber-600" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">
                          {isFarmer ? "Awaiting Buyer's Response" : "Awaiting Farmer's Response"}
                        </h4>
                        <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                          Your offer of <strong className="text-slate-900">₹{selectedOffer.price_per_kg}/kg</strong> for <strong className="text-slate-900">{selectedOffer.quantity} kg</strong> has been delivered to <strong>{isFarmer ? selectedOffer.buyer_company : selectedOffer.farmer_name}</strong>.
                          Once they respond (Accept, Counter, or Reject), this negotiation thread will update automatically.
                        </p>
                      </div>

                      <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-500 font-medium">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        <span>Live auto-sync active</span>
                      </div>
                    </div>
                  ) : !showCounterForm ? (
                    /* User's Turn: Display the 3 prominent action buttons: ACCEPT | COUNTER OFFER | REJECT */
                    <div className="bg-gradient-to-r from-emerald-50/90 via-white to-blue-50/90 p-5 rounded-2xl border-2 border-emerald-300 shadow-sm space-y-4 animate-in fade-in">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200/80 pb-3">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                            ACTION REQUIRED
                          </span>
                          <h3 className="font-black text-slate-900 text-base mt-1">
                            Latest Offer: <span className="text-emerald-700 font-extrabold">₹{selectedOffer.price_per_kg}/kg</span> ({selectedOffer.quantity} kg)
                          </h3>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Submitted by <strong>{selectedOffer.latest_offer_from || (selectedOffer.current_offer_by === 'farmer' ? 'Farmer' : 'Buyer')}</strong>. You can Accept, Counter, or Reject:
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Transaction Value</span>
                          <p className="text-lg font-black text-slate-900">₹{selectedOffer.total_value?.toLocaleString()}</p>
                          <span className="text-[11px] font-bold text-emerald-700">Net Realisation: ₹{selectedOffer.net_realisation?.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* 3 Prominent Action Buttons: ACCEPT | COUNTER OFFER | REJECT */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        {/* 1. ACCEPT BUTTON */}
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => setShowAcceptModal(true)}
                          className="py-4 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                          <span>ACCEPT</span>
                        </button>

                        {/* 2. COUNTER OFFER BUTTON */}
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => {
                            setCounterPrice(selectedOffer.price_per_kg);
                            setCounterQty(selectedOffer.quantity);
                            setCounterMsg('');
                            setShowCounterForm(true);
                          }}
                          className="py-4 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-black text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <ArrowLeftRight className="w-5 h-5 flex-shrink-0" />
                          <span>COUNTER OFFER</span>
                        </button>

                        {/* 3. REJECT BUTTON */}
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => setShowRejectModal(true)}
                          className="py-4 px-4 bg-white hover:bg-red-50 hover:text-red-700 active:scale-[0.98] text-slate-700 border border-slate-300 hover:border-red-300 font-extrabold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
                          <span>REJECT</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Counter Offer Form (revealed when user clicks COUNTER OFFER) */
                    <form onSubmit={handleSendCounter} className="bg-slate-50 p-5 rounded-2xl border-2 border-amber-300 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                            ENTER COUNTER-OFFER TERMS
                          </span>
                          <h4 className="font-extrabold text-sm text-slate-900 mt-1">
                            Propose New Rate to {isFarmer ? selectedOffer.buyer_company : selectedOffer.farmer_name}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCounterForm(false)}
                          className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2.5 py-1 rounded-lg hover:bg-slate-200 cursor-pointer"
                        >
                          Cancel & Back
                        </button>
                      </div>

                      {errorMsg && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>{errorMsg}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-700">Proposed Counter Price (₹/kg) *</label>
                          <input
                            type="number"
                            step="0.5"
                            required
                            min="1"
                            value={counterPrice}
                            onChange={(e) => setCounterPrice(Number(e.target.value))}
                            className="w-full mt-1 p-3 text-base bg-white border border-slate-300 rounded-xl font-black text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700">Quantity (kg) *</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={counterQty}
                            onChange={(e) => setCounterQty(Number(e.target.value))}
                            className="w-full mt-1 p-3 text-base bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700">Negotiation Note / Message (Optional)</label>
                        <input
                          type="text"
                          value={counterMsg}
                          onChange={(e) => setCounterMsg(e.target.value)}
                          placeholder={isFarmer ? "e.g. Best price for Grade A harvest." : "e.g. Revised rate for quick deal closure."}
                          className="w-full mt-1 p-3 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>

                      {/* Payment Terms Section */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 block">
                            Required Payment Days (UPI Only) *
                          </label>
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            UPI Settlement Only
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Select the required payment days. If payment is delayed beyond agreed days, delay compensation is payable to the farmer.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                          {['Within 1 Day', 'Within 2 Days', 'Within 3 Days', 'Within 5 Days', 'Within 7 Days', 'Custom Days'].map((term) => (
                            <button
                              key={term}
                              type="button"
                              onClick={() => setCounterPaymentTerms(term === 'Custom Days' ? 'Custom Payment Term' : term)}
                              className={`py-2 px-3 rounded-xl border font-bold text-xs transition-colors text-center cursor-pointer ${
                                (counterPaymentTerms === term || (term === 'Custom Days' && counterPaymentTerms === 'Custom Payment Term'))
                                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              {term}
                            </button>
                          ))}
                        </div>
                        {counterPaymentTerms === 'Custom Payment Term' && (
                          <input
                            type="text"
                            value={counterCustomPayment}
                            onChange={(e) => setCounterCustomPayment(e.target.value)}
                            placeholder="Enter custom days (e.g. Within 4 Days)"
                            className="w-full mt-1.5 p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          />
                        )}
                      </div>

                      {/* Cold Storage Cost Section */}
                      <div className="bg-slate-100/70 p-3.5 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">Cold Storage Required?</span>
                            <span className="text-[11px] text-slate-500">Preservation cost deducted only if selected</span>
                          </div>
                          <div className="inline-flex rounded-xl border border-slate-300 bg-white p-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setCounterColdStorage(true);
                                if (!counterStorageCost) setCounterStorageCost(500);
                                if (!counterStorageDuration) setCounterStorageDuration('7 Days');
                              }}
                              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                                counterColdStorage ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCounterColdStorage(false);
                                setCounterStorageCost(0);
                                setCounterStorageDuration('');
                              }}
                              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                                !counterColdStorage ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              No
                            </button>
                          </div>
                        </div>

                        {counterColdStorage && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                            <div>
                              <label className="text-[11px] font-bold text-slate-700">Storage Duration</label>
                              <input
                                type="text"
                                value={counterStorageDuration}
                                onChange={(e) => setCounterStorageDuration(e.target.value)}
                                placeholder="e.g. 5 Days, 2 Weeks"
                                className="w-full mt-1 p-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-700">Storage Cost (₹)</label>
                              <input
                                type="number"
                                min="0"
                                value={counterStorageCost}
                                onChange={(e) => setCounterStorageCost(Number(e.target.value))}
                                className="w-full mt-1 p-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Live Financial Breakdown */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Proposed Gross</span>
                          <p className="font-extrabold text-slate-900 text-sm">₹{dynamicGross.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Cold Storage Cost</span>
                          <p className="font-bold text-slate-800 text-sm">
                            {dynamicStorage > 0 ? `- ₹${dynamicStorage.toLocaleString()}` : '₹0'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Farmer Net Realisation</span>
                          <p className="font-black text-emerald-700 text-sm">₹{dynamicNet.toLocaleString()} (₹{dynamicNetPerKg}/kg)</p>
                        </div>
                      </div>

                      {/* Submit & Cancel Buttons */}
                      <div className="flex gap-2 pt-2 border-t border-slate-200">
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-black text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                          <span>SEND COUNTER OFFER</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowCounterForm(false)}
                          className="px-5 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                </div>
              ) : (
                <div className="bg-white rounded-2xl p-12 text-center text-slate-400 text-sm border border-slate-200 space-y-2">
                  <p>{t('selectNegotiationPrompt')}</p>
                </div>
              )}
            </>
          )}

          {/* WORKSPACE VIEW 2: PROCUREMENT REQUEST WORKSPACE */}
          {activeTab === 'requests' && (
            <>
              {selectedRequest ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
                  
                  {/* Header: Request Summary */}
                  <div className="border-b border-slate-100 pb-4 space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <span className="text-[11px] bg-blue-900 text-white font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Request ID: {selectedRequest.request_code}
                        </span>
                        <h2 className="text-xl font-black text-slate-900 mt-1">
                          Procurement Request: {selectedRequest.crop_name} ({selectedRequest.quantity} kg)
                        </h2>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                          selectedRequest.status === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold'
                            : selectedRequest.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800 border-red-300 font-bold'
                            : 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold animate-pulse'
                        }`}>
                          {selectedRequest.status === 'ACCEPTED' ? 'Request Accepted ✓' : selectedRequest.status === 'REJECTED' ? 'Request Rejected' : 'PENDING REVIEW'}
                        </span>
                      </div>
                    </div>

                    {/* Key Details Strip */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px]">{t('farmerSeller')}</span>
                        <p className="font-extrabold text-slate-800 flex items-center gap-1 mt-0.5">
                          <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{selectedRequest.farmer_name}</span>
                        </p>
                        <p className="text-[11px] text-slate-500">{selectedRequest.farmer_location}</p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px]">{t('buyerProcurer')}</span>
                        <p className="font-extrabold text-slate-800 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>{selectedRequest.buyer_company}</span>
                        </p>
                        <p className="text-[11px] text-slate-500">{selectedRequest.buyer_location}</p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px]">{t('expectedPrice')}</span>
                        <p className="font-black text-emerald-700 text-base mt-0.5">
                          ₹{selectedRequest.expected_price}/kg
                        </p>
                        <p className="text-[11px] text-slate-500">{selectedRequest.quality || 'Grade A'}</p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px]">Estimated Value</span>
                        <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                          ₹{Math.round(selectedRequest.expected_price * selectedRequest.quantity).toLocaleString()}
                        </p>
                        <p className="text-[11px] text-slate-500">Submitted: {formatDateTime(selectedRequest.created_at)}</p>
                      </div>
                    </div>

                    {/* Farmer message notes */}
                    {selectedRequest.message && (
                      <div className="bg-slate-100/70 p-3 rounded-xl border border-slate-200 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Farmer Note:</span>
                        <p className="text-slate-800 mt-0.5 italic">"{selectedRequest.message}"</p>
                      </div>
                    )}
                  </div>

                  {/* If Request is ACCEPTED (offer already created), link directly to negotiation */}
                  {selectedRequest.status === 'ACCEPTED' && (
                    <div className="bg-emerald-50 border-2 border-emerald-300 p-5 rounded-2xl space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-md">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-black text-emerald-950 text-base">Request Accepted ✓</h3>
                          <p className="text-xs text-emerald-800">
                            This procurement request is accepted. Active negotiation thread is live and ready for contracting.
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end border-t border-emerald-200">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('negotiations');
                            if (selectedRequest.offer_id) {
                              fetchData(selectedRequest.offer_id, selectedRequest.id);
                            }
                          }}
                          className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <ArrowLeftRight className="w-4 h-4" />
                          <span>Open Active Negotiation</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* If Request is REJECTED */}
                  {selectedRequest.status === 'REJECTED' && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center space-y-1">
                      <p className="font-bold text-red-900 text-sm flex items-center justify-center gap-1.5">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span>Request Rejected</span>
                      </p>
                      <p className="text-xs text-red-700">This procurement request was declined by the buyer.</p>
                    </div>
                  )}

                  {/* If Request is PENDING and current user is BUYER: Show the two primary action buttons */}
                  {selectedRequest.status === 'PENDING' && isBuyer && (
                    <div className="space-y-4">
                      <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                              <Inbox className="w-4 h-4 text-amber-600" />
                              <span>Incoming Request Review</span>
                            </h4>
                            <p className="text-xs text-slate-600 mt-0.5">
                              Farmer <strong>{selectedRequest.farmer_name}</strong> has proposed <strong>{selectedRequest.quantity} kg</strong> of <strong>{selectedRequest.crop_name}</strong> at <strong>₹{selectedRequest.expected_price}/kg</strong>.
                            </p>
                          </div>
                          <span className="text-xs bg-amber-200/80 text-amber-950 font-extrabold px-3 py-1 rounded-full border border-amber-400">
                            PENDING REVIEW
                          </span>
                        </div>

                        {/* Two Primary Action Buttons */}
                        <div className="flex items-center gap-3 pt-2">
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={handleDirectAcceptRequest}
                            className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>ACCEPT REQUEST</span>
                          </button>

                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => setShowDeclineRequestModal(true)}
                            className="px-6 py-3.5 bg-white hover:bg-red-50 text-red-700 font-bold text-xs rounded-xl border border-red-300 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <span>REJECT REQUEST</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowCustomOfferForm(!showCustomOfferForm)}
                            className="px-4 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                          >
                            {showCustomOfferForm ? "Hide Counter Offer" : "Counter Offer / Custom Terms"}
                          </button>
                        </div>
                      </div>

                      {/* Optional Custom Offer Form */}
                      {showCustomOfferForm && (
                        <form onSubmit={handleSendBuyerOfferOnRequest} className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                              <Send className="w-4 h-4 text-blue-600" />
                              <span>{t('respondWithOffer')}</span>
                            </h4>
                            <span className="text-[11px] text-slate-500 font-medium">
                              Propose your customized procurement terms to start negotiation
                            </span>
                          </div>

                          {requestErrorMsg && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 flex-shrink-0" />
                              <span>{requestErrorMsg}</span>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs font-bold text-slate-700">Offered Price (₹/kg) *</label>
                              <input
                                type="number"
                                step="0.5"
                                required
                                min="1"
                                value={buyerOfferPrice}
                                onChange={(e) => setBuyerOfferPrice(Number(e.target.value))}
                                className="w-full mt-1 p-2.5 text-sm bg-white border border-slate-300 rounded-xl font-black text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-bold text-slate-700">Offered Quantity (kg) *</label>
                              <input
                                type="number"
                                required
                                min="1"
                                value={buyerOfferQty}
                                onChange={(e) => setBuyerOfferQty(Number(e.target.value))}
                                className="w-full mt-1 p-2.5 text-sm bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-bold text-slate-700">Quality Grade</label>
                              <select
                                value={buyerOfferQuality}
                                onChange={(e) => setBuyerOfferQuality(e.target.value)}
                                className="w-full mt-1 p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              >
                                <option value="Grade A">Grade A (Export / Premium)</option>
                                <option value="Grade B">Grade B (Standard Commercial)</option>
                                <option value="Grade C">Grade C (Processing Fair)</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-bold text-slate-700">Proposed Pickup Date</label>
                              <input
                                type="date"
                                value={buyerOfferPickupDate}
                                onChange={(e) => setBuyerOfferPickupDate(e.target.value)}
                                className="w-full mt-1 p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-bold text-slate-700">Delivery / Pickup Location</label>
                              <input
                                type="text"
                                value={buyerOfferLocation}
                                onChange={(e) => setBuyerOfferLocation(e.target.value)}
                                placeholder="e.g. Farmer Farm Site or Buyer Warehouse"
                                className="w-full mt-1 p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Payment Terms Section */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-700 block">Proposed Payment Days (UPI Only) *</label>
                              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                UPI Only
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                              {['Within 1 Day', 'Within 2 Days', 'Within 3 Days', 'Within 5 Days', 'Within 7 Days', 'Custom Days'].map((term) => (
                                <button
                                  key={term}
                                  type="button"
                                  onClick={() => setBuyerOfferPaymentTerms(term === 'Custom Days' ? 'Custom Payment Term' : term)}
                                  className={`py-2 px-3 rounded-xl border font-bold text-xs transition-colors text-center cursor-pointer ${
                                    (buyerOfferPaymentTerms === term || (term === 'Custom Days' && buyerOfferPaymentTerms === 'Custom Payment Term'))
                                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  {term}
                                </button>
                              ))}
                            </div>
                            {buyerOfferPaymentTerms === 'Custom Payment Term' && (
                              <input
                                type="text"
                                value={buyerOfferCustomPayment}
                                onChange={(e) => setBuyerOfferCustomPayment(e.target.value)}
                                placeholder="Enter custom days (e.g. Within 4 Days)"
                                className="w-full mt-1.5 p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            )}
                          </div>

                          {/* Cold Storage Required? */}
                          <div className="bg-slate-100/70 p-3.5 rounded-xl border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xs font-bold text-slate-800 block">Cold Storage Required?</span>
                                <span className="text-[11px] text-slate-500">Post-harvest preservation requirement</span>
                              </div>
                              <div className="inline-flex rounded-xl border border-slate-300 bg-white p-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBuyerOfferColdStorage(true);
                                    if (!buyerOfferStorageCost) setBuyerOfferStorageCost(500);
                                    if (!buyerOfferStorageDuration) setBuyerOfferStorageDuration('7 Days');
                                  }}
                                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                                    buyerOfferColdStorage ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBuyerOfferColdStorage(false);
                                    setBuyerOfferStorageCost(0);
                                    setBuyerOfferStorageDuration('');
                                  }}
                                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                                    !buyerOfferColdStorage ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  No
                                </button>
                              </div>
                            </div>

                            {buyerOfferColdStorage && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                                <div>
                                  <label className="text-[11px] font-bold text-slate-700">Storage Duration</label>
                                  <input
                                    type="text"
                                    value={buyerOfferStorageDuration}
                                    onChange={(e) => setBuyerOfferStorageDuration(e.target.value)}
                                    placeholder="e.g. 5 Days, 2 Weeks"
                                    className="w-full mt-1 p-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-bold text-slate-700">Storage Cost (₹)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={buyerOfferStorageCost}
                                    onChange={(e) => setBuyerOfferStorageCost(Number(e.target.value))}
                                    className="w-full mt-1 p-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-700">Offer Message / Terms Note</label>
                            <input
                              type="text"
                              value={buyerOfferNotes}
                              onChange={(e) => setBuyerOfferNotes(e.target.value)}
                              placeholder="e.g. Can arrange pickup immediately upon agreement confirmation."
                              className="w-full mt-1 p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>

                          {/* Live Commercial Calculation */}
                          <div className="bg-blue-50/80 p-3.5 rounded-xl border border-blue-200 flex items-center justify-between text-xs">
                            <div>
                              <span className="text-blue-900 font-bold uppercase text-[10px]">Calculated Gross Procurement Value</span>
                              <p className="text-sm font-black text-blue-950">₹{buyerGross.toLocaleString()}</p>
                              <span className="text-[11px] text-blue-700">₹{buyerOfferPrice}/kg for {buyerOfferQty} kg</span>
                            </div>
                            <div className="text-right">
                              <span className="text-blue-900 font-bold uppercase text-[10px]">Farmer Net Realisation</span>
                              <p className="text-sm font-black text-emerald-700">₹{buyerNet.toLocaleString()}</p>
                              <span className="text-[11px] text-slate-500">
                                {buyerOfferColdStorage && buyerOfferStorageCost > 0 ? `(After ₹${buyerOfferStorageCost} cold storage)` : '(Zero deductions)'}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2 border-t border-slate-200">
                            <button
                              type="submit"
                              disabled={actionLoading}
                              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>{t('sendProcurementOffer')}</span>
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {/* If Request is PENDING and current user is FARMER: Show waiting status */}
                  {selectedRequest.status === 'PENDING' && isFarmer && (
                    <div className="bg-amber-50 border border-amber-300 p-5 rounded-xl space-y-3">
                      <div className="flex items-center gap-3">
                        <Clock className="w-6 h-6 text-amber-600 flex-shrink-0 animate-pulse" />
                        <div>
                          <h4 className="font-extrabold text-sm text-amber-950">Awaiting Buyer Procurement Offer</h4>
                          <p className="text-xs text-amber-800 mt-0.5">
                            Your request of <strong>₹{selectedRequest.expected_price}/kg</strong> for <strong>{selectedRequest.quantity} kg</strong> of <strong>{selectedRequest.crop_name}</strong> has been received by <strong>{selectedRequest.buyer_company}</strong>.
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-amber-700">
                        Once the buyer responds with their official offer, it will automatically appear here and in your Active Negotiations tab.
                      </p>
                    </div>
                  )}

                </div>
              ) : (
                <div className="bg-white rounded-2xl p-12 text-center text-slate-400 text-sm border border-slate-200 space-y-2">
                  <p>{t('selectRequestPrompt')}</p>
                </div>
              )}
            </>
          )}

        </div>

      </div>

      {/* Accept Offer Custom Confirmation Modal */}
      {showAcceptModal && selectedOffer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-6 h-6" />
              <h3 className="font-extrabold text-lg text-slate-900">Accept Commercial Offer?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              You are about to accept the offer for <strong>{selectedOffer.crop_name}</strong> ({selectedOffer.quantity} kg) at <strong className="text-emerald-700">₹{selectedOffer.price_per_kg}/kg</strong>.
              This will automatically generate a binding <strong>Digital Commercial Agreement</strong>.
            </p>
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-600">Gross Trade Value:</span>
                <span className="font-bold text-slate-900">₹{Math.round(selectedOffer.price_per_kg * selectedOffer.quantity).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Payment Term:</span>
                <span className="font-bold text-blue-800">Payment as per Negotiation ({selectedOffer.payment_terms || 'Within 3 Days'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Settlement Mode:</span>
                <span className="font-bold text-emerald-800">UPI Only</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Delay Penalty:</span>
                <span className="font-medium text-amber-900">Payable if payment exceeds agreed days</span>
              </div>
              {selectedOffer.cold_storage_required && selectedOffer.storage_cost > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Cold Storage Cost:</span>
                  <span className="font-bold text-slate-800">
                    - ₹{selectedOffer.storage_cost.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-emerald-200 pt-1 font-extrabold text-emerald-900">
                <span>Expected Net Realisation:</span>
                <span>₹{Math.max(0, Math.round(selectedOffer.price_per_kg * selectedOffer.quantity) - (selectedOffer.storage_cost || 0)).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAcceptModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={confirmAcceptOffer}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer"
              >
                {actionLoading ? "Generating Agreement..." : "Confirm & Sign Agreement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Offer Custom Confirmation Modal */}
      {showRejectModal && selectedOffer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-200">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="w-6 h-6" />
              <h3 className="font-extrabold text-base text-slate-900">Decline Negotiation?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to decline this negotiation with <strong>{isFarmer ? selectedOffer.buyer_company : selectedOffer.farmer_name}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={confirmRejectOffer}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                {actionLoading ? "Declining..." : "Yes, Decline Offer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Farmer Request Custom Confirmation Modal */}
      {showDeclineRequestModal && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-200">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="w-6 h-6" />
              <h3 className="font-extrabold text-base text-slate-900">Decline Procurement Request?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to decline the request for <strong>{selectedRequest.crop_name}</strong> ({selectedRequest.quantity} kg) from <strong>{selectedRequest.farmer_name}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeclineRequestModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={confirmDeclineRequest}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                {actionLoading ? "Declining..." : "Yes, Decline Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NegotiationsPage;
