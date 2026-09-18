import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Sprout, PlusCircle, Search, Trash2, ArrowRight, Tag, Users, Warehouse, ShieldCheck } from 'lucide-react';
import axios from 'axios';

const getProduceImage = (imgStr: string | null | undefined) => {
  if (!imgStr) return "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop";
  if (imgStr.startsWith("data:image")) return imgStr;
  if (imgStr.includes(",")) return imgStr.split(",")[0];
  return imgStr;
};

export const MyProducePage: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [produces, setProduces] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);

  const fetchProduce = () => {
    axios.get('/api/farmer/produce')
      .then(res => setProduces(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProduce();
  }, []);

  const confirmDeactivate = () => {
    if (!deactivatingId) return;
    axios.put(`/api/farmer/produce/${deactivatingId}/deactivate`)
      .then(() => {
        showToast("✓ Produce lot deactivated successfully.", "info");
        setDeactivatingId(null);
        fetchProduce();
      })
      .catch(err => {
        showToast("Error deactivating produce: " + (err.response?.data?.detail || "Please try again."), "error");
        setDeactivatingId(null);
      });
  };

  const filtered = produces.filter(p => 
    p.lot_code !== 'LOT-42055' &&
    (p.crop_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.lot_code && p.lot_code.toLowerCase().includes(search.toLowerCase())) ||
    (p.fpo_name && p.fpo_name.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sprout className="w-6 h-6 text-emerald-600" />
            My Produce Lots & FPO Aggregations
          </h1>
          <p className="text-xs text-slate-500">
            Track individual lots and FPO aggregated commodity batches with quality specifications.
          </p>
        </div>
        <button
          onClick={() => navigate('/farmer/add-produce')}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Create New Lot</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by crop, Lot ID (e.g. LOT-00125), or FPO name..."
          className="w-full pl-10 pr-4 py-2.5 bg-white text-sm border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Produce List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-3 hover:border-emerald-400 transition-colors">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-black bg-slate-900 text-white px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                    <Tag className="w-3 h-3 text-amber-300" />
                    {item.lot_code || `LOT-${String(item.id).padStart(5, '0')}`}
                  </span>
                  {item.is_fpo && (
                    <span className="text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Users className="w-3 h-3 text-purple-700" />
                      FPO Aggregation ({item.aggregated_farmers_count || 5} farmers)
                    </span>
                  )}
                </div>

                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                  item.status?.toLowerCase() === 'available'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {item.status}
                </span>
              </div>

              <div className="flex gap-4 items-start">
                <img
                  src={getProduceImage(item.images)}
                  alt={item.crop_name}
                  className="w-24 h-24 object-cover rounded-xl border border-slate-100 shrink-0 shadow-xs"
                />
                <div className="space-y-1 flex-1 text-xs">
                  <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                    {item.crop_name} ({item.variety || "Hybrid"})
                  </h3>
                  {item.fpo_name && (
                    <p className="text-[11px] font-bold text-purple-800">
                      Org: {item.fpo_name}
                    </p>
                  )}
                  <p className="text-slate-600">
                    Quantity: <span className="font-black text-slate-900">{item.quantity?.toLocaleString()} {item.unit}</span> | Grade: <span className="font-black text-emerald-700">{item.quality}</span>
                  </p>
                  <p className="text-slate-600">Expected: <span className="font-black text-emerald-700">₹{item.expected_price}/kg</span> • {item.location}</p>
                  <p className="text-slate-500 text-[11px] truncate">
                    Specs: {item.quality_parameters || "Moisture 12%, Optical Sort"}
                  </p>
                </div>
              </div>

              {/* Storage details if available */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex justify-between items-center">
                <span className="flex items-center gap-1 font-medium">
                  <Warehouse className="w-3.5 h-3.5 text-emerald-600" />
                  {item.storage_available ? "Cold Storage Ready (₹1.5/kg/d)" : "Immediate Dispatch Required"}
                </span>
                <span className="font-bold text-slate-700">Available: {item.available_from}</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              {item.status?.toLowerCase() === 'available' ? (
                <>
                  <button
                    onClick={() => setDeactivatingId(item.id)}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Deactivate
                  </button>
                  <button
                    onClick={() => navigate(`/farmer/buyers?produce_id=${item.id}`)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Find Buyers For Lot</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <div className="w-full flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 italic">Lot Deactivated</span>
                  <span className="text-xs font-extrabold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-xl">
                    Deactivated
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Custom Deactivate Confirmation Modal (Replacing window.confirm) */}
      {deactivatingId !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-slate-200">
            <h3 className="font-extrabold text-base text-slate-900">Deactivate Produce Listing?</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to deactivate this produce listing? It will no longer be visible to institutional buyers.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDeactivatingId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeactivate}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow"
              >
                Yes, Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
