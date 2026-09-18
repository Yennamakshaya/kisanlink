import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Calendar, Clock, CheckCircle2, Truck, ArrowRight,
  MapPin, Building2, Package, AlertCircle, RefreshCw,
  ShieldCheck, Check, Sparkles, FileText
} from 'lucide-react';
import axios from 'axios';
import { formatDateTime, formatDateOnly, isSlotExpired } from '../../utils/dateUtils';

interface SlotOption {
  id: number;
  date: string;
  raw_date: string;
  time_window: string;
  location: string;
  type: string;
  capacity?: string;
  is_available: boolean;
  status: string;
}

const getDynamicDefaultSlots = (): SlotOption[] => {
  const now = new Date();

  const formatDateStr = (d: Date) => {
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  // Valid future slots strictly starting from ONE DAY AFTER the negotiation/agreement is completed (tomorrow onwards)
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = formatDateStr(tomorrow);
  const tomorrowRaw = tomorrow.toISOString().split('T')[0];

  const dayAfter = new Date(now);
  dayAfter.setDate(now.getDate() + 2);
  const dayAfterStr = formatDateStr(dayAfter);
  const dayAfterRaw = dayAfter.toISOString().split('T')[0];

  const day3 = new Date(now);
  day3.setDate(now.getDate() + 3);
  const day3Str = formatDateStr(day3);
  const day3Raw = day3.toISOString().split('T')[0];

  const day4 = new Date(now);
  day4.setDate(now.getDate() + 4);
  const day4Str = formatDateStr(day4);
  const day4Raw = day4.toISOString().split('T')[0];

  return [
    { id: 1, date: tomorrowStr, raw_date: tomorrowRaw, time_window: "08:00 AM – 10:00 AM", location: "Shadnagar APMC Collection Center, Rangareddy", type: "APMC Collection Yard", capacity: "15 MT", is_available: true, status: "Available (15,000 kg left)" },
    { id: 2, date: tomorrowStr, raw_date: tomorrowRaw, time_window: "10:00 AM – 12:00 PM", location: "Shadnagar APMC Collection Center, Rangareddy", type: "APMC Collection Yard", capacity: "12 MT", is_available: true, status: "Available (12,000 kg left)" },
    { id: 3, date: tomorrowStr, raw_date: tomorrowRaw, time_window: "02:00 PM – 04:00 PM", location: "Direct Farmgate Pickup", type: "Direct Farm Pickup", capacity: "8 MT", is_available: true, status: "Available (8,000 kg left)" },
    { id: 4, date: dayAfterStr, raw_date: dayAfterRaw, time_window: "08:00 AM – 10:00 AM", location: "Khammam APMC Yard Hub, Khammam", type: "APMC Collection Yard", capacity: "20 MT", is_available: true, status: "Available (20,000 kg left)" },
    { id: 5, date: dayAfterStr, raw_date: dayAfterRaw, time_window: "10:00 AM – 12:00 PM", location: "Khammam APMC Yard Hub, Khammam", type: "APMC Collection Yard", capacity: "18 MT", is_available: true, status: "Available (18,000 kg left)" },
    { id: 6, date: day3Str, raw_date: day3Raw, time_window: "09:00 AM – 11:00 AM", location: "Suryapet Logistics Park, Suryapet", type: "Logistics Park Hub", capacity: "25 MT", is_available: true, status: "Available (25,000 kg left)" },
    { id: 7, date: day4Str, raw_date: day4Raw, time_window: "08:00 AM – 10:00 AM", location: "Karimnagar Central Market Yard Hub", type: "APMC Collection Yard", capacity: "15 MT", is_available: true, status: "Available (15,000 kg left)" }
  ];
};

interface ActiveAgreement {
  id: number;
  agreement_code: string;
  crop_name: string;
  quantity: number;
  quality: string;
  final_price: number;
  total_value: number;
  farmer_name: string;
  buyer_company: string;
  pickup_location: string;
  status: string;
  farmer_signed?: boolean;
  buyer_signed?: boolean;
  both_signed?: boolean;
  procurement_id?: number | null;
  slot_booking?: {
    id: number;
    slot_code: string;
    slot_date: string;
    time_window: string;
    location: string;
    status: string;
  } | null;
}

interface BookingSuccessData {
  slot_id: number;
  slot_code: string;
  slot_date: string;
  time_window: string;
  location: string;
  crop_name: string;
  quantity: number;
  buyer_company: string;
  farmer_name: string;
  status: string;
  procurement_id?: number | null;
  agreement_id?: number;
}

export const SlotBookingPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const queryAgreementId = Number(searchParams.get('agreement_id')) || 0;
  const navigate = useNavigate();

  const [agreement, setAgreement] = useState<ActiveAgreement | null>(null);
  const [availableSlots, setAvailableSlots] = useState<SlotOption[]>([]);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<BookingSuccessData | null>(null);

  const isFullySigned = Boolean(
    agreement?.both_signed ||
    (agreement?.farmer_signed && agreement?.buyer_signed) ||
    agreement?.status === 'Both Sides Signed'
  );

  // Load Agreement and Available Slots on Mount
  useEffect(() => {
    fetchInitialData();
  }, [queryAgreementId]);

  const fetchInitialData = async () => {
    setLoading(true);
    setBookingError(null);
    try {
      // 1. Fetch available slots
      const slotsRes = await axios.get('/api/workflow/procurement/available-slots', {
        params: queryAgreementId ? { agreement_id: queryAgreementId } : undefined
      });
      if (Array.isArray(slotsRes.data) && slotsRes.data.length > 0) {
        setAvailableSlots(slotsRes.data);
      } else {
        setAvailableSlots(getDynamicDefaultSlots());
      }

      // 2. Fetch active agreement details
      const agrRes = await axios.get('/api/workflow/procurement/active-agreement', {
        params: queryAgreementId ? { agreement_id: queryAgreementId } : undefined
      });
      if (agrRes.data) {
        setAgreement(agrRes.data);
        if (agrRes.data.slot_booking) {
          setBookingSuccess({
            slot_id: agrRes.data.slot_booking.id,
            slot_code: agrRes.data.slot_booking.slot_code,
            slot_date: agrRes.data.slot_booking.slot_date,
            time_window: agrRes.data.slot_booking.time_window,
            location: agrRes.data.slot_booking.location,
            crop_name: agrRes.data.crop_name,
            quantity: agrRes.data.quantity,
            buyer_company: agrRes.data.buyer_company,
            farmer_name: agrRes.data.farmer_name,
            status: agrRes.data.slot_booking.status || "CONFIRMED",
            procurement_id: agrRes.data.procurement_id,
            agreement_id: agrRes.data.id
          });
        }
      }
    } catch (err: any) {
      console.warn("Could not load full agreement details, setting standard defaults", err);
      if (availableSlots.length === 0) {
        setAvailableSlots(getDynamicDefaultSlots());
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSlotBooking = async () => {
    if (!availableSlots[selectedSlotIndex]) return;

    const chosenSlot = availableSlots[selectedSlotIndex];
    setBookingLoading(true);
    setBookingError(null);

    try {
      const payload = {
        agreement_id: agreement?.id || queryAgreementId || undefined,
        slot_id: chosenSlot.id,
        slot_date: chosenSlot.date,
        time_window: chosenSlot.time_window,
        location: chosenSlot.location,
        crop: agreement?.crop_name || "Grade A Produce",
        quantity: agreement?.quantity || 500
      };

      const response = await axios.post('/api/workflow/procurement/book-slot', payload);

      if (response.data) {
        setBookingSuccess({
          slot_id: response.data.slot_id || 1,
          slot_code: response.data.slot_code,
          slot_date: response.data.slot_date || chosenSlot.date,
          time_window: response.data.time_window || chosenSlot.time_window,
          location: response.data.location || chosenSlot.location,
          crop_name: response.data.crop_name || agreement?.crop_name || "Produce",
          quantity: response.data.quantity || agreement?.quantity || 500,
          buyer_company: response.data.buyer_company || agreement?.buyer_company || "Verified Buyer",
          farmer_name: response.data.farmer_name || agreement?.farmer_name || "Farmer",
          status: response.data.status || "CONFIRMED",
          procurement_id: response.data.procurement_id || 1,
          agreement_id: response.data.agreement_id || agreement?.id
        });
      }
    } catch (err: any) {
      console.error("Slot Booking Error:", err);
      const errorMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Unable to confirm slot booking. Please select another slot or try again.";
      setBookingError(typeof errorMsg === 'string' ? errorMsg : "Slot booking encountered an unexpected error. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-12 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Loading procurement slot options...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center shadow-inner">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span>{t('bookSlotTitle')}</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {t('telanganaHubs')}
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {t('bookSlotSubtitle')}
              </p>
            </div>
          </div>

          {agreement && (
            <div className="bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200 text-right">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{t('activeAgreementLabel')}</span>
              <span className="text-xs font-mono font-bold text-emerald-700">{agreement.agreement_code}</span>
            </div>
          )}
        </div>

        {/* Active Produce Summary Bar */}
        {agreement && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100 text-xs">
            <div>
              <span className="text-[10px] text-emerald-800 font-bold uppercase flex items-center gap-1">
                <Package className="w-3.5 h-3.5" /> {t('crop')}
              </span>
              <p className="font-extrabold text-slate-800">{agreement.crop_name}</p>
            </div>
            <div>
              <span className="text-[10px] text-emerald-800 font-bold uppercase">{t('agreedQuantity')}</span>
              <p className="font-extrabold text-slate-800">{agreement.quantity} kg ({agreement.quality})</p>
            </div>
            <div>
              <span className="text-[10px] text-emerald-800 font-bold uppercase flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> {t('buyerProcurer')}
              </span>
              <p className="font-extrabold text-slate-800 truncate">{agreement.buyer_company}</p>
            </div>
            <div>
              <span className="text-[10px] text-emerald-800 font-bold uppercase">{t('agreedValue')}</span>
              <p className="font-extrabold text-emerald-900 font-mono">₹{agreement.total_value?.toLocaleString() || '0'}</p>
            </div>
          </div>
        )}

        {/* Unsigned / Partially Signed Agreement Warning */}
        {agreement && !isFullySigned && (
          <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 text-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-extrabold text-sm">
                  {agreement.farmer_signed && !agreement.buyer_signed
                    ? "Waiting for Buyer to Sign Agreement"
                    : (!agreement.farmer_signed && agreement.buyer_signed
                        ? "Waiting for Farmer to Sign Agreement"
                        : "Agreement Signatures Pending")}
                </p>
                <p className="text-amber-800">
                  {agreement.farmer_signed && !agreement.buyer_signed
                    ? `Farmer has signed Agreement ${agreement.agreement_code}. Waiting for Buyer to sign before procurement slots unlock.`
                    : (!agreement.farmer_signed && agreement.buyer_signed
                        ? `Buyer has signed Agreement ${agreement.agreement_code}. Waiting for Farmer to sign before procurement slots unlock.`
                        : `Agreement ${agreement.agreement_code} must be signed by both Farmer and Buyer before procurement slots can be booked.`)}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(user?.role === 'buyer' ? `/buyer/agreement/${agreement.id}` : `/farmer/agreement/${agreement.id}`)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shrink-0 shadow cursor-pointer whitespace-nowrap"
            >
              <span>View Agreement</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Error Alert Box */}
        {bookingError && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-3 text-rose-800 text-xs animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">{t('slotBookingNotice')}</p>
              <p className="text-rose-700 font-medium">{bookingError}</p>
            </div>
          </div>
        )}

        {/* SUCCESS CONFIRMATION VIEW */}
        {bookingSuccess ? (
          <div className="bg-emerald-50 border-2 border-emerald-300 p-6 rounded-3xl text-center space-y-5 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg ring-4 ring-emerald-100">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <span className="inline-block text-[11px] font-black uppercase tracking-widest bg-emerald-200 text-emerald-900 px-3 py-1 rounded-full">
                {t('status')}: {bookingSuccess.status === 'CONFIRMED' ? t('statusConfirmed') : bookingSuccess.status}
              </span>
              <h3 className="text-2xl font-black text-emerald-950">{t('slotBookedSuccess')}</h3>
              <p className="text-xs text-emerald-800 font-medium">
                {t('slotBookedSuccessDesc')}
              </p>
            </div>

            {/* Confirmation Details Card */}
            <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm text-left grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('bookingSlotCode')}</span>
                <p className="font-mono font-black text-sm text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
                  {bookingSuccess.slot_code}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('cropAndQuantity')}</span>
                <p className="font-extrabold text-slate-800 text-sm">
                  {bookingSuccess.crop_name} • {bookingSuccess.quantity} kg
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('slotTime')}</span>
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  {bookingSuccess.slot_date} ({bookingSuccess.time_window})
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('collectionCenter')}</span>
                <p className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  {bookingSuccess.location}
                </p>
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-slate-500 font-medium">{t('assignedBuyer')}</span>
                <span className="font-extrabold text-slate-900">{bookingSuccess.buyer_company}</span>
              </div>
            </div>

            {/* Navigation Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => navigate(user?.role === 'buyer' ? `/buyer/pickup-confirmation?agreement_id=${bookingSuccess.agreement_id || agreement?.id}&procurement_id=${bookingSuccess.procurement_id || agreement?.procurement_id}` : `/farmer/handover?agreement_id=${bookingSuccess.agreement_id || agreement?.id}&procurement_id=${bookingSuccess.procurement_id || agreement?.procurement_id}`)}
                className="w-full sm:w-auto px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <Truck className="w-4 h-4" />
                <span>{t('continueToHandover')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => navigate('/farmer/agreements')}
                className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>{t('viewMyAgreements')}</span>
              </button>
            </div>
          </div>
        ) : !isFullySigned ? (
          <div className="bg-slate-50 border border-slate-200 p-8 rounded-3xl text-center space-y-3">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-800">Procurement Slots Locked</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Valid procurement slots starting from one day after agreement completion will appear here once both Farmer and Buyer have digitally signed the agreement.
            </p>
            <button
              onClick={() => navigate(user?.role === 'buyer' ? `/buyer/agreement/${agreement?.id}` : `/farmer/agreement/${agreement?.id}`)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Go to Agreement Page</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* SLOT SELECTION VIEW */
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                {t('slotStepOne')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {availableSlots.map((slot, idx) => {
                  const expired = isSlotExpired(slot.raw_date || slot.date, slot.time_window);
                  const isSelected = selectedSlotIndex === idx;
                  const isAvailable = slot.is_available !== false && !expired;

                  return (
                    <div
                      key={slot.id || idx}
                      onClick={() => isAvailable && setSelectedSlotIndex(idx)}
                      className={`relative p-4 rounded-2xl border transition-all select-none space-y-2.5 ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500 shadow-sm cursor-pointer'
                          : isAvailable
                          ? 'border-slate-200 bg-white hover:border-emerald-400 hover:bg-slate-50/60 shadow-xs cursor-pointer'
                          : 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      {/* Top Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Calendar className={`w-4 h-4 ${isSelected ? 'text-emerald-700' : 'text-slate-500'}`} />
                          <span className="font-extrabold text-slate-800 text-sm">{slot.date}</span>
                        </div>
                        {isSelected ? (
                          <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : expired ? (
                          <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-300">
                            Expired
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                            {slot.status === 'Available' ? t('statusAvailable') : slot.status}
                          </span>
                        )}
                      </div>

                      {/* Time Window */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                        <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{slot.time_window}</span>
                      </div>

                      {/* Hub / Location */}
                      <div className="flex items-start gap-1.5 text-[11px] text-slate-500 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="truncate">{slot.location}</span>
                      </div>

                      {/* Capacity tag */}
                      <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{slot.type}</span>
                        {slot.capacity && <span>Cap: {slot.capacity}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Slot Review Panel */}
            {availableSlots[selectedSlotIndex] && (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>{t('slotStepTwo')}</span>
                  </h3>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                    {t('statusReadyToConfirm')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('scheduledDate')}</span>
                    <span className="font-extrabold text-slate-800">{availableSlots[selectedSlotIndex].date}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('timeWindow')}</span>
                    <span className="font-extrabold text-emerald-800">{availableSlots[selectedSlotIndex].time_window}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('collectionCenter')}</span>
                    <span className="font-bold text-slate-800 truncate block">{availableSlots[selectedSlotIndex].location}</span>
                  </div>
                </div>

                {/* Confirm Button */}
                <button
                  onClick={handleConfirmSlotBooking}
                  disabled={bookingLoading || !availableSlots[selectedSlotIndex].is_available || !isFullySigned}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
                >
                  {bookingLoading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>{t('confirmingSlotReservation')}</span>
                    </>
                  ) : agreement && agreement.status !== 'Signed' ? (
                    <>
                      <AlertCircle className="w-5 h-5 text-amber-300" />
                      <span>Sign Agreement to Book Slot</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      <span>{t('confirmAndBookSlot')}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
