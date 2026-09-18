import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Search, Sprout, ShieldCheck, ArrowRight, Sparkles, MapPin } from 'lucide-react';
import axios from 'axios';

export const SearchFarmersPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [farmersProduce, setFarmersProduce] = useState<any[]>([]);
  const [cropFilter, setCropFilter] = useState('Tomato');
  const [districtFilter, setDistrictFilter] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(32);
  const [loading, setLoading] = useState(true);

  // Send Offer Modal state
  const [offerModalItem, setOfferModalItem] = useState<any>(null);
  const [offerPrice, setOfferPrice] = useState<number>(31);
  const [offerQty, setOfferQty] = useState<number>(500);
  const [offerMsg, setOfferMsg] = useState('');

  const fetchFarmers = () => {
    let url = `/api/buyer/farmers?crop=${cropFilter}&max_price=${maxPrice}`;
    if (districtFilter) url += `&district=${districtFilter}`;

    axios.get(url)
      .then(res => setFarmersProduce(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFarmers();
  }, [cropFilter, districtFilter, maxPrice]);

  const handleSendOfferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerModalItem) return;

    axios.post('/api/workflow/offers', {
      produce_id: offerModalItem.produce_id,
      farmer_id: offerModalItem.farmer_id,
      buyer_id: user?.user_id || 1,
      crop_name: offerModalItem.crop_name,
      quantity: offerQty,
      price_per_kg: offerPrice,
      pickup_date: "2026-09-12",
      delivery_location: "Cherlapally, Hyderabad",
      message: offerMsg || `Offer for ${offerModalItem.crop_name}: ₹${offerPrice}/kg for ${offerQty} kg`
    })
    .then(res => {
      showToast("Offer sent to farmer successfully! Proceeding to negotiation.", "success");
      setOfferModalItem(null);
      navigate('/buyer/negotiations');
    })
    .catch(err => showToast("Offer error: " + (err.response?.data?.detail || "Could not send offer"), "error"));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sprout className="w-6 h-6 text-emerald-600" />
            {t('searchFarmers')}
          </h1>
          <p className="text-xs text-slate-500">{t('telanganaFocus')}</p>
        </div>
      </div>

      {/* Search Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase">{t('cropName')}</label>
          <input
            type="text"
            value={cropFilter}
            onChange={(e) => setCropFilter(e.target.value)}
            placeholder="e.g. Tomato, Paddy..."
            className="w-full mt-1 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase">{t('district')}</label>
          <input
            type="text"
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            placeholder="e.g. Rangareddy, Siddipet..."
            className="w-full mt-1 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase">{t('maxBudgetPrice')}</label>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="w-full mt-1 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-700"
          />
        </div>
      </div>

      {/* Matching Farmers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {farmersProduce.map((item) => (
          <div key={item.produce_id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-3 hover:border-blue-400 transition-all">
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">{item.farmer_name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {item.location}
                  </p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-900 font-bold px-2.5 py-1 rounded-full">
                  {t('matchScore')}: {item.match_score}%
                </span>
              </div>

              {/* Produce detail */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{t('crop')}</span>
                  <p className="font-bold text-slate-800">{item.crop_name} ({item.quality})</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{t('quantity')}</span>
                  <p className="font-bold text-slate-800">{item.quantity} kg</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{t('expectedPrice')}</span>
                  <p className="font-extrabold text-emerald-700">₹{item.expected_price}/kg</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{t('reliability')}</span>
                  <p className="font-bold text-slate-800">{item.reliability_score}% ⭐ {item.rating}</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>
            </div>

            <button
              onClick={() => {
                setOfferModalItem(item);
                setOfferPrice(item.expected_price);
                setOfferQty(item.quantity);
              }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{t('sendOfficialOffer')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Send Offer Modal */}
      {offerModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form onSubmit={handleSendOfferSubmit} className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-800">{t('sendOffer')} — {offerModalItem.farmer_name}</h3>
            <p className="text-xs text-slate-500">{t('crop')}: {offerModalItem.crop_name} ({offerModalItem.quality}) | {t('location')}: {offerModalItem.location}</p>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600">{t('offeredPrice')} (₹/kg)</label>
                <input
                  type="number"
                  required
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(Number(e.target.value))}
                  className="w-full mt-1 p-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-700"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600">{t('quantity')} (kg)</label>
                <input
                  type="number"
                  required
                  value={offerQty}
                  onChange={(e) => setOfferQty(Number(e.target.value))}
                  className="w-full mt-1 p-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs flex justify-between font-bold">
              <span className="text-slate-600">{t('grossValue')}:</span>
              <span className="text-slate-900">₹{(offerPrice * offerQty).toLocaleString()}</span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600">{t('negotiationNote')}</label>
              <textarea
                rows={2}
                value={offerMsg}
                onChange={(e) => setOfferMsg(e.target.value)}
                placeholder="Direct pickup from Shadnagar farm site..."
                className="w-full mt-1 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setOfferModalItem(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow"
              >
                {t('sendOffer')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
