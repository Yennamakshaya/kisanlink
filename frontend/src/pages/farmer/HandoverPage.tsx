import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Truck, CheckCircle2, MapPin, Calendar, Clock, ArrowRight, Package, Building2, AlertCircle } from 'lucide-react';
import { StatusTimeline } from '../../components/StatusTimeline';
import { TelanganaMap } from '../../components/TelanganaMap';
import axios from 'axios';
import { formatDateOnly } from '../../utils/dateUtils';

export const HandoverPage: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryAgreementId = Number(searchParams.get('agreement_id')) || 0;

  const [handoverDone, setHandoverDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreement, setAgreement] = useState<any>(null);
  const [procurementId, setProcurementId] = useState<number>(1);

  useEffect(() => {
    axios.get('/api/workflow/procurement/active-agreement', {
      params: queryAgreementId ? { agreement_id: queryAgreementId } : undefined
    })
    .then(res => {
      if (res.data) {
        setAgreement(res.data);
        if (res.data.procurement_id) {
          setProcurementId(res.data.procurement_id);
        }
        if (res.data.procurement_status === 'Produce Picked Up' || res.data.procurement_status === 'Quality Confirmed' || res.data.procurement_status === 'Payment Completed') {
          setHandoverDone(true);
        }
      }
    })
    .catch(err => {
      console.warn("Could not fetch active agreement details for handover", err);
    });
  }, [queryAgreementId]);

  const hasBookedSlot = Boolean(agreement?.slot_booking);

  const handleHandover = () => {
    if (!hasBookedSlot) {
      showToast("Please book a procurement slot before confirming produce handover.", "warning");
      return;
    }
    setLoading(true);
    axios.post(`/api/workflow/procurement/${procurementId}/handover`, {
      notes: "Handover completed at farm site in good order."
    })
      .then(res => {
        setHandoverDone(true);
        showToast("Produce handover confirmed and transaction created successfully!", "success");
      })
      .catch((err) => {
        console.error("Handover error:", err);
        showToast("Handover Error: " + (err.response?.data?.detail || "Could not confirm produce handover"), "error");
      })
      .finally(() => setLoading(false));
  };

  const slotCode = agreement?.slot_booking?.slot_code || "SLOT-KL-1024";
  const cropInfo = agreement ? `${agreement.crop_name} (${agreement.quantity} kg)` : "Tomato (500 kg)";
  const locationInfo = agreement?.pickup_location || "Shadnagar, Rangareddy";
  const buyerInfo = agreement?.buyer_company || "Balaji Trades";
  const slotTime = agreement?.slot_booking
    ? `${agreement.slot_booking.slot_date} (${agreement.slot_booking.time_window})`
    : `${formatDateOnly(new Date())} (10:00 AM – 12:00 PM)`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Visual Timeline Tracker */}
      <StatusTimeline currentStatus={handoverDone ? "Produce Picked Up" : "Slot Booked"} />

      {/* Handover Details Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Truck className="w-6 h-6 text-emerald-600" />
              {t('handoverConfirmationTitle')}
            </h1>
            <p className="text-xs text-slate-500">{t('handoverSubtitle')}</p>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-mono font-bold px-3 py-1 rounded-full self-start sm:self-auto">
            {t('bookingSlotCode')}: {slotCode}
          </span>
        </div>

        {/* Map Visualization */}
        <TelanganaMap />

        {/* Details Grid */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 font-bold uppercase flex items-center gap-1">
              <Package className="w-3.5 h-3.5" /> {t('cropAndQuantity')}
            </span>
            <p className="font-extrabold text-slate-900 text-sm mt-0.5">{cropInfo}</p>
          </div>
          <div>
            <span className="text-slate-500 font-bold uppercase flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {t('pickupLocation')}
            </span>
            <p className="font-bold text-slate-800 mt-0.5 truncate">{locationInfo}</p>
          </div>
          <div>
            <span className="text-slate-500 font-bold uppercase flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> {t('receiverBuyer')}
            </span>
            <p className="font-bold text-blue-800 mt-0.5 truncate">{buyerInfo}</p>
          </div>
          <div>
            <span className="text-slate-500 font-bold uppercase flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {t('slotTime')}
            </span>
            <p className="font-bold text-emerald-800 mt-0.5">{slotTime}</p>
          </div>
        </div>

        {/* Slot Not Booked Warning */}
        {!hasBookedSlot && (
          <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 text-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-extrabold text-sm">Procurement Slot Not Booked Yet</p>
                <p className="text-amber-800">
                  A procurement slot must be booked before physical produce handover can take place.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/farmer/slot-booking?agreement_id=${agreement?.id || queryAgreementId}`)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shrink-0 shadow cursor-pointer"
            >
              <span>Book Slot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {handoverDone ? (
          <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="text-lg font-extrabold text-emerald-950">{t('handoverDoneTitle')}</h3>
            <p className="text-xs text-emerald-800">{t('handoverDoneDesc')}</p>
            <button
              onClick={() => navigate('/farmer/transactions?agreement_id=' + (agreement?.id || queryAgreementId))}
              className="mt-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>{t('viewTransactionsStatus')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleHandover}
            disabled={loading || !hasBookedSlot}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>
              {!hasBookedSlot
                ? "Book Procurement Slot First"
                : loading
                ? t('confirmingHandover')
                : t('confirmProduceHandedOver')}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
