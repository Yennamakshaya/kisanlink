import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Sprout, Upload, X, CheckCircle2, Users, Warehouse, ShieldCheck, Tag, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';

const CROPS = [
  "Tomato", "Paddy", "Rice", "Cotton", "Maize", "Chilli", "Turmeric",
  "Onion", "Red Gram", "Green Gram", "Black Gram", "Groundnut", "Soybean", "Vegetables", "Other"
];

const QUALITIES = ["Grade A", "Grade B", "Grade C", "Premium"];

export const AddProducePage: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Basic Produce Information
  const [cropName, setCropName] = useState('Tomato');
  const [variety, setVariety] = useState('Desi Hybrid (Sahu)');
  const [quantity, setQuantity] = useState<number>(500);
  const [unit, setUnit] = useState('kg');
  const [quality, setQuality] = useState('Grade A');
  const [qualityParams, setQualityParams] = useState('Moisture: 12%, Uniformity: 95%, Zero Pest Damage, Optical Grade');
  const [expectedPrice, setExpectedPrice] = useState<number>(30);
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0] || "2026-09-12");
  const [availableFrom, setAvailableFrom] = useState(new Date().toISOString().split('T')[0] || "2026-09-12");
  const [district, setDistrict] = useState('Rangareddy');
  const [mandal, setMandal] = useState('Farooqnagar');
  const [village, setVillage] = useState('Shadnagar');
  const [pincode, setPincode] = useState('509216');
  const [description, setDescription] = useState('Freshly harvested farm-fresh Grade A produce from red soil fields in Shadnagar.');

  // Lot Details (Section 7)
  const [lotCode, setLotCode] = useState(`LOT-${Math.floor(10000 + Math.random() * 90000)}`);

  // FPO Aggregation Support (Section 6)
  const [isFpo, setIsFpo] = useState<boolean>(false);
  const [fpoName, setFpoName] = useState<string>('Shadnagar Raithu FPO Cooperative');
  const [aggregatedFarmersCount, setAggregatedFarmersCount] = useState<number>(6);

  // Storage & Spoilage Parameters (Section 16)
  const [storageAvailable, setStorageAvailable] = useState<boolean>(true);
  const [storageCostPerDay, setStorageCostPerDay] = useState<number>(1.5);
  const [spoilageRiskPercent, setSpoilageRiskPercent] = useState<number>(3.0);
  
  // Image Upload & Real-time AI Verification state
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageBase64, setImageBase64] = useState<string>('');
  const [verifyingImage, setVerifyingImage] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<{ isMatch: boolean; message: string; detectedCrop: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const runVerification = (base64Str: string, selectedCrop: string) => {
    if (!base64Str) return;
    setVerifyingImage(true);
    axios.post('/api/farmer/verify-produce-image', {
      selected_crop: selectedCrop,
      image_base64: base64Str
    })
    .then((res) => {
      setVerificationResult({
        isMatch: res.data.is_match,
        message: res.data.message,
        detectedCrop: res.data.detected_crop
      });
    })
    .catch(() => {
      setVerificationResult({
        isMatch: false,
        message: `✕ Please upload a valid ${selectedCrop} image.`,
        detectedCrop: "Unknown"
      });
    })
    .finally(() => {
      setVerifyingImage(false);
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const b64 = reader.result as string;
        setImagePreview(b64);
        setImageBase64(b64);
        runVerification(b64, cropName);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropChange = (newCrop: string) => {
    setCropName(newCrop);
    if (imageBase64) {
      runVerification(imageBase64, newCrop);
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!imageBase64) {
      showToast("Please upload an image of the selected produce.", "error");
      return;
    }

    if (!verificationResult || !verificationResult.isMatch) {
      showToast(verificationResult?.message || `✕ Please upload a valid ${cropName} image.`, "error");
      return;
    }

    setLoading(true);

    axios.post('/api/farmer/produce', {
      lot_code: lotCode,
      is_fpo: isFpo,
      fpo_name: isFpo ? fpoName : null,
      aggregated_farmers_count: isFpo ? aggregatedFarmersCount : 1,
      quality_parameters: qualityParams,
      storage_available: storageAvailable,
      storage_cost_per_day: storageCostPerDay,
      spoilage_risk_percent: spoilageRiskPercent,
      crop_name: cropName,
      variety: variety,
      quantity: quantity,
      unit: unit,
      quality: quality,
      expected_price: expectedPrice,
      harvest_date: harvestDate,
      available_from: availableFrom,
      state: "Telangana",
      district: district,
      mandal: mandal,
      village: village,
      pincode: pincode,
      description: description,
      images: imageBase64
    })
    .then((res) => {
      showToast(`✓ Produce Lot ${res.data.lot_code || lotCode} listed successfully!`, "success");
      setTimeout(() => navigate('/farmer/produce'), 1000);
    })
    .catch(err => {
      showToast("Error listing produce: " + (err.response?.data?.detail || "Please try again."), "error");
    })
    .finally(() => setLoading(false));
  };


  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                Lot Creation & Quality Grading
              </span>
              <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2.5 py-0.5 rounded-full border border-purple-300">
                FPO Aggregation Ready
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
              <Sprout className="w-6 h-6 text-emerald-600" />
              Create Produce Lot
            </h1>
            <p className="text-xs text-slate-500">
              List individual harvest lots or aggregate produce collectively as a Farmer Producer Organization (FPO).
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* FPO Aggregation Toggle Card */}
          <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-700" />
                <div>
                  <h4 className="font-extrabold text-sm text-purple-950">Is this an FPO Aggregated Lot?</h4>
                  <p className="text-xs text-purple-700">Aggregate produce from multiple smallholders for higher bargaining power with bulk buyers.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFpo}
                  onChange={(e) => {
                    setIsFpo(e.target.checked);
                    if (e.target.checked) {
                      setLotCode(`LOT-FPO-${Math.floor(10000 + Math.random() * 90000)}`);
                    } else {
                      setLotCode(`LOT-${Math.floor(10000 + Math.random() * 90000)}`);
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {isFpo && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-purple-200 text-xs">
                <div>
                  <label className="font-bold text-purple-900">FPO Organization Name *</label>
                  <input
                    type="text"
                    required
                    value={fpoName}
                    onChange={(e) => setFpoName(e.target.value)}
                    placeholder="e.g. Shadnagar Raithu FPO"
                    className="w-full mt-1 p-2 bg-white border border-purple-300 rounded-xl font-bold text-purple-950"
                  />
                </div>
                <div>
                  <label className="font-bold text-purple-900">Number of Participating Farmers *</label>
                  <input
                    type="number"
                    required
                    min={2}
                    value={aggregatedFarmersCount}
                    onChange={(e) => setAggregatedFarmersCount(Number(e.target.value))}
                    className="w-full mt-1 p-2 bg-white border border-purple-300 rounded-xl font-bold text-purple-950"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Lot & Crop Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Lot ID (Unique Identifier) *
              </label>
              <input
                type="text"
                required
                value={lotCode}
                onChange={(e) => setLotCode(e.target.value)}
                className="w-full mt-1 p-2 text-sm bg-slate-100 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">{t('crop')} *</label>
              <select
                value={cropName}
                onChange={(e) => handleCropChange(e.target.value)}
                className="w-full mt-1 p-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">{t('variety')}</label>
              <input
                type="text"
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                placeholder="e.g. Sahu / Lakshmi Hybrid"
                className="w-full mt-1 p-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">{t('quantity')} (kg) *</label>
              <input
                type="number"
                required
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder="500"
                className="w-full mt-1 p-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Quality / Grading *</label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="w-full mt-1 p-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-800"
              >
                {QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">{t('expectedPrice')} (₹/kg) *</label>
              <input
                type="number"
                required
                min={1}
                value={expectedPrice}
                onChange={(e) => setExpectedPrice(Number(e.target.value))}
                placeholder="30"
                className="w-full mt-1 p-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-700"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">{t('harvestDate')} *</label>
              <input
                type="date"
                required
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                className="w-full mt-1 p-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Available For Pickup From *</label>
              <input
                type="date"
                required
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className="w-full mt-1 p-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Quality Parameters */}
          <div>
            <label className="text-xs font-bold text-slate-700">Quality Parameters & Specifications *</label>
            <input
              type="text"
              required
              value={qualityParams}
              onChange={(e) => setQualityParams(e.target.value)}
              placeholder="e.g. Moisture: 12%, Uniformity: 95%, Size: > 50mm, Grade A certification"
              className="w-full mt-1 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          {/* Storage & Spoilage Parameters (Section 16) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <h4 className="font-extrabold text-xs text-slate-800 uppercase flex items-center gap-1.5">
              <Warehouse className="w-4 h-4 text-emerald-700" />
              Storage & Perishable Holding Capacity
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-600 font-bold">Cold Storage Available?</label>
                <select
                  value={storageAvailable ? "yes" : "no"}
                  onChange={(e) => setStorageAvailable(e.target.value === "yes")}
                  className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-xl font-medium"
                >
                  <option value="yes">Yes — Facility On Site / Nearby</option>
                  <option value="no">No — Must Sell Immediately</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-bold">Storage Cost (₹/kg/day)</label>
                <input
                  type="number"
                  step="0.1"
                  value={storageCostPerDay}
                  onChange={(e) => setStorageCostPerDay(Number(e.target.value))}
                  className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="text-slate-600 font-bold">Daily Spoilage Risk (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={spoilageRiskPercent}
                  onChange={(e) => setSpoilageRiskPercent(Number(e.target.value))}
                  className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-xl font-bold text-red-600"
                />
              </div>
            </div>
          </div>

          {/* Location details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">{t('village')} *</label>
              <input
                type="text"
                required
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="Shadnagar"
                className="w-full mt-1 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">{t('mandal')} *</label>
              <input
                type="text"
                required
                value={mandal}
                onChange={(e) => setMandal(e.target.value)}
                placeholder="Farooqnagar"
                className="w-full mt-1 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">{t('district')} *</label>
              <input
                type="text"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Rangareddy"
                className="w-full mt-1 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">{t('description')}</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide lot background or packaging details..."
              className="w-full mt-1 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          {/* Crop Image Upload & AI Verification Section */}
          <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-emerald-600" />
                Produce Image Verification *
              </label>
              <span className="text-[11px] font-semibold text-slate-500">
                AI Image Analysis Required
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {imagePreview && (
                <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-slate-300 shadow-xs flex-shrink-0 bg-white">
                  <img src={imagePreview} alt="Produce Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview('');
                      setImageBase64('');
                      setVerificationResult(null);
                    }}
                    className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow-xs transition-colors"
                    title="Remove Image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="space-y-2 flex-1 w-full">
                <label className="cursor-pointer inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold shadow-xs transition-colors">
                  <Upload className="w-4 h-4 text-white" />
                  <span>{imagePreview ? "Change Produce Image" : t('chooseImageFile')}</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>

                {/* Verification Status Messages */}
                {verifyingImage ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3.5 py-2.5 rounded-xl">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
                    <span>Analyzing image...</span>
                  </div>
                ) : verificationResult ? (
                  <div
                    className={`flex items-center gap-2 text-xs font-extrabold px-3.5 py-2.5 rounded-xl border ${
                      verificationResult.isMatch
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    {verificationResult.isMatch ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    )}
                    <span>{verificationResult.message}</span>
                  </div>
                ) : !imagePreview ? (
                  <div className="flex items-center gap-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Please upload an image of the selected produce.</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/farmer/produce')}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || verifyingImage || !verificationResult || !verificationResult.isMatch}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? "Publishing Lot..." : "Publish Produce Lot"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
