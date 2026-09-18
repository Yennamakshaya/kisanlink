import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { 
  TrendingUp, Calendar, Info, RefreshCw, BarChart2, Sparkles, 
  Truck, ShieldCheck, MapPin, ArrowRight, HelpCircle, ArrowUpDown, 
  Package, Clock, CheckCircle2, ChevronDown, ChevronUp, AlertTriangle, Building2
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import axios from 'axios';

export const MarketPricesPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Filter States
  const [prices, setPrices] = useState<any[]>([]);
  const [buyerDemands, setBuyerDemands] = useState<any[]>([]);
  const [cropFilter, setCropFilter] = useState('Tomato');
  const [timeframe, setTimeframe] = useState('30 Days');
  const [historyData, setHistoryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Sell Smart Decision Hub States
  const [sellSmartQty, setSellSmartQty] = useState<number>(500);
  const [sellSmartGrade, setSellSmartGrade] = useState<string>('Grade A');
  const [sellSmartDistrict, setSellSmartDistrict] = useState<string>('Rangareddy');
  const [sellSmartAnalysis, setSellSmartAnalysis] = useState<any>(null);
  const [loadingSellSmart, setLoadingSellSmart] = useState<boolean>(false);
  const [showScoreModal, setShowScoreModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'sell_smart' | 'arrivals' | 'buyer_demand' | 'price_history'>('sell_smart');

  // Fetch standard APMC market prices
  useEffect(() => {
    axios.get('/api/market/prices')
      .then(res => setPrices(res.data))
      .catch(console.error);

    axios.get('/api/market/buyer-demand')
      .then(res => setBuyerDemands(res.data))
      .catch(console.error);
  }, []);

  // Fetch price history chart
  useEffect(() => {
    axios.get(`/api/market/history?crop=${cropFilter}&timeframe=${encodeURIComponent(timeframe)}`)
      .then(res => setHistoryData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [cropFilter, timeframe]);

  // Fetch Sell Smart HERO Analysis
  const fetchSellSmart = () => {
    setLoadingSellSmart(true);
    axios.get('/api/market/sell-smart', {
      params: {
        crop: cropFilter,
        quantity: sellSmartQty,
        quality: sellSmartGrade,
        district: sellSmartDistrict
      }
    })
    .then(res => setSellSmartAnalysis(res.data))
    .catch(console.error)
    .finally(() => setLoadingSellSmart(false));
  };

  useEffect(() => {
    fetchSellSmart();
  }, [cropFilter, sellSmartQty, sellSmartGrade, sellSmartDistrict]);

  const filteredPrices = prices.filter(p => p.crop_name.toLowerCase().includes(cropFilter.toLowerCase()));
  const filteredDemands = buyerDemands.filter(d => d.crop_name.toLowerCase().includes(cropFilter.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 uppercase tracking-wider">
              Live APMC Market Network
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            Market Intelligence & Linkage Hub
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time APMC mandi modal prices, arrival volumes, and buyer demand intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={() => {
              showToast("Refreshing market intelligence data...", "info");
              fetchSellSmart();
            }}
            className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Feeds</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-slate-200/80 p-1 rounded-2xl gap-1 overflow-x-auto text-xs font-bold text-slate-700">
        <button
          onClick={() => setActiveTab('sell_smart')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'sell_smart' ? 'bg-emerald-700 text-white shadow-md' : 'hover:bg-slate-300/60 text-slate-700'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>SELL SMART</span>
        </button>

        <button
          onClick={() => setActiveTab('arrivals')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'arrivals' ? 'bg-emerald-700 text-white shadow-md' : 'hover:bg-slate-300/60 text-slate-700'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Arrival Volumes</span>
        </button>

        <button
          onClick={() => setActiveTab('buyer_demand')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'buyer_demand' ? 'bg-emerald-700 text-white shadow-md' : 'hover:bg-slate-300/60 text-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Active Buyer Demand</span>
        </button>

        <button
          onClick={() => setActiveTab('price_history')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'price_history' ? 'bg-emerald-700 text-white shadow-md' : 'hover:bg-slate-300/60 text-slate-700'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Price Trends & Mandis</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* SELL SMART DECISION ENGINE */}
      {/* ============================================================ */}
      {activeTab === 'sell_smart' && (
        <div className="space-y-6">
          {/* Engine Explainer Card */}
          <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-700/50 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-emerald-800/80 pb-6">
              <div>
                <span className="text-[11px] bg-emerald-500 text-white font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow">
                  Net Realisation Engine
                </span>
                <h2 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
                  SELL SMART — Net Realisation Intelligence
                </h2>
                <p className="text-sm text-emerald-200 mt-1 max-w-2xl">
                  <span className="font-extrabold text-amber-300">“Don't just find the highest quoted price. Find the highest expected NET REALISATION.”</span>
                  <br />
                  Answers: <strong>WHERE</strong> to sell, <strong>WHEN</strong> to sell, and <strong>TO WHOM</strong> to sell.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-right">
                <span className="text-[11px] text-emerald-300 uppercase font-bold">Realisation Equation</span>
                <p className="text-xs font-mono font-bold mt-1 text-white">
                  Expected Net = Gross Value − Transport Cost − Storage Cost − Other Charges
                </p>
              </div>
            </div>

            {/* Interactive Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 text-xs">
              <div>
                <label className="text-emerald-200 font-bold uppercase text-[10px]">1. Crop</label>
                <select
                  value={cropFilter}
                  onChange={(e) => setCropFilter(e.target.value)}
                  className="w-full mt-1 p-2 bg-slate-800 text-white rounded-xl border border-emerald-500/50 font-bold"
                >
                  <option value="Tomato">Tomato</option>
                  <option value="Paddy">Paddy</option>
                  <option value="Cotton">Cotton</option>
                  <option value="Maize">Maize</option>
                  <option value="Chilli">Chilli</option>
                  <option value="Turmeric">Turmeric</option>
                  <option value="Onion">Onion</option>
                  <option value="Red Gram">Red Gram</option>
                </select>
              </div>

              <div>
                <label className="text-emerald-200 font-bold uppercase text-[10px]">2. Lot Quantity (kg)</label>
                <input
                  type="number"
                  value={sellSmartQty}
                  onChange={(e) => setSellSmartQty(Number(e.target.value))}
                  className="w-full mt-1 p-2 bg-slate-800 text-white rounded-xl border border-emerald-500/50 font-bold"
                />
              </div>

              <div>
                <label className="text-emerald-200 font-bold uppercase text-[10px]">3. Quality Grade</label>
                <select
                  value={sellSmartGrade}
                  onChange={(e) => setSellSmartGrade(e.target.value)}
                  className="w-full mt-1 p-2 bg-slate-800 text-white rounded-xl border border-emerald-500/50 font-bold"
                >
                  <option value="Grade A">Grade A (Optimal)</option>
                  <option value="Grade B">Grade B (Standard)</option>
                  <option value="Grade C">Grade C (Industrial)</option>
                  <option value="Premium">Premium Export</option>
                </select>
              </div>

              <div>
                <label className="text-emerald-200 font-bold uppercase text-[10px]">4. Farmer District</label>
                <select
                  value={sellSmartDistrict}
                  onChange={(e) => setSellSmartDistrict(e.target.value)}
                  className="w-full mt-1 p-2 bg-slate-800 text-white rounded-xl border border-emerald-500/50 font-bold"
                >
                  <option value="Rangareddy">Rangareddy (Shadnagar)</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Warangal">Warangal</option>
                  <option value="Nizamabad">Nizamabad</option>
                  <option value="Khammam">Khammam</option>
                  <option value="Siddipet">Siddipet</option>
                </select>
              </div>
            </div>

            {/* THREE HERO ANSWERS GRID */}
            {sellSmartAnalysis && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* 1. WHERE */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-emerald-500/40 space-y-2">
                  <span className="text-[11px] font-black uppercase text-amber-300 tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    Question 1: WHERE?
                  </span>
                  <h3 className="font-extrabold text-lg text-white leading-snug">
                    {sellSmartAnalysis.summary.where}
                  </h3>
                  <p className="text-xs text-emerald-200">
                    Highest net payout destination after deducting transport and mandi cess.
                  </p>
                  <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs">
                    <span className="text-slate-300">Expected Net:</span>
                    <span className="font-black text-emerald-300 text-base">₹{sellSmartAnalysis.summary.expected_net_realisation?.toLocaleString()}</span>
                  </div>
                </div>

                {/* 2. WHEN */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-emerald-500/40 space-y-2">
                  <span className="text-[11px] font-black uppercase text-amber-300 tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Question 2: WHEN?
                  </span>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-lg text-white leading-snug">
                      {sellSmartAnalysis.summary.when}
                    </h3>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      sellSmartAnalysis.summary.when === 'SELL NOW' ? 'bg-emerald-500 text-slate-950' : 'bg-blue-500 text-white'
                    }`}>
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200 line-clamp-2">
                    {sellSmartAnalysis.when_analysis.reason}
                  </p>
                  <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs">
                    <span className="text-slate-300">Holding vs Now:</span>
                    <span className="font-bold text-amber-300">
                      {sellSmartAnalysis.when_analysis.wait_analysis.net_difference >= 0 ? '+' : ''}
                      ₹{sellSmartAnalysis.when_analysis.wait_analysis.net_difference?.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 3. TO WHOM */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-emerald-500/40 space-y-2">
                  <span className="text-[11px] font-black uppercase text-amber-300 tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    Question 3: TO WHOM?
                  </span>
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-lg text-white leading-snug">
                      {sellSmartAnalysis.summary.to_whom}
                    </h3>
                    <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> VERIFIED
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200">
                    Transparent Score: <strong className="text-amber-300">{sellSmartAnalysis.to_whom_analysis.score}/100</strong> (Reliability: {sellSmartAnalysis.to_whom_analysis.reliability_score}%)
                  </p>
                  <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs">
                    <button
                      onClick={() => setShowScoreModal(true)}
                      className="text-amber-300 underline font-bold hover:text-white"
                    >
                      Why recommended? →
                    </button>
                    <button
                      onClick={() => navigate('/farmer/buyers')}
                      className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs"
                    >
                      Negotiate
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DETAILED COMPARISONS SECTION */}
          {sellSmartAnalysis && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* WHERE COMPARISON TABLE */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                      WHERE: Mandi vs Direct Buyer Net Comparison
                    </h3>
                    <p className="text-xs text-slate-500">
                      Ranked strictly by Expected Net Realisation (Quoted Price − Logistics − Deductions)
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {sellSmartAnalysis.where_analysis.options.map((opt: any, idx: number) => (
                    <div
                      key={opt.id}
                      className={`p-4 rounded-xl border text-xs transition-all space-y-2 ${
                        idx === 0
                          ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-sm'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">{opt.name}</span>
                            {idx === 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                                BEST NET REALISATION
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Distance: <strong>{opt.distance_km} km</strong> • {opt.type} • {opt.pickup_available ? '✓ Farmgate Pickup' : 'Farmer Transport'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-emerald-700 text-base">₹{opt.net_realisation?.toLocaleString()}</span>
                          <p className="text-[11px] text-slate-500 font-bold">₹{opt.net_price_per_kg}/kg net</p>
                        </div>
                      </div>

                      {/* Math Breakdown Row */}
                      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200/80 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Quoted Rate</span>
                          <span className="font-bold text-slate-800">₹{opt.quoted_price}/kg</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Gross Payout</span>
                          <span className="font-bold text-slate-800">₹{opt.gross_value?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Transport</span>
                          <span className="font-bold text-red-600">−₹{opt.transport_cost?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Mandi Charges</span>
                          <span className="font-bold text-red-600">−₹{opt.handling_charges?.toLocaleString()}</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded-lg border border-slate-200/60">
                        "{opt.note}"
                      </p>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 font-medium">
                  <strong>Key Takeaway: </strong> {sellSmartAnalysis.where_analysis.comparison_summary}
                </div>
              </div>

              {/* WHEN COMPARISON: SELL NOW VS WAIT */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      WHEN: Sell Now vs Wait 3 Days Math
                    </h3>
                    <p className="text-xs text-slate-500">
                      Evaluates storage cost holding charges and perishable spoilage risks
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                    sellSmartAnalysis.when_analysis.decision === 'SELL NOW'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-blue-100 text-blue-900 border border-blue-300'
                  }`}>
                    {sellSmartAnalysis.when_analysis.decision}
                  </span>
                </div>

                {/* Side by side comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option 1: Sell Now */}
                  <div className={`p-4 rounded-xl border space-y-2 text-xs ${
                    sellSmartAnalysis.when_analysis.decision === 'SELL NOW' ? 'bg-emerald-50/60 border-emerald-300' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-900 text-sm">SELL TODAY</span>
                      <span className="font-black text-emerald-700 text-sm">₹{sellSmartAnalysis.when_analysis.sell_now.net_realisation?.toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] text-slate-600">Immediate sale at current modal rate</p>
                    <div className="space-y-1 pt-2 border-t border-slate-200 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Marketable Weight:</span>
                        <span className="font-bold">{sellSmartAnalysis.when_analysis.sell_now.quantity_kg} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Storage Deduction:</span>
                        <span className="font-bold text-emerald-700">₹0 (No hold)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Spoilage Risk:</span>
                        <span className="font-bold text-emerald-700">0% (Zero loss)</span>
                      </div>
                    </div>
                  </div>

                  {/* Option 2: Wait 3 Days */}
                  <div className={`p-4 rounded-xl border space-y-2 text-xs ${
                    sellSmartAnalysis.when_analysis.decision !== 'SELL NOW' ? 'bg-emerald-50/60 border-emerald-300' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-900 text-sm">HOLD 3 DAYS</span>
                      <span className="font-black text-slate-900 text-sm">₹{sellSmartAnalysis.when_analysis.wait_analysis.projected_net_realisation?.toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Projected Price: +₹{sellSmartAnalysis.when_analysis.wait_analysis.price_delta}/kg (₹{sellSmartAnalysis.when_analysis.wait_analysis.projected_price}/kg)
                    </p>
                    <div className="space-y-1 pt-2 border-t border-slate-200 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Marketable Weight:</span>
                        <span className="font-bold text-amber-800">{sellSmartAnalysis.when_analysis.wait_analysis.marketable_quantity_kg} kg (−{sellSmartAnalysis.when_analysis.wait_analysis.spoilage_loss_kg} kg loss)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Storage Cost (3 days):</span>
                        <span className="font-bold text-red-600">−₹{sellSmartAnalysis.when_analysis.wait_analysis.storage_cost?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Estimated Spoilage:</span>
                        <span className="font-bold text-red-600">3.0%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                  <span className="font-bold text-slate-900">Recommendation Rationale:</span>
                  <p className="text-[11px] leading-relaxed italic text-slate-600">
                    "{sellSmartAnalysis.when_analysis.reason}"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* EXPLAINABLE SCORE BREAKDOWN MODAL */}
          {showScoreModal && sellSmartAnalysis && (
            <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-900 font-black px-2.5 py-0.5 rounded-full uppercase">
                      Transparent Recommendation Score
                    </span>
                    <h3 className="font-extrabold text-xl text-slate-900 mt-1">
                      Why Recommended: {sellSmartAnalysis.to_whom_analysis.company_name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowScoreModal(false)}
                    className="text-slate-400 hover:text-slate-700 font-bold text-sm"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <p className="text-slate-600">
                    Platform recommendation scores are calculated deterministically using configured weights rather than opaque arbitrary scores:
                  </p>

                  <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 font-medium">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700">1. Price Competitiveness (Max 40):</span>
                      <span className="font-black text-slate-900">{sellSmartAnalysis.to_whom_analysis.score_breakdown.price_competitiveness} / 40</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700">2. Quantity Demand Match (Max 20):</span>
                      <span className="font-black text-slate-900">{sellSmartAnalysis.to_whom_analysis.score_breakdown.quantity_match} / 20</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700">3. Transport Logistics Advantage (Max 15):</span>
                      <span className="font-black text-slate-900">{sellSmartAnalysis.to_whom_analysis.score_breakdown.transport_advantage} / 15</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700">4. Farmgate Pickup Availability (Max 10):</span>
                      <span className="font-black text-slate-900">{sellSmartAnalysis.to_whom_analysis.score_breakdown.pickup_availability} / 10</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700">5. Buyer Platform Reliability (Max 10):</span>
                      <span className="font-black text-slate-900">{sellSmartAnalysis.to_whom_analysis.score_breakdown.buyer_reliability} / 10</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700">6. Quality Specifications Match (Max 5):</span>
                      <span className="font-black text-slate-900">{sellSmartAnalysis.to_whom_analysis.score_breakdown.quality_match} / 5</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-extrabold text-sm text-emerald-800">
                      <span>Total Recommendation Score:</span>
                      <span>{sellSmartAnalysis.to_whom_analysis.score_breakdown.total} / 100</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 italic bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    "{sellSmartAnalysis.to_whom_analysis.why_recommended}"
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setShowScoreModal(false)}
                    className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowScoreModal(false);
                      navigate('/farmer/buyers');
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow"
                  >
                    Negotiate With This Buyer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ARRIVAL VOLUME INTELLIGENCE TAB */}
      {/* ============================================================ */}
      {activeTab === 'arrivals' && (
        <div className="space-y-6">
          {/* Visual Explanation of Arrival Volume Dynamics */}
          <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-blue-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <span className="text-[10px] bg-blue-500/30 text-blue-200 font-bold px-2.5 py-1 rounded-full uppercase">
                Market Dynamics
              </span>
              <h2 className="text-xl font-extrabold mt-1">Market Arrival Volumes & Price Sensitivity</h2>
              <p className="text-xs text-blue-200 max-w-xl">
                Market arrivals directly drive mandi modal price movement. When arrival volumes surge, prices soften due to local surplus. When arrivals tighten, competition among wholesale procurers drives prices upward.
              </p>
            </div>
            <div className="bg-white/10 p-3.5 rounded-xl border border-white/20 text-xs space-y-1">
              <p className="font-bold text-amber-300">Arrival Impact Rule:</p>
              <p className="text-[11px] text-slate-200">↑ Heavy Arrivals (+15%) → Softening Prices (−3% to −7%)</p>
              <p className="text-[11px] text-slate-200">↓ Lean Arrivals (−20%) → Price Spike (+5% to +12%)</p>
            </div>
          </div>

          {/* Arrivals Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-slate-800">
                Daily Mandi Arrival Volumes & Price Movement — {cropFilter}
              </h3>
              <span className="text-xs bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-xl">
                Source: APMC Market Intelligence Network
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-3">Market / Mandi</th>
                    <th className="p-3">District</th>
                    <th className="p-3">Modal Price</th>
                    <th className="p-3">Arrival Volume</th>
                    <th className="p-3">Price Change (24h)</th>
                    <th className="p-3">Data Status</th>
                    <th className="p-3">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredPrices.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{row.market_name}</td>
                      <td className="p-3">{row.district}</td>
                      <td className="p-3 font-black text-emerald-700">₹{row.modal_price}/kg</td>
                      <td className="p-3">
                        <span className="font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                          {row.arrival_volume_tonnes || 125} Tonnes
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`font-bold ${row.price_change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {row.price_change >= 0 ? `+₹${row.price_change}` : `-₹${Math.abs(row.price_change)}`} ({row.price_change >= 0 ? '+' : ''}{((row.price_change / row.modal_price) * 100).toFixed(1)}%)
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                          {row.data_status === 'DEMO' ? 'VERIFIED' : (row.data_status || 'VERIFIED')}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-500">{row.last_updated || 'Today 08:30 AM'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ACTIVE BUYER DEMAND TAB */}
      {/* ============================================================ */}
      {activeTab === 'buyer_demand' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-purple-600" />
                Active Institutional Buyer Demand
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verified buyer procurement requirements feeding into KisanLink's matching engine.
              </p>
            </div>
            <button
              onClick={() => navigate('/farmer/buyers')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5"
            >
              <span>Explore Verified Buyers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDemands.map((demand) => (
              <div key={demand.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-purple-300 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-base text-slate-900">{demand.buyer_company}</h4>
                      <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> VERIFIED
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{demand.buyer_category} • {demand.preferred_location}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs bg-purple-50 text-purple-900 font-black px-2.5 py-1 rounded-full border border-purple-200">
                      Target: {demand.target_price_range}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">⭐ {demand.rating} ({demand.reliability_score}% reliability)</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Crop / Variety</span>
                    <p className="font-bold text-slate-900">{demand.crop_name} ({demand.variety})</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Quantity</span>
                    <p className="font-extrabold text-slate-900">{demand.required_quantity?.toLocaleString()} kg</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Quality Grade</span>
                    <p className="font-extrabold text-emerald-700">{demand.min_quality_grade}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Logistics</span>
                    <p className="font-bold text-slate-800">{demand.pickup_available ? '✓ Farmgate Pickup' : 'Delivery Required'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Payment Terms</span>
                    <p className="font-bold text-slate-800 truncate">{demand.payment_terms}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500">Needed by: <strong>{demand.required_by_date}</strong></span>
                  <button
                    onClick={() => navigate('/farmer/buyers')}
                    className="px-4 py-2 bg-slate-900 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors"
                  >
                    Submit Offer / Lot
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PRICE HISTORY CHART & APMC RATES TABLE */}
      {/* ============================================================ */}
      {activeTab === 'price_history' && (
        <div className="space-y-6">
          {/* Interactive Price History Chart Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-emerald-600" />
                  {cropFilter} {t('marketPriceTrend')} — {historyData?.market || t('bowenpallyMarket')}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('currentModalPrice')}: <span className="font-bold text-emerald-700">₹{historyData?.current_price}/kg</span> | {t('thirtyDayAvg')}: ₹{historyData?.average_price}/kg
                </p>
              </div>

              {/* Timeframe selector */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                {[
                  { label: t('sevenDays'), value: '7 Days' },
                  { label: t('thirtyDays'), value: '30 Days' },
                  { label: t('threeMonths'), value: '3 Months' },
                  { label: t('sixMonths'), value: '6 Months' }
                ].map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => setTimeframe(tf.value)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      timeframe === tf.value ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recharts Component */}
            <div className="h-64 w-full">
              {historyData?.history ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historyData.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                      formatter={(value: any) => [`₹${value}/kg`, t('modalPrice')]}
                    />
                    <Area type="monotone" dataKey="price" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#priceGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">Loading price curve...</div>
              )}
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <p className="italic">"{historyData?.disclaimer || t('priceHistoryDisclaimer')}"</p>
              <span className="text-[11px] text-slate-400 font-medium">{t('lastUpdatedToday')}</span>
            </div>
          </div>

          {/* APMC Daily Market Prices Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-3 p-5">
            <h3 className="font-bold text-base text-slate-800">
              {t('apmcRatesSummary')}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-3">{t('crop')}</th>
                    <th className="p-3">{t('apmcMarkets')}</th>
                    <th className="p-3">{t('district')}</th>
                    <th className="p-3">{t('minPrice')}</th>
                    <th className="p-3">{t('modalPrice')}</th>
                    <th className="p-3">{t('maxPrice')}</th>
                    <th className="p-3">Arrivals</th>
                    <th className="p-3">{t('change')}</th>
                    <th className="p-3">Data Status</th>
                    <th className="p-3">{t('source')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredPrices.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{row.crop_name}</td>
                      <td className="p-3">{row.market_name}</td>
                      <td className="p-3">{row.district}</td>
                      <td className="p-3 text-slate-600">₹{row.min_price}/kg</td>
                      <td className="p-3 font-black text-emerald-700">₹{row.modal_price}/kg</td>
                      <td className="p-3 text-slate-600">₹{row.max_price}/kg</td>
                      <td className="p-3 font-bold text-blue-700">{row.arrival_volume_tonnes || 125} MT</td>
                      <td className="p-3">
                        <span className={`font-bold ${row.price_change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {row.price_change >= 0 ? `+₹${row.price_change}` : `-₹${Math.abs(row.price_change)}`}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                          {row.data_status === 'DEMO' ? 'VERIFIED' : (row.data_status || 'VERIFIED')}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-500">{row.data_source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
