import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { 
  Building2, Sparkles, ShieldCheck, ArrowRight, CheckCircle2, 
  Send, Clock, AlertCircle, RefreshCw, X, FileText
} from 'lucide-react';
import axios from 'axios';

export const BuyersListPage: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const produceId = searchParams.get('produce_id');

  const [buyers, setBuyers] = useState<any[]>([]);
  const [myProduces, setMyProduces] = useState<any[]>([]);
  const [farmerRequests, setFarmerRequests] = useState<any[]>([]);
  const [activeOffers, setActiveOffers] = useState<any[]>([]);
  
  const [cropFilter, setCropFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [sortBy, setSortBy] = useState('recommended');
  const [loading, setLoading] = useState(true);

  // Modal Profile View State
  const [selectedBuyerProfile, setSelectedBuyerProfile] = useState<any>(null);

  // Send Request Modal State
  const [requestModalBuyer, setRequestModalBuyer] = useState<any>(null);
  const [selectedProduceId, setSelectedProduceId] = useState<number | ''>('');
  const [requestCrop, setRequestCrop] = useState('Tomato');
  const [requestQty, setRequestQty] = useState<number>(500);
  const [requestGrade, setRequestGrade] = useState('Grade A');
  const [requestExpectedPrice, setRequestExpectedPrice] = useState<number>(31);
  const [requestPaymentDays, setRequestPaymentDays] = useState('Within 3 Days');
  const [requestMessage, setRequestMessage] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const fetchData = () => {
    let url = `/api/farmer/buyers?sort_by=${sortBy}`;
    if (produceId) url += `&produce_id=${produceId}`;
    if (cropFilter) url += `&crop=${cropFilter}`;
    if (districtFilter) url += `&district=${districtFilter}`;

    axios.get(url)
      .then(res => setBuyers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    // Fetch farmer's own produce
    axios.get('/api/farmer/produce')
      .then(res => {
        setMyProduces(res.data);
        if (res.data.length > 0 && !selectedProduceId) {
          const defaultProd = produceId 
            ? res.data.find((p: any) => p.id === Number(produceId)) || res.data[0]
            : res.data[0];
          setSelectedProduceId(defaultProd.id);
          setRequestCrop(defaultProd.crop_name);
          setRequestQty(defaultProd.quantity || 500);
          setRequestGrade(defaultProd.quality || 'Grade A');
          setRequestExpectedPrice(defaultProd.expected_price || 31);
        }
      })
      .catch(console.error);

    // Fetch existing requests & offers
    axios.get('/api/workflow/requests')
      .then(res => setFarmerRequests(res.data))
      .catch(console.error);

    axios.get('/api/workflow/offers')
      .then(res => setActiveOffers(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchData();
  }, [sortBy, produceId, cropFilter, districtFilter]);

  const openSendRequestModal = (buyer: any) => {
    setRequestModalBuyer(buyer);
    const buyerReqCrop = buyer.crops_required ? buyer.crops_required.split(',')[0].trim() : "Tomato";
    
    // Auto-match produce lot if farmer has matching crop
    const matchedProduce = myProduces.find(p => p.crop_name.toLowerCase() === buyerReqCrop.toLowerCase());
    if (matchedProduce) {
      setSelectedProduceId(matchedProduce.id);
      setRequestCrop(matchedProduce.crop_name);
      setRequestQty(matchedProduce.quantity || buyer.required_quantity || 500);
      setRequestGrade(matchedProduce.quality || buyer.required_grade || 'Grade A');
      setRequestExpectedPrice(matchedProduce.expected_price || buyer.offered_price || 31);
    } else {
      setRequestCrop(buyerReqCrop);
      setRequestQty(buyer.required_quantity || 500);
      setRequestGrade(buyer.required_grade || 'Grade A');
      setRequestExpectedPrice(buyer.offered_price || 31);
    }
    setRequestPaymentDays('Within 3 Days');
    setRequestMessage(`We have ${buyerReqCrop} available with verified Grade A quality. Ready for procurement.`);
  };

  const handleProduceSelectionChange = (pId: string) => {
    if (!pId) {
      setSelectedProduceId('');
      return;
    }
    const numId = Number(pId);
    setSelectedProduceId(numId);
    const found = myProduces.find(p => p.id === numId);
    if (found) {
      setRequestCrop(found.crop_name);
      setRequestQty(found.quantity);
      setRequestGrade(found.quality || 'Grade A');
      setRequestExpectedPrice(found.expected_price);
    }
  };

  const handleSendRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestModalBuyer) return;

    setSubmittingRequest(true);
    const finalNote = requestMessage.trim()
      ? `${requestMessage.trim()} | Requested Payment Terms: ${requestPaymentDays}`
      : `Requested Payment Terms: ${requestPaymentDays}`;

    axios.post('/api/workflow/requests', {
      buyer_id: requestModalBuyer.buyer_id || requestModalBuyer.id,
      produce_id: selectedProduceId ? Number(selectedProduceId) : null,
      crop_name: requestCrop,
      quantity: Number(requestQty),
      quality: requestGrade,
      farmer_expected_price: Number(requestExpectedPrice),
      message: finalNote
    })
    .then(res => {
      showToast(`✓ Request Sent (${res.data.request_code}) to ${requestModalBuyer.company_name}!`, "success");
      setRequestModalBuyer(null);
      fetchData();
    })
    .catch(err => {
      const detail = err.response?.data?.detail || "Could not send request.";
      showToast(detail, "error");
    })
    .finally(() => setSubmittingRequest(false));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-600" />
            {t('buyersList')}
          </h1>
          <p className="text-xs text-slate-500">{t('telanganaFocus')}</p>
        </div>
        <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs text-emerald-800 font-bold">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>{t('aiRankingEnabled')}</span>
        </div>
      </div>

      {/* Filter and Sort Controls */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase">{t('crop')}</label>
          <input
            type="text"
            value={cropFilter}
            onChange={(e) => setCropFilter(e.target.value)}
            placeholder="e.g. Tomato, Paddy..."
            className="w-full mt-1 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase">{t('district')}</label>
          <input
            type="text"
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            placeholder="e.g. Hyderabad, Rangareddy..."
            className="w-full mt-1 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase">{t('score')}</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full mt-1 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
          >
            <option value="recommended">{t('aiRecommendation')}</option>
            <option value="highest_price">{t('offeredPrice')}</option>
            <option value="highest_rating">★ Rating</option>
            <option value="reliability">{t('reliability')}</option>
          </select>
        </div>
      </div>

      {/* Buyers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {buyers.map((buyer) => {
          const buyerId = buyer.buyer_id || buyer.id;
          const pendingReq = farmerRequests.find(r => r.buyer_id === buyerId && r.status === 'PENDING');
          const activeOffer = activeOffers.find(o => o.buyer_id === buyerId && !['REJECTED', 'CANCELLED'].includes(o.status));

          return (
            <div
              key={buyerId}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-500 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <h3 className="font-extrabold text-base text-slate-900">{buyer.company_name}</h3>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> {t('statusVerified')}
                      </span>
                      {pendingReq && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-600" /> Request Sent ✓
                        </span>
                      )}
                      {activeOffer && (
                        <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-blue-300">
                          <Sparkles className="w-3 h-3 text-blue-600" /> {activeOffer.negotiation_id || "Offer Active"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{buyer.contact_person} | {buyer.buyer_category}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{t('location')}: <span className="font-semibold text-slate-800">{buyer.location}</span></p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs bg-amber-100 text-amber-900 font-extrabold px-2.5 py-1 rounded-full border border-amber-300">
                      {t('score')}: {buyer.ai_score}/100
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">⭐ {buyer.rating} ({buyer.reliability_score}%)</p>
                  </div>
                </div>

                {/* Requirement & Pricing details */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">{t('cropRequirement')}</span>
                    <p className="font-bold text-slate-800">{buyer.crops_required}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">{t('offeredPrice')}</span>
                    <p className="font-extrabold text-emerald-700">₹{buyer.offered_price}/kg</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">{t('requiredQuantity')}</span>
                    <p className="font-bold text-slate-800">{buyer.required_quantity} kg</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">{t('estimatedNetRealisation')}</span>
                    <p className="font-extrabold text-slate-900">₹{buyer.estimated_net_realisation?.toLocaleString()}</p>
                  </div>
                </div>

                {/* AI Natural Language Explanation */}
                <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-1">
                  <span className="font-bold text-[10px] uppercase text-amber-700 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> {t('aiLogicHeader')}
                  </span>
                  <p className="text-[11px] font-medium leading-relaxed">
                    {buyer.ai_explanation?.[language] || buyer.ai_explanation?.en || buyer.ai_explanation}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setSelectedBuyerProfile(buyer)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  {t('viewProfile')}
                </button>
                
                {activeOffer ? (
                  <button
                    onClick={() => navigate(`/farmer/negotiations?offer_id=${activeOffer.id}`)}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>View Negotiation</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : pendingReq ? (
                  <button
                    disabled
                    className="flex-1 py-2 bg-amber-50 text-amber-800 border border-amber-300 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Request Sent ✓</span>
                  </button>
                ) : (
                  <button
                    onClick={() => openSendRequestModal(buyer)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>SEND REQUEST</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Send Request Modal */}
      {requestModalBuyer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-full uppercase">
                  Procurement Request
                </span>
                <h3 className="font-extrabold text-lg text-slate-900 mt-1">Send Request to {requestModalBuyer.company_name}</h3>
                <p className="text-xs text-slate-500">Submit your produce lot details to invite an official buyer procurement offer.</p>
              </div>
              <button 
                onClick={() => setRequestModalBuyer(null)} 
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendRequestSubmit} className="space-y-3.5 text-xs">
              {/* Select Produce Lot */}
              {myProduces.length > 0 && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Select from Your Produce Lots</label>
                  <select
                    value={selectedProduceId}
                    onChange={(e) => handleProduceSelectionChange(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  >
                    {myProduces.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.lot_code || `LOT-${p.id}`} — {p.crop_name} ({p.quantity} kg @ ₹{p.expected_price}/kg)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Crop Name *</label>
                  <input
                    type="text"
                    required
                    value={requestCrop}
                    onChange={(e) => setRequestCrop(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Quality Grade *</label>
                  <select
                    value={requestGrade}
                    onChange={(e) => setRequestGrade(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-800"
                  >
                    <option value="Grade A">Grade A (Premium)</option>
                    <option value="Grade B">Grade B (Standard)</option>
                    <option value="Grade C">Grade C (Commercial)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Quantity (kg) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={requestQty}
                    onChange={(e) => setRequestQty(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-extrabold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Expected Price (₹/kg) *</label>
                  <input
                    type="number"
                    required
                    step="0.5"
                    min={1}
                    value={requestExpectedPrice}
                    onChange={(e) => setRequestExpectedPrice(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-extrabold text-emerald-700"
                  />
                </div>
              </div>

              {/* Live Calculation preview */}
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block">Gross Expected Value</span>
                  <span className="text-sm font-extrabold text-emerald-900">₹{(requestQty * requestExpectedPrice).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block">Target Buyer Benchmark</span>
                  <span className="text-sm font-extrabold text-slate-800">₹{requestModalBuyer.offered_price || 31}/kg</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Requested Payment Terms (UPI Only) *</label>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">UPI Only</span>
                </div>
                <select
                  value={requestPaymentDays}
                  onChange={(e) => setRequestPaymentDays(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-800 text-xs"
                >
                  <option value="Within 1 Day">Within 1 Day (Immediate UPI Settlement)</option>
                  <option value="Within 2 Days">Within 2 Days (Fast UPI Settlement)</option>
                  <option value="Within 3 Days">Within 3 Days (Standard UPI Settlement)</option>
                  <option value="Within 5 Days">Within 5 Days (Flexible UPI Settlement)</option>
                  <option value="Within 7 Days">Within 7 Days (Extended UPI Settlement)</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Buyer can Accept or Counter Offer these days during negotiation. Delay penalty applies if payment exceeds agreed days.
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Message / Note to Buyer</label>
                <textarea
                  rows={2}
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="e.g. Freshly harvested, moisture tested, ready for farm-gate pickup."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRequestModalBuyer(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{submittingRequest ? "Sending Request..." : "Send Request"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Buyer Profile Modal */}
      {selectedBuyerProfile && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">{selectedBuyerProfile.company_name}</h3>
                <p className="text-xs text-slate-500">{selectedBuyerProfile.buyer_category} | {selectedBuyerProfile.location}</p>
              </div>
              <button onClick={() => setSelectedBuyerProfile(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p><span className="font-bold text-slate-700">{t('companyId')}:</span> {selectedBuyerProfile.company_id}</p>
              <p><span className="font-bold text-slate-700">{t('contactPerson')}:</span> {selectedBuyerProfile.contact_person}</p>
              <p><span className="font-bold text-slate-700">{t('verificationStatus')}:</span> <span className="text-emerald-700 font-bold">{t('statusVerifiedBuyer')}</span></p>
              <p><span className="font-bold text-slate-700">{t('completedTrades')}:</span> {selectedBuyerProfile.completed_transactions}</p>
              <p><span className="font-bold text-slate-700">{t('reliability')}:</span> {selectedBuyerProfile.reliability_score}%</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setSelectedBuyerProfile(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
              >
                {t('close')}
              </button>
              <button
                onClick={() => {
                  const b = selectedBuyerProfile;
                  setSelectedBuyerProfile(null);
                  openSendRequestModal(b);
                }}
                className="px-5 py-2 bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer"
              >
                {t('startNegotiation')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
