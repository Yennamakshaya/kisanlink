import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { FileCheck, ShieldCheck, CheckSquare, Calendar, ArrowRight, Info, Clock } from 'lucide-react';
import axios from 'axios';
import { formatDateTime, formatDateOnly } from '../../utils/dateUtils';

export const AgreementPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const queryAgrId = id || searchParams.get('id') || searchParams.get('agreement_id');
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [agreement, setAgreement] = useState<any>(null);
  const [agreementsList, setAgreementsList] = useState<any[]>([]);
  const [acceptedTc, setAcceptedTc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signingLoading, setSigningLoading] = useState(false);

  const fetchAgreement = (showLoader = false) => {
    if (showLoader) setLoading(true);
    if (queryAgrId) {
      axios.get(`/api/workflow/agreements/${queryAgrId}`)
        .then(res => setAgreement(res.data))
        .catch(console.error)
        .finally(() => { if (showLoader) setLoading(false); });
    } else {
      // Fetch latest signed agreements for current user
      axios.get('/api/workflow/agreements')
        .then(res => {
          setAgreementsList(res.data);
          if (res.data.length > 0) {
            setAgreement(res.data[0]);
          }
        })
        .catch(console.error)
        .finally(() => { if (showLoader) setLoading(false); });
    }
  };

  useEffect(() => {
    fetchAgreement(true);
    // Auto-poll every 3 seconds to update signature states in real time
    const timer = setInterval(() => {
      fetchAgreement(false);
    }, 3000);
    return () => clearInterval(timer);
  }, [queryAgrId]);

  const currentAgrId = agreement?.id || (queryAgrId ? Number(queryAgrId) : 1);

  const bothSigned = Boolean(agreement?.farmer_signed && agreement?.buyer_signed);
  const isFarmer = user?.role === 'farmer';
  const isBuyer = user?.role === 'buyer';
  const userHasSigned = Boolean((isFarmer && agreement?.farmer_signed) || (isBuyer && agreement?.buyer_signed));
  const otherPartyRole = isFarmer ? 'Buyer' : 'Farmer';

  const handleSignAgreement = () => {
    if (!acceptedTc) {
      showToast("Please check the mandatory Terms & Conditions box before signing.", "warning");
      return;
    }

    setSigningLoading(true);
    axios.post(`/api/workflow/agreements/${currentAgrId}/sign`, {
      accepted_tc: true
    })
    .then(res => {
      setAgreement((prev: any) => ({
        ...prev,
        ...res.data,
        farmer_signed: res.data.farmer_signed,
        buyer_signed: res.data.buyer_signed,
        status: res.data.status,
        signed_at: res.data.signed_at || prev?.signed_at || new Date().toISOString()
      }));

      if (res.data.both_signed) {
        showToast("Both sides have signed! Agreement is now fully executed and procurement slots are unlocked.", "success");
      } else {
        showToast(`You have signed the agreement. Waiting for ${otherPartyRole} to sign.`, "info");
      }
    })
    .catch(err => showToast("Signing Error: " + (err.response?.data?.detail || "Failed to sign agreement"), "error"))
    .finally(() => setSigningLoading(false));
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  if (!agreement) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 space-y-3 max-w-lg mx-auto">
        <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <FileCheck className="w-6 h-6" />
        </div>
        <h3 className="font-extrabold text-base text-slate-800">{t('noSignedAgreementsFound')}</h3>
        <p className="text-xs text-slate-500">{t('noSignedAgreementsDesc')}</p>
        <button
          onClick={() => navigate(user?.role === 'buyer' ? '/buyer/negotiations' : '/farmer/negotiations')}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors inline-flex items-center gap-1.5"
        >
          <span>{t('openNegotiations')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
        <div>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
            {t('agreementCode')} {agreement.agreement_code}
          </span>
          <h1 className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <FileCheck className="w-7 h-7 text-emerald-600" />
            {t('digitalContractTitle')}
          </h1>
          <p className="text-xs text-slate-500">{t('kisanLinkTradeAgreement')}</p>
        </div>

        <div className="text-right">
          <span className={`text-xs font-extrabold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-xs ${
            bothSigned ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950'
          }`}>
            {bothSigned && <CheckSquare className="w-3.5 h-3.5" />}
            <span>
              {bothSigned
                ? 'Both Sides Signed'
                : (agreement.farmer_signed
                    ? 'Waiting for Buyer to sign'
                    : (agreement.buyer_signed ? 'Waiting for Farmer to sign' : (agreement.status || 'Draft')))}
            </span>
          </span>
        </div>
      </div>

      {/* Contract Terms Box */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
        {/* Parties & Signature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase">{t('farmerSeller')}</span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                agreement.farmer_signed ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {agreement.farmer_signed ? <CheckSquare className="w-3 h-3 text-emerald-700" /> : <Clock className="w-3 h-3 text-amber-700" />}
                <span>{agreement.farmer_signed ? 'Farmer Signed' : 'Waiting for Farmer to sign'}</span>
              </span>
            </div>
            <h4 className="font-extrabold text-base text-slate-900">{agreement.farmer_name}</h4>
            <p className="text-xs text-slate-600">{t('location')}: {agreement.farmer_location || 'Shadnagar, Rangareddy'}</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase">{t('buyerProcurer')}</span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                agreement.buyer_signed ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {agreement.buyer_signed ? <CheckSquare className="w-3 h-3 text-emerald-700" /> : <Clock className="w-3 h-3 text-amber-700" />}
                <span>{agreement.buyer_signed ? 'Buyer Signed' : 'Waiting for Buyer to sign'}</span>
              </span>
            </div>
            <h4 className="font-extrabold text-base text-slate-900">{agreement.buyer_company}</h4>
            <p className="text-xs text-slate-600">{t('statusVerifiedBuyer')}</p>
          </div>
        </div>

        {/* Commercial & Financial Breakdown Table */}
        <div className="space-y-2">
          <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">{t('commercialTermsHeader')}</h3>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500">{t('crop')}</span>
              <p className="font-bold text-slate-900 text-sm">{agreement.crop_name} ({agreement.quality || 'Grade A'})</p>
            </div>
            <div>
              <span className="text-slate-500">{t('quantity')}</span>
              <p className="font-bold text-slate-900 text-sm">{agreement.quantity?.toLocaleString()} kg</p>
            </div>
            <div>
              <span className="text-slate-500">{t('agreedPrice')}</span>
              <p className="font-black text-emerald-600 text-sm">₹{agreement.final_price}/kg</p>
            </div>
            <div>
              <span className="text-slate-500">{t('grossValue')}</span>
              <p className="font-bold text-slate-900 text-sm">₹{agreement.total_value?.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-slate-500">Agreed Payment Term</span>
              <p className="font-bold text-blue-700 text-sm">Payment as per Negotiation</p>
              {agreement.negotiated_payment_terms && (
                <span className="text-[10px] text-slate-500 block">({agreement.negotiated_payment_terms})</span>
              )}
            </div>
            <div>
              <span className="text-slate-500">Settlement Mode</span>
              <p className="font-bold text-emerald-700 text-sm flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                UPI Only
              </p>
            </div>
            <div>
              <span className="text-slate-500">Cold Storage Cost</span>
              <p className="font-bold text-slate-700 text-sm">
                {agreement.cold_storage_required && agreement.storage_cost > 0
                  ? `- ₹${agreement.storage_cost.toLocaleString()} (${agreement.storage_duration || 'Applied'})`
                  : '₹0 (Not Required)'}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-emerald-100 p-2.5 rounded-lg border border-emerald-300">
              <span className="text-emerald-900 font-bold uppercase text-[10px]">{t('netRealisationToFarmer')}</span>
              <p className="font-extrabold text-emerald-900 text-base">
                ₹{agreement.net_realisation?.toLocaleString()} {agreement.quantity > 0 && `(Net ₹${roundTwo(agreement.net_realisation / agreement.quantity)}/kg)`}
              </p>
            </div>
          </div>
        </div>

        {/* Full Agreement Text / Black Contract Box */}
        <div className="space-y-2">
          <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">{t('agreementTermsHeader')}</h3>
          <div className="bg-slate-900 text-slate-200 p-6 rounded-xl text-xs font-sans whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto border border-slate-800 space-y-5">

            {/* Section 1: AGREEMENT DETAILS */}
            <div className="border-b border-slate-800 pb-3">
              <h4 className="font-black text-slate-100 uppercase tracking-wide text-xs mb-1.5 text-emerald-400">1. AGREEMENT DETAILS</h4>
              <p><span className="text-slate-400 font-semibold">Agreement ID:</span> <span className="font-mono text-emerald-300 font-bold">{agreement.agreement_code}</span></p>
              <p><span className="text-slate-400 font-semibold">Date & Time:</span> {formatDateTime(agreement.signed_at || agreement.created_at || agreement.procurement_date)}</p>
            </div>

            {/* Section 2: PARTIES */}
            <div className="border-b border-slate-800 pb-3">
              <h4 className="font-black text-slate-100 uppercase tracking-wide text-xs mb-1.5 text-emerald-400">2. PARTIES</h4>
              <p><span className="text-slate-400 font-semibold">Farmer (Seller):</span> <span className="font-bold text-slate-100">{agreement.farmer_name}</span></p>
              <p><span className="text-slate-400 font-semibold">Buyer (Purchaser):</span> <span className="font-bold text-slate-100">{agreement.buyer_company}</span></p>
            </div>

            {/* Section 3: PRODUCE DETAILS */}
            <div className="border-b border-slate-800 pb-3">
              <h4 className="font-black text-slate-100 uppercase tracking-wide text-xs mb-1.5 text-emerald-400">3. PRODUCE DETAILS</h4>
              <p><span className="text-slate-400 font-semibold">Crop:</span> {agreement.crop_name}</p>
              <p><span className="text-slate-400 font-semibold">Quantity:</span> {agreement.quantity?.toLocaleString()} kg</p>
              <p><span className="text-slate-400 font-semibold">Grade / Quality:</span> {agreement.quality || 'Grade A'}</p>
              <p><span className="text-slate-400 font-semibold">Lot ID:</span> <span className="font-mono text-slate-300">{agreement.produce_id ? `LOT-PROD-${agreement.produce_id}` : `LOT-${String(agreement.id).padStart(4, '0')}`}</span></p>
            </div>

            {/* Section 4: COMMERCIAL TERMS */}
            <div className="border-b border-slate-800 pb-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
              <h4 className="font-black text-slate-100 uppercase tracking-wide text-xs mb-1.5 text-emerald-400">4. COMMERCIAL TERMS</h4>
              <p>
                <span className="text-slate-400 font-semibold">Final Agreed Price / kg:</span>{' '}
                <span className="text-emerald-400 font-black text-sm bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/50 inline-block">
                  ₹{agreement.final_price} / kg
                </span>
              </p>
              <p><span className="text-slate-400 font-semibold">Quantity:</span> {agreement.quantity?.toLocaleString()} kg</p>
              <p><span className="text-slate-400 font-semibold">Payment Term:</span> <span className="text-blue-300 font-bold">Payment as per Negotiation</span></p>
              <p><span className="text-slate-400 font-semibold">Settlement Mode:</span> <span className="text-emerald-400 font-bold">UPI Only</span></p>
              <p><span className="text-slate-400 font-semibold">Gross Value:</span> ₹{agreement.total_value?.toLocaleString()}</p>
              <p>
                <span className="text-slate-400 font-semibold">Cold Storage Cost:</span>{' '}
                {agreement.cold_storage_required && agreement.storage_cost > 0
                  ? `₹${agreement.storage_cost.toLocaleString()} (${agreement.storage_duration || 'Applied'})`
                  : '₹0 (Not Required)'}
              </p>
              <p className="pt-1">
                <span className="text-slate-400 font-semibold">Expected Net Realisation:</span>{' '}
                <span className="text-emerald-400 font-black text-sm bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/50 inline-block">
                  ₹{agreement.net_realisation?.toLocaleString()} {agreement.quantity > 0 && `(Net ₹${roundTwo(agreement.net_realisation / agreement.quantity)}/kg)`}
                </span>
              </p>
            </div>

            {/* Section 5: PROCUREMENT */}
            <div className="border-b border-slate-800 pb-3">
              <h4 className="font-black text-slate-100 uppercase tracking-wide text-xs mb-1.5 text-emerald-400">5. PROCUREMENT</h4>
              <p><span className="text-slate-400 font-semibold">Pickup Location:</span> {agreement.pickup_location || `${agreement.farmer_name}'s Farmgate Site`}</p>
              <p><span className="text-slate-400 font-semibold">Procurement Date:</span> {agreement.procurement_date || 'To be scheduled'}</p>
              <p><span className="text-slate-400 font-semibold">Time Slot:</span> {agreement.time_slot || 'Morning (09:00 AM - 12:00 PM)'}</p>
              <p><span className="text-slate-400 font-semibold">Transport Responsibility:</span> Handled directly by Farmer (₹0 platform deduction)</p>
            </div>

            {/* Section 6: QUALITY & QUANTITY */}
            <div className="border-b border-slate-800 pb-3">
              <h4 className="font-black text-slate-100 uppercase tracking-wide text-xs mb-1.5 text-emerald-400">6. QUALITY & QUANTITY</h4>
              <p className="text-slate-300">Buyer verifies the agreed quantity and quality at produce handover.</p>
              <p className="text-slate-300">Any mismatch must be confirmed through KisanLink before payment release.</p>
            </div>

            {/* Section 7: PAYMENT & SETTLEMENT */}
            <div className="border-b border-slate-800 pb-3 space-y-1">
              <h4 className="font-black text-slate-100 uppercase tracking-wide text-xs mb-1.5 text-emerald-400">7. PAYMENT & SETTLEMENT TERMS</h4>
              <p><span className="text-slate-400 font-semibold">Agreed Produce Amount:</span> ₹{(agreement.net_realisation || agreement.total_value)?.toLocaleString()}</p>
              <p><span className="text-slate-400 font-semibold">Payment Term:</span> <span className="text-blue-300 font-bold">Payment as per Negotiation</span></p>
              <p><span className="text-slate-400 font-semibold">Settlement Mode:</span> <span className="text-emerald-400 font-bold">UPI Only</span> (All payments must be made through UPI only)</p>
              <p><span className="text-slate-400 font-semibold">Delay Penalty Clause:</span> <span className="text-amber-300">If the payment is delayed beyond the agreed time, the buyer must pay an additional delay amount to the farmer.</span></p>
              <p><span className="text-slate-400 font-semibold">Labour / Unloading Charges:</span> <span className="text-slate-200">After the load handover, labour/unloading charges should be negotiated between the buyer and farmer based on the actual labour amount and added to UPI settlement.</span></p>
              <p><span className="text-slate-400 font-semibold">Payment Status:</span> {agreement.status === 'Signed' ? 'Escrow Released / Pending Handover' : 'Pending Agreement Confirmation'}</p>
            </div>

            {/* Section 8: CANCELLATION */}
            <div className="border-b border-slate-800 pb-3 space-y-1.5">
              <h4 className="font-black text-slate-100 uppercase tracking-wide text-xs mb-1.5 text-emerald-400">8. CANCELLATION</h4>
              <p className="text-slate-300">Cancellations after agreement signing are governed by standard commercial settlement rules.</p>
              <p className="text-slate-300">If either party cancels a confirmed agreement, the cancellation will be recorded on platform records.</p>
            </div>

            {/* Section 9: DISPUTES */}
            <div className="border-b border-slate-800 pb-3">
              <h4 className="font-black text-slate-100 uppercase tracking-wide text-xs mb-1.5 text-emerald-400">9. DISPUTES</h4>
              <p className="text-slate-300">Quality, quantity, payment, and settlement disputes can be raised through KisanLink Help & Grievances.</p>
            </div>

            {/* Section 10: FINAL AGREEMENT */}
            <div className="border-b border-slate-800 pb-3 space-y-1.5">
              <h4 className="font-black text-slate-100 uppercase tracking-wide text-xs mb-1.5 text-emerald-400">10. FINAL AGREEMENT</h4>
              <p className="text-slate-300">The final accepted offer becomes the agreed commercial terms.</p>
              <p className="text-slate-300">All previous offers and counter-offers remain available in the negotiation history.</p>
            </div>

            {/* Section 11: DIGITAL RECORD */}
            <div>
              <h4 className="font-black text-slate-100 uppercase tracking-wide text-xs mb-1.5 text-emerald-400">11. DIGITAL RECORD</h4>
              <p className="text-slate-300">This agreement records the terms accepted by the Farmer and Buyer through KisanLink.</p>
            </div>

          </div>
        </div>

        {/* Mandatory Signature Checkbox & Action */}
        <div className="bg-amber-50/80 p-5 rounded-2xl border border-amber-200 space-y-4">
          {bothSigned ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-emerald-100 text-emerald-900 rounded-xl border border-emerald-300 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Both Sides Signed & Legally Recorded ({agreement.signed_at ? formatDateTime(agreement.signed_at) : 'Verified'})</span>
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-700 text-white text-[10px] font-extrabold rounded-full uppercase self-start sm:self-auto">
                  Both Sides Signed
                </span>
              </div>
              <button
                onClick={() => navigate(isBuyer ? `/buyer/slot-booking?agreement_id=${currentAgrId}` : `/farmer/slot-booking?agreement_id=${currentAgrId}`)}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Calendar className="w-5 h-5" />
                <span>Book Procurement Slot</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : userHasSigned ? (
            <div className="space-y-3">
              <div className="p-4 bg-amber-100/90 text-amber-950 rounded-xl border border-amber-300 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-black text-sm text-amber-900">
                  <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Waiting for {otherPartyRole} to Sign</span>
                </div>
                <p className="text-amber-900">
                  You have signed this agreement successfully. Digital agreement execution requires signatures from both parties.
                </p>
                <p className="font-bold text-[11px] text-amber-800">
                  Procurement slot booking will unlock once {otherPartyRole} ({isFarmer ? agreement.buyer_company : agreement.farmer_name}) completes their digital signature.
                </p>
              </div>

              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-slate-500 text-xs text-center font-bold flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Procurement Slots Locked (Waiting for Both Sides to Sign)</span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                <span className="text-xs font-black uppercase text-amber-900">
                  {isFarmer ? 'Farmer Digital Signature' : 'Buyer Digital Signature'}
                </span>
                <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded">
                  Pending Your Signature
                </span>
              </div>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTc}
                  onChange={(e) => setAcceptedTc(e.target.checked)}
                  className="mt-1 w-4 h-4 text-emerald-600 rounded border-amber-300 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-amber-950">
                  "{t('termsAcceptanceCheckbox')}"
                </span>
              </label>

              <p className="text-[11px] text-amber-800 italic flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span>{t('signingDisclaimer')} (Agreement is marked fully signed only after both parties have signed).</span>
              </p>

              <button
                onClick={handleSignAgreement}
                disabled={!acceptedTc || signingLoading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>{signingLoading ? "Signing Agreement..." : `Sign Agreement as ${isFarmer ? 'Farmer' : 'Buyer'}`}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function roundTwo(num: number) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
