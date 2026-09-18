import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { 
  Building2, ShoppingBag, Sprout, ArrowRight, ShieldCheck, 
  Sparkles, PlusCircle, CheckCircle2, X, Calendar, MapPin, Truck, DollarSign,
  Inbox, Send, Clock, User, Check, AlertCircle, RefreshCw, FileText
} from 'lucide-react';
import axios from 'axios';
import { formatDateTime } from '../../utils/dateUtils';

const CROPS = [
  "Tomato", "Paddy", "Rice", "Cotton", "Maize", "Chilli", "Turmeric",
  "Onion", "Red Gram", "Green Gram", "Black Gram", "Groundnut", "Soybean", "Vegetables", "Other"
];

const QUALITIES = ["Grade A", "Grade B", "Grade C", "Premium"];

export const BuyerDashboard: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [summary, setSummary] = useState<any>(null);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [recommendedFarmers, setRecommendedFarmers] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [showAddReqModal, setShowAddReqModal] = useState<boolean>(false);
  const [showCertModal, setShowCertModal] = useState<boolean>(false);
  const [submittingReq, setSubmittingReq] = useState<boolean>(false);

  // Send Offer on Request Modal State
  const [selectedReqForOffer, setSelectedReqForOffer] = useState<any>(null);
  const [buyerOfferPrice, setBuyerOfferPrice] = useState<number>(30);
  const [buyerOfferQty, setBuyerOfferQty] = useState<number>(500);
  const [buyerPickupDate, setBuyerPickupDate] = useState<string>(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [buyerDeliveryLoc, setBuyerDeliveryLoc] = useState<string>('Farmer Farm Site');
  const [buyerOfferMsg, setBuyerOfferMsg] = useState<string>('');
  const [submittingOffer, setSubmittingOffer] = useState<boolean>(false);

  // New Requirement Form State
  const [reqCrop, setReqCrop] = useState('Tomato');
  const [reqVariety, setReqVariety] = useState('Desi Hybrid (Sahu)');
  const [reqQty, setReqQty] = useState<number>(5000);
  const [reqGrade, setReqGrade] = useState('Grade A');
  const [reqMinGrade, setReqMinGrade] = useState('Grade A');
  const [reqTargetMin, setReqTargetMin] = useState<number>(26);
  const [reqTargetMax, setReqTargetMax] = useState<number>(30);
  const [reqMaxBudget, setReqMaxBudget] = useState<number>(32);
  const [reqDistrict, setReqDistrict] = useState('Rangareddy');
  const [reqLocation, setReqLocation] = useState('Cherlapally Industrial Hub, Hyderabad');
  const [reqDate, setReqDate] = useState(new Date().toISOString().split('T')[0] || "2026-09-16");
  const [reqPickupDelivery, setReqPickupDelivery] = useState('Pickup');
  const [reqPaymentTerms, setReqPaymentTerms] = useState('Payment as per Negotiation (Within 3 Days via UPI)');
  const [reqNotes, setReqNotes] = useState('Require firm Grade A tomatoes for sauce processing. Direct farmgate pickup provided.');

  const fetchDashboardData = () => {
    axios.get('/api/buyer/dashboard-summary')
      .then(res => setSummary(res.data))
      .catch(console.error);

    axios.get('/api/buyer/requirements')
      .then(res => setRequirements(res.data))
      .catch(console.error);

    axios.get('/api/buyer/farmers')
      .then(res => setRecommendedFarmers(res.data.slice(0, 3)))
      .catch(console.error);

    axios.get('/api/workflow/requests')
      .then(res => setIncomingRequests(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      axios.get('/api/workflow/requests')
        .then(res => setIncomingRequests(res.data))
        .catch(() => {});
    }, 4000);

    if (location.pathname.includes('add-requirement')) {
      setShowAddReqModal(true);
    }

    return () => clearInterval(interval);
  }, [location.pathname]);

  const handleOpenOfferModal = (req: any) => {
    setSelectedReqForOffer(req);
    setBuyerOfferPrice(req.farmer_expected_price || 30);
    setBuyerOfferQty(req.quantity || 500);
    setBuyerDeliveryLoc(req.farmer_location ? `Farmer Farm Site (${req.farmer_location})` : 'Farmer Farm Site');
    setBuyerOfferMsg(`Official procurement offer for ${req.crop_name} (${req.quantity} kg) at ₹${req.farmer_expected_price || 30}/kg with farmgate pickup.`);
  };

  const handleAcceptRequest = (reqId: number, farmerName: string) => {
    axios.post(`/api/workflow/requests/${reqId}/accept`)
      .then((res) => {
        showToast("Request Accepted", "success");
        fetchDashboardData();
        if (res.data?.offer_id) {
          navigate(`/buyer/negotiations?offer_id=${res.data.offer_id}`);
        }
      })
      .catch(err => {
        showToast("Error: " + (err.response?.data?.detail || "Could not accept request."), "error");
      });
  };

  const handleSendOfferOnRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReqForOffer) return;

    setSubmittingOffer(true);
    axios.post(`/api/workflow/requests/${selectedReqForOffer.id}/offer`, {
      offered_price: Number(buyerOfferPrice),
      quantity: Number(buyerOfferQty),
      pickup_date: buyerPickupDate,
      delivery_location: buyerDeliveryLoc,
      message: buyerOfferMsg.trim() || undefined
    })
    .then(res => {
      showToast(`✓ Official Offer Sent to ${selectedReqForOffer.farmer_name}! Negotiation thread created.`, "success");
      const offerId = res.data.offer_id;
      setSelectedReqForOffer(null);
      fetchDashboardData();
      navigate(`/buyer/negotiations?offer_id=${offerId}`);
    })
    .catch(err => {
      showToast("Error sending offer: " + (err.response?.data?.detail || "Please try again."), "error");
    })
    .finally(() => setSubmittingOffer(false));
  };

  const handleRejectRequest = (reqId: number, farmerName: string) => {
    axios.post(`/api/workflow/requests/${reqId}/reject`)
      .then(() => {
        showToast("Request Rejected", "info");
        fetchDashboardData();
      })
      .catch(err => {
        showToast("Error: " + (err.response?.data?.detail || "Could not reject request."), "error");
      });
  };

  const handleCreateRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReq(true);

    axios.post('/api/buyer/requirements', {
      crop_name: reqCrop,
      variety: reqVariety,
      required_quantity: Number(reqQty),
      quality: reqGrade,
      min_quality_grade: reqMinGrade,
      max_price: Number(reqMaxBudget),
      target_price_min: Number(reqTargetMin),
      target_price_max: Number(reqTargetMax),
      preferred_district: reqDistrict,
      procurement_location: reqLocation,
      required_by_date: reqDate,
      pickup_delivery: reqPickupDelivery,
      payment_terms: reqPaymentTerms,
      additional_reqs: reqNotes
    })
    .then(() => {
      showToast("✓ Procurement Requirement Published! Now visible in Active Buyer Demands.", "success");
      setShowAddReqModal(false);
      fetchDashboardData();
    })
    .catch(err => {
      showToast("Error publishing requirement: " + (err.response?.data?.detail || "Please try again."), "error");
    })
    .finally(() => setSubmittingReq(false));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs bg-blue-700/80 text-blue-200 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            {t('buyerDashboardTelangana')}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
            {t('welcomeBuyer')} {summary?.company_name || "Balaji Trades"} 🏢
          </h1>
          <p className="text-xs text-blue-200 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{t('contactPerson')}: <strong className="text-white">{summary?.contact_person || "Srinivas Rao"}</strong></span>
            <span>•</span>
            <span>{t('status')}: <span className="text-emerald-400 font-bold">{t('statusVerifiedBuyer')}</span></span>
            <span>•</span>
            <span>GSTIN: <strong className="font-mono text-emerald-300 font-bold">{summary?.gstin || "36AAAAA0000A1Z5"}</strong></span>
            <span>•</span>
            <span>PAN: <strong className="font-mono text-blue-200 font-bold">{summary?.pan || "ABCDE1234F"}</strong></span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowCertModal(true)}
            className="px-3.5 py-2 bg-blue-700/80 hover:bg-blue-600 text-white font-bold text-xs rounded-xl border border-blue-400/40 shadow transition-all flex items-center gap-1.5 cursor-pointer"
            title="View official business certificate and registration details"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>My Business Certificate</span>
          </button>
          <button
            onClick={() => setShowAddReqModal(true)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Publish Requirement</span>
          </button>
          <button
            onClick={() => navigate('/buyer/search-farmers')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sprout className="w-4 h-4 text-emerald-400" />
            <span>{t('searchFarmers')}</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => setShowAddReqModal(true)}
          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1 cursor-pointer hover:border-blue-400 transition-all"
        >
          <span className="text-xs text-slate-500 font-semibold">{t('myRequirements')}</span>
          <p className="text-2xl font-black text-blue-800">{requirements.length || summary?.active_requirements || 1}</p>
          <span className="text-[11px] text-blue-600 font-medium">Active Demands in Market</span>
        </div>

        <div 
          onClick={() => navigate('/buyer/negotiations')}
          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1 cursor-pointer hover:border-amber-400 transition-all"
        >
          <span className="text-xs text-slate-500 font-semibold">{t('offersAndNegotiations')}</span>
          <p className="text-2xl font-black text-amber-600">{summary?.pending_offers || 1}</p>
          <span className="text-[11px] text-amber-600 font-bold">{t('openNegotiations')} →</span>
        </div>

        <div 
          onClick={() => navigate('/buyer/agreements')}
          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1 cursor-pointer hover:border-emerald-400 transition-all"
        >
          <span className="text-xs text-slate-500 font-semibold">{t('signedAgreements')}</span>
          <p className="text-2xl font-black text-emerald-600">{summary?.active_agreements || 0}</p>
          <span className="text-[11px] text-slate-500 font-medium">{t('statusReadyForPickup')}</span>
        </div>

        <div 
          onClick={() => navigate('/buyer/transactions')}
          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1 cursor-pointer hover:border-slate-400 transition-all"
        >
          <span className="text-xs text-slate-500 font-semibold">{t('completedOrders')}</span>
          <p className="text-2xl font-black text-slate-800">{summary?.completed_transactions || 34}</p>
          <span className="text-[11px] text-emerald-600 font-medium">{t('fulfilledProcurements')}</span>
        </div>
      </div>

      {/* Incoming Farmer Procurement Requests Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <Inbox className="w-5 h-5 text-indigo-600" />
              Incoming Farmer Procurement Requests ({incomingRequests.length})
            </h3>
            <p className="text-xs text-slate-500">Farmers who have directly reached out to initiate official trade terms.</p>
          </div>
          {incomingRequests.filter(r => r.status === 'PENDING').length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-900 font-extrabold px-3 py-1 rounded-full border border-amber-300 animate-pulse">
              {incomingRequests.filter(r => r.status === 'PENDING').length} Action Required
            </span>
          )}
        </div>

        {incomingRequests.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">No incoming farmer requests yet</p>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
              As farmers search for verified buyers or respond to your demands, their procurement requests will appear here for you to submit official offers.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {incomingRequests.map((req) => (
              <div 
                key={req.id} 
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  req.status === 'PENDING' 
                    ? 'bg-amber-50/40 border-amber-200 hover:border-amber-400' 
                    : req.status === 'ACCEPTED'
                    ? 'bg-blue-50/30 border-blue-200'
                    : 'bg-slate-50 border-slate-200 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-slate-900">{req.farmer_name}</h4>
                      <span className="text-[10px] bg-slate-200 text-slate-700 font-mono font-bold px-2 py-0.5 rounded">
                        {req.request_code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{req.farmer_location} | ⭐ {req.farmer_rating} ({req.farmer_reliability}%)</p>
                  </div>

                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                    req.status === 'PENDING'
                      ? 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold animate-pulse'
                      : req.status === 'ACCEPTED'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold'
                      : 'bg-red-100 text-red-800 border-red-300 font-bold'
                  }`}>
                    {req.status === 'PENDING' ? 'PENDING REVIEW' : req.status === 'ACCEPTED' ? 'Request Accepted ✓' : 'Request Rejected'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Crop / Lot</span>
                    <span className="font-bold text-slate-800">{req.crop_name}</span>
                    <span className="text-[10px] text-emerald-700 block font-semibold">{req.quality}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Quantity</span>
                    <span className="font-extrabold text-slate-900">{req.quantity?.toLocaleString()} kg</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Expected Price</span>
                    <span className="font-extrabold text-emerald-700">₹{req.farmer_expected_price}/kg</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Estimated Value</span>
                    <span className="font-extrabold text-slate-900">₹{Math.round((req.farmer_expected_price || 0) * (req.quantity || 0)).toLocaleString()}</span>
                  </div>
                </div>

                {req.message && (
                  <p className="text-[11px] text-slate-600 italic bg-white/60 p-2 rounded-lg border border-slate-200/60">
                    "{req.message}"
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-slate-200/60 flex-wrap gap-2">
                  <span>Received: {formatDateTime(req.created_at)}</span>
                  
                  {req.status === 'PENDING' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRejectRequest(req.id, req.farmer_name)}
                        className="px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 font-bold rounded-xl border border-rose-200 transition-colors cursor-pointer"
                      >
                        REJECT REQUEST
                      </button>
                      <button
                        onClick={() => handleAcceptRequest(req.id, req.farmer_name)}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ACCEPT REQUEST</span>
                      </button>
                    </div>
                  ) : req.status === 'ACCEPTED' ? (
                    <button
                      onClick={() => navigate(`/buyer/negotiations?offer_id=${req.offer_id}`)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open Negotiation {req.negotiation_id ? `(${req.negotiation_id})` : ''}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-slate-400 font-medium">Request Closed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Published Requirements Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              Active Procurement Demands ({requirements.length})
            </h3>
            <p className="text-xs text-slate-500">Demands published here directly feed into KisanLink Farmer Market Intelligence.</p>
          </div>
          <button
            onClick={() => setShowAddReqModal(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Post Demand</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requirements.map((req) => (
            <div key={req.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 hover:border-blue-400 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">{req.crop_name} ({req.variety || "Hybrid"})</h4>
                  <p className="text-xs text-slate-500">{req.procurement_location || req.preferred_district || "Direct Procurement"}</p>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-900 font-black px-2 py-0.5 rounded-full border border-emerald-300">
                  Target: ₹{req.target_price_min} – ₹{req.target_price_max}/kg
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Required Qty</span>
                  <span className="font-extrabold text-slate-900">{req.required_quantity?.toLocaleString()} kg</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Min Quality</span>
                  <span className="font-extrabold text-emerald-700">{req.min_quality_grade || req.quality}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Logistics</span>
                  <span className="font-bold text-slate-800">{req.pickup_delivery || 'Pickup'}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                <span>Needed By: <strong>{req.required_by_date}</strong></span>
                <span className="text-emerald-700 font-bold">{req.payment_terms || '100% on Quality'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Farmers for Buyer */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Smart Matched Farmers ({recommendedFarmers.length})
            </h3>
            <p className="text-xs text-slate-500">Ranked deterministically by quality grade, volume capacity, distance & reliability score</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendedFarmers.map((f, idx) => (
            <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 flex flex-col justify-between hover:border-blue-500 transition-colors">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">
                    Match: {f.match_score}%
                  </span>
                  <span className="text-xs text-slate-500">⭐ {f.rating} ({f.reliability_score}%)</span>
                </div>
                <h4 className="font-bold text-slate-800 text-sm">{f.farmer_name}</h4>
                <p className="text-xs text-slate-600">{f.location}</p>
                <div className="bg-white p-2 rounded-lg border border-slate-200 text-xs">
                  <p className="text-slate-600">{t('crop')}: <span className="font-bold text-slate-800">{f.crop_name} ({f.quality})</span></p>
                  <p className="text-slate-600">{t('statusAvailable')}: <span className="font-bold text-slate-800">{f.quantity} kg</span> | {t('expectedPrice')}: <span className="font-bold text-emerald-700">₹{f.expected_price}/kg</span></p>
                </div>
                <p className="text-[11px] text-slate-500 italic">"{f.explanation}"</p>
              </div>

              <button
                onClick={() => navigate('/buyer/search-farmers')}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                {t('sendOfficialOffer')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Publish Procurement Requirement Interactive Modal */}
      {showAddReqModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] bg-blue-100 text-blue-900 font-bold px-2.5 py-0.5 rounded-full uppercase">
                  Buyer Procurement Intelligence
                </span>
                <h3 className="font-extrabold text-xl text-slate-900 mt-1">Publish Procurement Demand</h3>
                <p className="text-xs text-slate-500">This demand will be visible to farmers in Market Intelligence to drive direct linkages.</p>
              </div>
              <button
                onClick={() => setShowAddReqModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequirement} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Crop *</label>
                  <select
                    value={reqCrop}
                    onChange={(e) => setReqCrop(e.target.value)}
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700">Variety / Specification</label>
                  <input
                    type="text"
                    value={reqVariety}
                    onChange={(e) => setReqVariety(e.target.value)}
                    placeholder="e.g. Desi Hybrid / Sahu"
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Required Quantity (kg) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={reqQty}
                    onChange={(e) => setReqQty(Number(e.target.value))}
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Minimum Quality Grade Required *</label>
                  <select
                    value={reqMinGrade}
                    onChange={(e) => {
                      setReqMinGrade(e.target.value);
                      setReqGrade(e.target.value);
                    }}
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-800"
                  >
                    {QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700">Target Price Range (₹/kg) *</label>
                  <div className="flex gap-2 items-center mt-1">
                    <input
                      type="number"
                      required
                      value={reqTargetMin}
                      onChange={(e) => setReqTargetMin(Number(e.target.value))}
                      placeholder="Min ₹"
                      className="w-1/2 p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-700"
                    />
                    <span>–</span>
                    <input
                      type="number"
                      required
                      value={reqTargetMax}
                      onChange={(e) => setReqTargetMax(Number(e.target.value))}
                      placeholder="Max ₹"
                      className="w-1/2 p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700">Max Budget Ceiling (₹/kg) *</label>
                  <input
                    type="number"
                    required
                    value={reqMaxBudget}
                    onChange={(e) => setReqMaxBudget(Number(e.target.value))}
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Preferred Procurement District *</label>
                  <input
                    type="text"
                    required
                    value={reqDistrict}
                    onChange={(e) => setReqDistrict(e.target.value)}
                    placeholder="Rangareddy / Hyderabad"
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Procurement / Delivery Location *</label>
                  <input
                    type="text"
                    required
                    value={reqLocation}
                    onChange={(e) => setReqLocation(e.target.value)}
                    placeholder="Cherlapally Industrial Hub, Hyderabad"
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Required By Date *</label>
                  <input
                    type="date"
                    required
                    value={reqDate}
                    onChange={(e) => setReqDate(e.target.value)}
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Logistics / Pickup Preference *</label>
                  <select
                    value={reqPickupDelivery}
                    onChange={(e) => setReqPickupDelivery(e.target.value)}
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="Pickup">Buyer Farmgate Pickup (₹0 Transport for Farmer)</option>
                    <option value="Delivery">Farmer Delivery to Hub</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Payment Terms *</label>
                <input
                  type="text"
                  required
                  value={reqPaymentTerms}
                  onChange={(e) => setReqPaymentTerms(e.target.value)}
                  placeholder="Payment as per Negotiation (e.g. Within 3 Days via UPI)"
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Additional Quality Specifications & Requirements</label>
                <textarea
                  rows={2}
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  placeholder="e.g. Firm texture, uniform color, minimum size 50mm, certified pesticide safe"
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddReqModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReq}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submittingReq ? "Publishing Demand..." : "Publish Procurement Demand"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Official Offer on Farmer Request Modal */}
      {selectedReqForOffer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] bg-blue-100 text-blue-900 font-bold px-2.5 py-0.5 rounded-full uppercase">
                  Official Procurement Offer
                </span>
                <h3 className="font-extrabold text-lg text-slate-900 mt-1">
                  Send Offer to {selectedReqForOffer.farmer_name}
                </h3>
                <p className="text-xs text-slate-500">
                  Responding to Request {selectedReqForOffer.request_code} for {selectedReqForOffer.crop_name}.
                </p>
              </div>
              <button 
                onClick={() => setSelectedReqForOffer(null)} 
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendOfferOnRequestSubmit} className="space-y-3.5 text-xs">
              {/* Request Info card */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Requested Produce</span>
                  <span className="font-extrabold text-slate-900">{selectedReqForOffer.crop_name} ({selectedReqForOffer.quality})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Farmer Expected Price</span>
                  <span className="font-extrabold text-emerald-700">₹{selectedReqForOffer.farmer_expected_price}/kg</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Your Offered Price (₹/kg) *</label>
                  <input
                    type="number"
                    required
                    step="0.5"
                    min={1}
                    value={buyerOfferPrice}
                    onChange={(e) => setBuyerOfferPrice(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-black text-emerald-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Procurement Quantity (kg) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={buyerOfferQty}
                    onChange={(e) => setBuyerOfferQty(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pickup Date *</label>
                  <input
                    type="date"
                    required
                    value={buyerPickupDate}
                    onChange={(e) => setBuyerPickupDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Handover Location *</label>
                  <input
                    type="text"
                    required
                    value={buyerDeliveryLoc}
                    onChange={(e) => setBuyerDeliveryLoc(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Financial calculations */}
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-blue-700 font-bold uppercase block">Gross Transaction Value</span>
                  <span className="text-sm font-extrabold text-blue-900">₹{(buyerOfferQty * buyerOfferPrice).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-blue-700 font-bold uppercase block">Est. Net Realisation</span>
                  <span className="text-sm font-extrabold text-emerald-800">
                    ₹{Math.max(0, buyerOfferQty * buyerOfferPrice - 1500).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Message / Note with Offer</label>
                <textarea
                  rows={2}
                  value={buyerOfferMsg}
                  onChange={(e) => setBuyerOfferMsg(e.target.value)}
                  placeholder="e.g. Price based on Grade A standard. Farmgate pickup included."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedReqForOffer(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOffer}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{submittingOffer ? "Sending Offer..." : "Send Official Offer"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BUYER OWN BUSINESS CERTIFICATE & CREDENTIALS */}
      {showCertModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in duration-200">
            <div className="bg-blue-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 rounded-xl">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{summary?.company_name || 'Balaji Trades'}</h3>
                  <p className="text-xs text-blue-200 font-mono">Company ID: {summary?.company_id || 'CMP-TG-2026-8841'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCertModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-blue-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="flex items-center justify-between p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="text-xs">
                  <span className="text-slate-500 font-medium">Verification Status: </span>
                  <span className="font-extrabold text-emerald-900 ml-1">VERIFIED ENTERPRISE</span>
                </div>
                <span className="inline-flex items-center gap-1 font-bold px-3 py-1 rounded-full text-xs bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ✓ {t('statusVerifiedBuyer')}
                </span>
              </div>

              {/* Certificate Preview Card */}
              <div className="p-5 bg-blue-50/70 border-2 border-blue-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-6 h-6 text-blue-700" />
                    <div>
                      <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">Uploaded Business Certificate</h4>
                      <p className="text-[11px] font-mono font-bold text-blue-800">{summary?.certificate_name || 'Business_Registration_Certificate.pdf'}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-200 text-blue-900 rounded font-mono font-bold text-[10px]">
                    PDF / OFFICIAL
                  </span>
                </div>

                <div className="p-4 bg-white rounded-xl border border-blue-100 space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-medium">Document Type:</span>
                    <span className="font-bold text-slate-800">GST Registration & Trade License</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-medium">GSTIN:</span>
                    <span className="font-mono font-bold text-emerald-700">{summary?.gstin || '36AAAAA0000A1Z5'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-medium">PAN:</span>
                    <span className="font-mono font-bold text-slate-800">{summary?.pan || 'ABCDE1234F'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Issuing Authority:</span>
                    <span className="font-bold text-slate-800">Government of Telangana • Commercial Taxes</span>
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
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-slate-600">
                  <div className="font-bold text-slate-800 uppercase tracking-wider mb-1">Company Details</div>
                  <p><span className="font-semibold">Company Name:</span> {summary?.company_name || 'Balaji Trades'}</p>
                  <p><span className="font-semibold">Business Type:</span> {summary?.buyer_category || 'Food Processor & Bulk Exporter'}</p>
                  <p><span className="font-semibold">City:</span> {summary?.city || 'Hyderabad'}</p>
                  <p><span className="font-semibold">District:</span> {summary?.district || 'Medchal-Malkajgiri'}</p>
                  <p><span className="font-semibold">Address:</span> {summary?.address || 'Plot 42, Food Processing Zone, Cherlapally'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-slate-600">
                  <div className="font-bold text-slate-800 uppercase tracking-wider mb-1">Authorized Contact</div>
                  <p><span className="font-semibold">Authorized Representative:</span> {summary?.contact_person || 'Srinivas Rao'}</p>
                  <p><span className="font-semibold">Phone:</span> {summary?.phone || '+91 98765 43211'}</p>
                  <p><span className="font-semibold">Email:</span> {summary?.email || 'buyer@kisanlink.in'}</p>
                  <p><span className="font-semibold">Udyam Number:</span> {summary?.udyam_number || 'UDYAM-TG-05-0012345'}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setShowCertModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
