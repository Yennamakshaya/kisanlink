import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { Sprout, ShoppingBag, Clock, FileCheck, ShieldCheck, ArrowRight, TrendingUp, Sparkles } from 'lucide-react';
import axios from 'axios';

export const FarmerDashboard: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [recommendedBuyers, setRecommendedBuyers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/farmer/dashboard-summary')
      .then(res => setSummary(res.data))
      .catch(console.error);

    axios.get('/api/farmer/buyers?sort_by=recommended')
      .then(res => setRecommendedBuyers(res.data.slice(0, 3)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs bg-emerald-700/80 text-amber-300 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            {t('farmerDashboardTelangana')}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
            {t('welcomeFarmer')} {summary?.farmer_name || "Ramesh Reddy"} 👋
          </h1>
          <p className="text-xs text-emerald-200 mt-1">
            {t('location')}: {summary?.village || "Shadnagar"}, {summary?.district || "Rangareddy"} | {t('reliability')}: {summary?.reliability_score || 96.5}% ⭐ {summary?.rating || 4.9}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate('/farmer/add-produce')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
          >
            <Sprout className="w-4 h-4" />
            <span>+ {t('addProduce')}</span>
          </button>
          <button
            onClick={() => navigate('/farmer/market-prices')}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl border border-emerald-500 transition-all flex items-center gap-1.5"
          >
            <TrendingUp className="w-4 h-4" />
            <span>{t('marketPrice')}</span>
          </button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-semibold">{t('myProduce')}</span>
          <p className="text-2xl font-black text-emerald-800">{summary?.active_produce || 1}</p>
          <span className="text-[11px] text-emerald-600 font-medium">1 {t('availableForSale')}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-semibold">{t('pendingOffers')}</span>
          <p className="text-2xl font-black text-amber-600">{summary?.pending_offers || 0}</p>
          <span className="text-[11px] text-slate-500 font-medium">{t('activeNegotiations')}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-semibold">{t('signedAgreements')}</span>
          <p className="text-2xl font-black text-blue-600">{summary?.active_agreements || 0}</p>
          <span className="text-[11px] text-slate-500 font-medium">{t('statusReadyForSlotBooking')}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-semibold">{t('completedTrades')}</span>
          <p className="text-2xl font-black text-slate-800">{summary?.completed_transactions || 15}</p>
          <span className="text-[11px] text-emerald-600 font-medium">{t('verifiedHistory')}</span>
        </div>
      </div>

      {/* Primary Produce Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
            <Sprout className="w-5 h-5 text-emerald-600" />
            {t('activeProduceListing')}
          </h3>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
            {t('status')}: {t('statusAvailable')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
          <img
            src="https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop"
            alt="Tomato produce"
            className="w-full h-32 object-cover rounded-xl shadow-sm"
          />
          <div className="space-y-1">
            <h4 className="font-black text-lg text-slate-800">Desi Hybrid Tomato</h4>
            <p className="text-xs text-slate-600">{t('quantity')}: <span className="font-bold text-slate-800">500 kg</span> | {t('quality')}: <span className="font-bold text-emerald-700">Grade A</span></p>
            <p className="text-xs text-slate-600">{t('location')}: Shadnagar, Farooqnagar, Rangareddy</p>
            <p className="text-xs text-slate-600">{t('expectedPrice')}: <span className="font-extrabold text-emerald-700">₹30/kg</span></p>
          </div>
          <div className="space-y-2 text-right md:border-l md:border-slate-200 md:pl-4">
            <p className="text-xs text-slate-500 font-medium">{t('estimatedGrossValue')}: <span className="font-bold text-slate-800">₹15,000</span></p>
            <button
              onClick={() => navigate('/farmer/buyers')}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{t('discoverBuyers')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Smart AI Recommended Buyers Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              {t('smartRecommendedBuyers')} (Tomato 500 kg)
            </h3>
            <p className="text-xs text-slate-500">{t('rankedByRealisation')}</p>
          </div>
          <span className="text-[11px] bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full border border-amber-300">
            {t('aiRecommendation')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendedBuyers.map((buyer, idx) => (
            <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 flex flex-col justify-between hover:border-emerald-500 transition-colors">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                    {t('score')}: {buyer.ai_score}/100
                  </span>
                  <span className="text-xs text-slate-500">⭐ {buyer.rating} ({buyer.reliability_score}%)</span>
                </div>
                <h4 className="font-bold text-slate-800 text-sm leading-tight">{buyer.company_name}</h4>
                <p className="text-xs text-slate-600">{buyer.location}</p>
                <div className="bg-white p-2 rounded-lg border border-slate-200 text-xs space-y-0.5">
                  <p className="text-slate-600">{t('offeredPrice')}: <span className="font-bold text-emerald-700">₹{buyer.offered_price}/kg</span></p>
                  <p className="text-slate-600">{t('estimatedNetRealisation')}: <span className="font-bold text-slate-800">₹{buyer.estimated_net_realisation?.toLocaleString()}</span></p>
                </div>
                <p className="text-[11px] text-slate-500 italic line-clamp-2">
                  "{buyer.ai_explanation?.[language] || buyer.ai_explanation?.en || buyer.ai_explanation}"
                </p>
              </div>

              <button
                onClick={() => navigate(`/farmer/buyers?selected_buyer=${buyer.buyer_id}`)}
                className="w-full py-2 bg-slate-900 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors"
              >
                {t('selectAndNegotiate')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
