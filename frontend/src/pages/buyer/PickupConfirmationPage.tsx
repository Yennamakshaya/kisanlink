import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Truck, CheckCircle2, AlertTriangle, ShieldCheck, CreditCard, ShieldAlert, ArrowRight, AlertCircle, Package, MapPin } from 'lucide-react';
import { StatusTimeline } from '../../components/StatusTimeline';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import axios from 'axios';
import { formatDateTime } from '../../utils/dateUtils';

export const PickupConfirmationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryAgreementId = searchParams.get('agreement_id');
  const queryProcurementId = searchParams.get('procurement_id');
  const queryTransactionId = searchParams.get('transaction_id');

  const { t } = useLanguage();
  const { showToast } = useToast();

  const [agreement, setAgreement] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [expectedQty, setExpectedQty] = useState(500);
  const [receivedQty, setReceivedQty] = useState(500);
  const [quality, setQuality] = useState('Grade A');
  const [status, setStatus] = useState('Accepted');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const [qualityConfirmed, setQualityConfirmed] = useState(false);
  const [disputeRaised, setDisputeRaised] = useState(false);
  const [disputeCode, setDisputeCode] = useState<string | null>(null);
  const [paymentReleased, setPaymentReleased] = useState(false);
  const [paymentTxnCode, setPaymentTxnCode] = useState<string | null>(null);
  const [paymentRef, setPaymentRef] = useState<string | null>(null);
  const [releasedAmount, setReleasedAmount] = useState<number>(0);
  const [submittingQuality, setSubmittingQuality] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Labour negotiation and delay penalty state
  const [labourCharges, setLabourCharges] = useState<number>(0);
  const [labourNotes, setLabourNotes] = useState<string>('');
  const [labourStatus, setLabourStatus] = useState<string>('PENDING');
  const [savingLabour, setSavingLabour] = useState(false);
  const [delayAmount, setDelayAmount] = useState<number>(0);
  const [delayDays, setDelayDays] = useState<number>(0);
  const [farmerUpi, setFarmerUpi] = useState<string>('farmer@upi');

  useEffect(() => {
    setLoading(true);
    const params: Record<string, any> = {};
    if (queryAgreementId) params.agreement_id = queryAgreementId;
    if (queryTransactionId) params.transaction_id = queryTransactionId;

    axios.get('/api/workflow/procurement/active-agreement', { params })
      .then(res => {
        const data = res.data;
        setAgreement(data);
        if (data.quantity) {
          setExpectedQty(data.quantity);
          setReceivedQty(data.quantity);
        }
        if (data.quality) {
          setQuality(data.quality);
        }
        if (data.labour_charges !== undefined) {
          setLabourCharges(Number(data.labour_charges) || 0);
        }
        if (data.labour_notes) {
          setLabourNotes(data.labour_notes);
        }
        if (data.labour_status) {
          setLabourStatus(data.labour_status);
        }
        if (data.delay_amount !== undefined) {
          setDelayAmount(Number(data.delay_amount) || 0);
        }
        if (data.delay_days !== undefined) {
          setDelayDays(Number(data.delay_days) || 0);
        }
        if (data.upi_id) {
          setFarmerUpi(data.upi_id);
        }
        if (data.quality_status === 'CONFIRMED' || data.procurement_status === 'Quality Confirmed') {
          setQualityConfirmed(true);
        } else if (data.procurement_status === 'Quality Rejected / Dispute Raised') {
          setQualityConfirmed(true);
          setDisputeRaised(true);
        }
        if (data.payment_status === 'RELEASED' || data.payment_status === 'VERIFIED' || data.payment_status === 'COMPLETED') {
          setQualityConfirmed(true);
          setPaymentReleased(true);
          setPaymentTxnCode(data.transaction_code);
          setReleasedAmount(data.total_payable_amount || data.payment_amount || data.net_realisation || data.total_value);
        }
      })
      .catch(err => {
        console.warn("Could not load active agreement:", err);
      })
      .finally(() => setLoading(false));
  }, [queryAgreementId, queryTransactionId]);

  const isHandoverCompleted = Boolean(
    agreement?.procurement_status &&
    ['Produce Picked Up', 'Quality Confirmed', 'Payment Completed', 'Quality Rejected / Dispute Raised', 'HANDOVER_COMPLETED', 'PAYMENT_RELEASED', 'COMPLETED'].includes(agreement.procurement_status)
  );

  const baseAgreedAmount = Number(agreement?.agreed_amount || agreement?.net_realisation || agreement?.total_value || 0);
  const totalPayableAmount = Math.round((baseAgreedAmount + Number(labourCharges || 0) + Number(delayAmount || 0)) * 100) / 100;

  const handleSaveLabour = () => {
    const txnId = agreement?.transaction_id || (queryTransactionId ? Number(queryTransactionId) : undefined);
    if (!txnId) {
      showToast("Transaction record not generated yet. Handover must be recorded first.", "warning");
      return;
    }
    setSavingLabour(true);
    axios.post(`/api/workflow/transactions/${txnId}/negotiate-labour`, {
      labour_charges: Number(labourCharges) || 0,
      labour_notes: labourNotes || `Actual labour/unloading amount ₹${labourCharges} agreed post-handover.`,
      action: "agree"
    })
    .then(res => {
      setLabourCharges(res.data.labour_charges);
      setLabourStatus(res.data.labour_status);
      setDelayAmount(res.data.delay_amount || 0);
      setDelayDays(res.data.delay_days || 0);
      showToast(`Labour charges agreed at ₹${res.data.labour_charges}. Total settlement via UPI: ₹${res.data.total_payable_amount}`, "success");
    })
    .catch(err => showToast("Failed to save labour charges: " + (err.response?.data?.detail || err.message), "error"))
    .finally(() => setSavingLabour(false));
  };

  const handleConfirmQuality = (e: React.FormEvent) => {
    e.preventDefault();
    const procId = agreement?.procurement_id || (queryProcurementId ? Number(queryProcurementId) : undefined);
    const txnId = agreement?.transaction_id || (queryTransactionId ? Number(queryTransactionId) : undefined);
    setSubmittingQuality(true);

    axios.post('/api/workflow/procurement/quality-confirm', {
      procurement_id: procId,
      transaction_id: txnId,
      agreement_id: agreement?.id,
      expected_quantity: agreement?.quantity || expectedQty,
      received_quantity: receivedQty,
      quality_received: quality,
      status: status,
      adjustment_reason: adjustmentReason || (status === 'Accepted' ? 'Consignment verified with no discrepancies.' : 'Adjustment applied.')
    })
    .then(res => {
      setQualityConfirmed(true);
      if (res.data?.dispute_raised || status === 'Rejected') {
        setDisputeRaised(true);
        setDisputeCode(res.data?.grievance_code || 'GRV-DISP-1023');
        showToast("Quality audit recorded as REJECTED. Formal dispute registered.", "warning");
      } else {
        showToast("Quality and quantity confirmed successfully!", "success");
      }
    })
    .catch(err => showToast("Confirmation error: " + (err.response?.data?.detail || "Could not confirm audit"), "error"))
    .finally(() => setSubmittingQuality(false));
  };

  const handleProcessPayment = () => {
    const procId = agreement?.procurement_id || (queryProcurementId ? Number(queryProcurementId) : undefined);
    const txnId = agreement?.transaction_id || (queryTransactionId ? Number(queryTransactionId) : undefined);
    setSubmittingPayment(true);

    axios.post('/api/workflow/procurement/release-payment', {
      procurement_id: procId,
      transaction_id: txnId,
      payment_method: "UPI",
      upi_id: farmerUpi,
      labour_charges: Number(labourCharges) || 0,
      delay_amount: Number(delayAmount) || 0
    })
    .then(res => {
      setPaymentReleased(true);
      setPaymentTxnCode(res.data.transaction_code);
      setPaymentRef(res.data.payment_reference);
      setReleasedAmount(res.data.total_payable_amount || res.data.payment_amount || totalPayableAmount);
      showToast("Payment Released Successfully via UPI", "success");
    })
    .catch(err => showToast("Payment error: " + (err.response?.data?.detail || "Could not release payment"), "error"))
    .finally(() => setSubmittingPayment(false));
  };

  const currentTimelineStatus = disputeRaised
    ? "Quality Rejected / Dispute Raised"
    : paymentReleased
    ? (agreement?.final_status === 'COMPLETED' ? "Transaction Completed" : "Payment Released")
    : qualityConfirmed
    ? "Quality Confirmed"
    : isHandoverCompleted
    ? "Produce Picked Up"
    : "Procurement Slot Booked";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <StatusTimeline currentStatus={currentTimelineStatus} />

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Truck className="w-6 h-6 text-blue-600" />
              {t('pickupAuditTitle')}
            </h1>
            <p className="text-xs text-slate-500">{t('pickupAuditSubtitle')}</p>
          </div>
          <span className="text-xs bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full self-start sm:self-auto">
            {t('farmerRole')}: {agreement?.farmer_name || 'Verified Farmer'} ({agreement?.pickup_location || 'Farmgate'})
          </span>
        </div>

        {/* Agreement summary banner */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl text-xs border border-slate-200">
          <div>
            <span className="text-slate-500 font-bold uppercase flex items-center gap-1">
              <Package className="w-3.5 h-3.5" /> Produce
            </span>
            <p className="font-extrabold text-slate-900 text-sm mt-0.5">{agreement?.crop_name || 'Crop'} ({agreement?.quantity || expectedQty} kg)</p>
          </div>
          <div>
            <span className="text-slate-500 font-bold uppercase flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Quality
            </span>
            <p className="font-bold text-slate-800 mt-0.5">{agreement?.quality || quality}</p>
          </div>
          <div>
            <span className="text-slate-500 font-bold uppercase flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5" /> Agreed Produce Amount
            </span>
            <p className="font-bold text-emerald-800 mt-0.5">₹{baseAgreedAmount.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <span className="text-slate-500 font-bold uppercase flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Payment Term
            </span>
            <p className="font-bold text-blue-700 mt-0.5 truncate">Payment as per Negotiation</p>
          </div>
          <div>
            <span className="text-slate-500 font-bold uppercase flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Mode
            </span>
            <p className="font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              UPI Only
            </p>
          </div>
        </div>

        {/* 1. PRODUCE HANDOVER BANNER / STATUS */}
        {isHandoverCompleted ? (
          <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-950">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-black shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </span>
              <div>
                <h2 className="font-black text-sm text-emerald-950">Produce Handover Completed</h2>
                <p className="text-xs text-emerald-800">
                  Physical produce handover has been completed at the farmgate. Next, negotiate actual labour/unloading charges and verify quality & quantity.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-black uppercase px-2.5 py-1 bg-emerald-600 text-white rounded-full shrink-0">
              Handover Completed
            </span>
          </div>
        ) : !loading ? (
          <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 text-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-extrabold text-sm">Produce Handover Pending</p>
                <p className="text-amber-800">
                  Physical produce handover by the farmer has not been confirmed yet. Quality audit and settlement release will unlock once produce handover is recorded.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/buyer/transactions')}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shrink-0 shadow cursor-pointer"
            >
              View Orders
            </button>
          </div>
        ) : null}

        {/* POST-HANDOVER LABOUR / UNLOADING CHARGES NEGOTIATION */}
        {isHandoverCompleted && !disputeRaised && (
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                  <span>Labour / Unloading Charges Negotiation</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Negotiate actual unloading and labour amount between buyer and farmer post-handover.
                </p>
              </div>
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                labourStatus === 'AGREED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {labourStatus === 'AGREED' ? 'Labour Agreed' : 'Pending Agreement'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-700">Actual Labour Charges (₹) *</label>
                <input
                  type="number"
                  min="0"
                  value={labourCharges}
                  disabled={paymentReleased}
                  onChange={(e) => setLabourCharges(Math.max(0, Number(e.target.value)))}
                  className="w-full mt-1 p-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                  placeholder="e.g. 500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Labour / Unloading Details</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={labourNotes}
                    disabled={paymentReleased}
                    onChange={(e) => setLabourNotes(e.target.value)}
                    placeholder="e.g. Unloading labour charges verified and agreed with farmer on-site"
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-xl"
                  />
                  {!paymentReleased && (
                    <button
                      type="button"
                      onClick={handleSaveLabour}
                      disabled={savingLabour}
                      className={`px-4 py-2 text-white font-extrabold text-xs rounded-xl shadow shrink-0 cursor-pointer disabled:opacity-50 transition-all ${
                        labourStatus === 'AGREED' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-slate-800 hover:bg-slate-900'
                      }`}
                    >
                      {savingLabour ? "Saving..." : labourStatus === 'AGREED' ? "✓ Labour Confirmed" : "Confirm Labour Charge"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. BUYER QUALITY & QUANTITY CONFIRMATION */}
        {!qualityConfirmed ? (
          <form onSubmit={handleConfirmQuality} className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-black text-sm text-slate-800 uppercase flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Buyer Quality & Quantity Confirmation</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-bold">Verification Step</span>
            </div>

            {/* Produce details display */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 p-3.5 bg-white rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Crop / Produce</span>
                <span className="font-black text-slate-900 text-sm">{agreement?.crop_name || 'Crop'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Agreed Quantity</span>
                <span className="font-extrabold text-slate-800">{agreement?.quantity || expectedQty} kg</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Quality / Grade</span>
                <span className="font-bold text-slate-800">{agreement?.quality || quality}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Agreed Price</span>
                <span className="font-bold text-emerald-700">₹{agreement?.final_price || 0}/kg</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Payment Term</span>
                <span className="font-bold text-blue-800">Payment as per Negotiation</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Agreed Produce Amount</span>
                <span className="font-black text-slate-900">₹{baseAgreedAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-700">Expected Quantity (kg)</label>
                <input
                  type="number"
                  disabled
                  value={expectedQty}
                  className="w-full mt-1 p-2 text-xs bg-slate-200 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Quantity Received (kg) *</label>
                <input
                  type="number"
                  required
                  value={receivedQty}
                  onChange={(e) => setReceivedQty(Number(e.target.value))}
                  disabled={!isHandoverCompleted}
                  className="w-full mt-1 p-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-900 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Quality / Grade *</label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  disabled={!isHandoverCompleted}
                  className="w-full mt-1 p-2 text-xs bg-white border border-slate-300 rounded-xl font-bold disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="Grade A">Grade A (Premium Export Quality)</option>
                  <option value="Grade B">Grade B (Standard Market Quality)</option>
                  <option value="Grade C">Grade C (Fair Average Quality)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Audit Status *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={!isHandoverCompleted}
                  className="w-full mt-1 p-2 text-xs bg-white border border-slate-300 rounded-xl font-bold disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="Accepted">Accepted — Exact Quality & Quantity Verified</option>
                  <option value="Accepted with Adjustment">Accepted with Adjustment</option>
                  <option value="Rejected">Rejected — Raise Quality Dispute</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Verification Notes</label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  disabled={!isHandoverCompleted}
                  placeholder={status === 'Rejected' ? "Enter reason for rejection..." : "e.g. Clean consignment, verified in good condition"}
                  className="w-full mt-1 p-2 text-xs bg-white border border-slate-300 rounded-xl disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!isHandoverCompleted || submittingQuality}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {!isHandoverCompleted
                  ? "Produce Handover Pending"
                  : submittingQuality
                  ? "Confirming..."
                  : status === 'Rejected'
                  ? 'Record Consignment Rejection'
                  : 'Confirm Quality & Quantity'}
              </span>
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {disputeRaised ? (
              <div className="bg-amber-50 border border-amber-300 p-5 rounded-2xl space-y-3">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-extrabold text-amber-950 text-sm">Quality Audit Rejected — Consignment Flagged for Dispute</h3>
                    <p className="text-xs text-amber-800 mt-1">
                      Direct settlement payment is placed on hold pending mediation by market committee officers.
                    </p>
                    <p className="text-xs font-mono font-bold text-amber-900 mt-2">
                      Formal Grievance Reference: {disputeCode || 'GRV-DISP-1023'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200 flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate('/buyer/grievance')}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
                  >
                    <span>Track / Manage Dispute in Grievance Center</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => navigate('/buyer/transactions')}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl"
                  >
                    View All Transactions
                  </button>
                </div>
              </div>
            ) : (
              /* Verified Quality & Quantity Card */
              <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-black text-emerald-950 text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Quality & Quantity Confirmed (qualityStatus = CONFIRMED, quantityStatus = CONFIRMED)</span>
                  </p>
                  <span className="px-2.5 py-0.5 bg-emerald-600 text-white font-extrabold text-[10px] rounded-full uppercase">
                    Confirmed
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-emerald-900">
                  <div><span className="text-emerald-700 font-medium">Crop:</span> <strong className="font-bold">{agreement?.crop_name}</strong></div>
                  <div><span className="text-emerald-700 font-medium">Quantity Received:</span> <strong className="font-bold">{receivedQty} kg</strong></div>
                  <div><span className="text-emerald-700 font-medium">Quality Grade:</span> <strong className="font-bold">{quality}</strong></div>
                  <div><span className="text-emerald-700 font-medium">Agreed Produce Amount:</span> <strong className="font-bold">₹{baseAgreedAmount.toLocaleString('en-IN')}</strong></div>
                </div>
                {adjustmentReason && <p className="text-emerald-800 text-[11px] italic">Notes: {adjustmentReason}</p>}
              </div>
            )}

            {/* COMMERCIAL SETTLEMENT BREAKDOWN */}
            {!disputeRaised && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-black text-xs uppercase tracking-wider text-slate-700">Settlement Breakdown</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">1. Agreed Produce Amount</span>
                    <span className="font-black text-slate-900 text-sm">₹{baseAgreedAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">2. Actual Labour Charges</span>
                    <span className="font-black text-blue-700 text-sm">₹{Number(labourCharges || 0).toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-slate-400 block font-medium">({labourStatus})</span>
                  </div>
                  <div className={`p-3 rounded-xl border ${delayAmount > 0 ? 'bg-amber-50 border-amber-300 text-amber-950' : 'bg-white border-slate-200 text-slate-900'}`}>
                    <span className="text-slate-500 block text-[11px]">3. Delay Amount</span>
                    <span className={`font-black text-sm ${delayAmount > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                      ₹{Number(delayAmount || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      {delayAmount > 0 ? `Delayed by ${delayDays} day(s)` : '₹0 (On-Time)'}
                    </span>
                  </div>
                  <div className="bg-emerald-100 border border-emerald-300 p-3 rounded-xl">
                    <span className="text-emerald-900 font-bold block text-[11px] uppercase">Total Payable via UPI</span>
                    <span className="font-black text-emerald-950 text-base">₹{totalPayableAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. RELEASE PAYMENT (UPI ONLY) */}
            {!paymentReleased && !disputeRaised ? (
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 text-center">
                <CreditCard className="w-9 h-9 text-emerald-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-black text-slate-900 text-lg">Release Payment via UPI</h3>
                  <p className="text-xs text-slate-600">
                    All payments must be made through UPI only.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl max-w-md mx-auto text-xs text-left space-y-2">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-slate-500 font-medium">Beneficiary Farmer:</span>
                    <span className="font-bold text-slate-900">{agreement?.farmer_name || 'Farmer'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-slate-500 font-medium">Farmer UPI ID:</span>
                    <span className="font-mono font-bold text-emerald-700">{farmerUpi}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-slate-500 font-medium">Settlement Mode:</span>
                    <span className="font-bold text-emerald-800 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      UPI Only
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="font-black text-slate-900">Total Settlement Amount:</span>
                    <span className="font-black text-base text-emerald-700 font-mono">₹{totalPayableAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                
                <button
                  onClick={handleProcessPayment}
                  disabled={submittingPayment}
                  className="w-full max-w-md mx-auto py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{submittingPayment ? "Processing UPI Payment..." : `Release Payment (Pay ₹${totalPayableAmount.toLocaleString('en-IN')} via UPI)`}</span>
                </button>
              </div>
            ) : paymentReleased ? (
              /* Payment Released Success Card */
              <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center space-y-3">
                <ShieldCheck className="w-12 h-12 text-emerald-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-black text-emerald-950 text-xl">Payment Released Successfully via UPI</h3>
                  <p className="text-xs text-emerald-800">
                    Transaction Code: <span className="font-mono font-bold">{paymentTxnCode || agreement?.transaction_code || agreement?.agreement_code || "TXN-KL-2026-1023"}</span>
                  </p>
                  <p className="text-xs text-emerald-800">
                    UPI Reference: <span className="font-mono font-bold">{paymentRef || "UPI/KL/729103859201"}</span>
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 pt-2 text-xs font-bold text-emerald-900">
                    <span className="bg-white px-3 py-1 rounded-lg border border-emerald-200">
                      Agreed: ₹{baseAgreedAmount.toLocaleString('en-IN')}
                    </span>
                    <span className="bg-white px-3 py-1 rounded-lg border border-emerald-200">
                      Labour: ₹{Number(labourCharges || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="bg-white px-3 py-1 rounded-lg border border-emerald-200">
                      Delay: ₹{Number(delayAmount || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="bg-emerald-700 text-white px-3 py-1 rounded-lg">
                      Total Settled: ₹{releasedAmount.toLocaleString('en-IN')} via UPI
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 pt-2">
                    Notification sent to Farmer: "Payment Released via UPI". Awaiting payment verification by the farmer in their ledger.
                  </p>
                </div>
                
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    onClick={() => navigate('/buyer/transactions')}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                  >
                    <span>View in Transactions Ledger</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
