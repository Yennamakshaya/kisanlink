import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  ShieldCheck, TrendingUp, Package, Truck, Star, ArrowRight,
  Eye, RefreshCw, AlertCircle, CheckCircle2, Clock, MapPin,
  Building2, User, Receipt, CreditCard, ChevronRight, X, Sparkles,
  DollarSign, ArrowDownRight, FileText
} from 'lucide-react';
import axios from 'axios';
import { formatDateTime, formatDateOnly } from '../../utils/dateUtils';

interface PaymentInfo {
  id?: number | null;
  amount: number;
  amount_due: number;
  status: string;
  payment_method: string;
  upi_id?: string;
  labour_charges?: number;
  delay_amount?: number;
  payment_reference?: string | null;
  payment_date?: string | null;
}

interface FeedbackInfo {
  id?: number;
  rating: number;
  comments?: string | null;
  created_at?: string | null;
}

interface TransactionItem {
  id: number;
  transaction_code: string;
  agreement_id: number;
  agreement_code?: string;
  produce_id?: number | null;
  booking_id?: number | null;
  procurement_id?: number | null;
  crop_name: string;
  quantity: number;
  price_per_kg: number;
  gross_value: number;
  transport_cost: number;
  storage_cost: number;
  other_costs: number;
  net_realisation: number;
  agreed_amount?: number;
  labour_charges?: number;
  labour_notes?: string;
  labour_status?: string;
  labour_proposed_by?: string;
  delay_amount?: number;
  delay_days?: number;
  total_payable_amount?: number;
  payment_method?: string;
  upi_id?: string;
  net_price_per_kg: number;
  procurement_status: string;
  payment_status: string;
  final_status: string;
  transaction_status?: string;
  quality_status?: string;
  quantity_status?: string;
  quality_grade?: string;
  payment_terms?: string;
  payment_due_date?: string;
  cold_storage_required?: boolean;
  storage_duration?: string;
  payment_amount?: number;
  released_by?: number | null;
  released_at?: string | null;
  verified_by?: number | null;
  verified_at?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  farmer_name: string;
  farmer_village?: string;
  farmer_district?: string;
  buyer_company: string;
  buyer_city?: string;
  buyer_district?: string;
  slot_date?: string;
  slot_window?: string;
  pickup_location?: string;
  payment?: PaymentInfo;
  user_feedback?: FeedbackInfo | null;
  other_feedback?: FeedbackInfo | null;
}

export const FarmerTransactionsPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [ratingModalTx, setRatingModalTx] = useState<TransactionItem | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [comments, setComments] = useState<string>('Excellent procurement experience, timely handover and transparent pricing.');
  const [submittingRating, setSubmittingRating] = useState<boolean>(false);
  const [payingTxId, setPayingTxId] = useState<number | null>(null);
  const [verifyingTxId, setVerifyingTxId] = useState<number | null>(null);

  const isFarmer = user?.role === 'farmer';
  const isBuyer = user?.role === 'buyer';
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  const fetchTransactions = () => {
    setLoading(true);
    axios.get('/api/workflow/transactions')
      .then(res => {
        if (Array.isArray(res.data)) {
          setTransactions(res.data);
        } else {
          setTransactions([]);
        }
      })
      .catch(err => {
        console.error("Error loading transactions:", err);
        setTransactions([]);
      })
      .finally(() => setLoading(false));
  };

  const handleOpenRating = (tx: TransactionItem) => {
    setRatingModalTx(tx);
    if (tx.user_feedback) {
      setRating(tx.user_feedback.rating || 5);
      setComments(tx.user_feedback.comments || '');
    } else {
      setRating(5);
      setComments('Excellent trade partner! Fast communication and reliable process.');
    }
  };

  const handleSubmitRating = async () => {
    if (!ratingModalTx) return;
    setSubmittingRating(true);
    try {
      await axios.post('/api/workflow/feedback', {
        transaction_id: ratingModalTx.id,
        rating: rating,
        comments: comments
      });
      showToast("Feedback submitted successfully!", "success");
      setRatingModalTx(null);
      fetchTransactions();
    } catch (err: any) {
      showToast("Feedback Notice: " + (err.response?.data?.detail || "Could not submit feedback. Please try again."), "error");
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleProcessPayment = async (txId: number) => {
    setPayingTxId(txId);
    try {
      await axios.post(`/api/workflow/transactions/${txId}/release-payment`, {});
      showToast("Payment Released Successfully", "success");
      fetchTransactions();
      if (selectedTx && selectedTx.id === txId) {
        setSelectedTx(prev => prev ? { ...prev, payment_status: 'RELEASED', final_status: 'PAYMENT_RELEASED' } : null);
      }
    } catch (err: any) {
      showToast("Payment Error: " + (err.response?.data?.detail || "Could not process settlement."), "error");
    } finally {
      setPayingTxId(null);
    }
  };

  const handleVerifyPayment = async (txId: number) => {
    setVerifyingTxId(txId);
    try {
      await axios.post(`/api/workflow/transactions/${txId}/verify-payment`, {});
      showToast("Transaction Completed Successfully", "success");
      fetchTransactions();
      if (selectedTx && selectedTx.id === txId) {
        setSelectedTx(prev => prev ? {
          ...prev,
          payment_status: 'VERIFIED',
          final_status: 'COMPLETED',
          transaction_status: 'COMPLETED'
        } : null);
      }
    } catch (err: any) {
      showToast("Verification Error: " + (err.response?.data?.detail || "Could not verify payment."), "error");
    } finally {
      setVerifyingTxId(null);
    }
  };

  // Financial aggregates
  const totalGross = transactions.reduce((acc, t) => acc + (t.gross_value || 0), 0);
  const totalStorage = transactions.reduce((acc, t) => acc + (t.storage_cost || 0), 0);
  const totalNet = transactions.reduce((acc, t) => acc + (t.net_realisation || 0), 0);
  const completedSettlements = transactions.filter(t => 
    t.payment_status?.toUpperCase() === 'COMPLETED' || 
    t.payment_status?.toUpperCase() === 'VERIFIED' || 
    t.final_status?.toUpperCase() === 'COMPLETED'
  ).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">
              {isBuyer ? t('buyerTransactionsTitle') : isAdmin ? t('adminTransactionsTitle') : t('transactionsLedgerTitle')}
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {isBuyer
              ? t('buyerLedgerSubtitle')
              : isAdmin
              ? t('adminLedgerSubtitle')
              : t('farmerLedgerSubtitle')}
          </p>
        </div>

        <button
          onClick={fetchTransactions}
          disabled={loading}
          className="self-start md:self-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{t('refreshLedger')}</span>
        </button>
      </div>

      {/* Metric Cards Summary */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t('totalGrossTrade')}</span>
            <p className="text-xl font-black text-slate-800 font-mono">₹{totalGross.toLocaleString()}</p>
            <span className="text-[10px] text-slate-500 font-medium">{transactions.length} {t('tradeContractsCount')}</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cold Storage Deductions</span>
            <p className="text-xl font-black text-slate-800 font-mono">₹{totalStorage.toLocaleString()}</p>
            <span className="text-[10px] text-slate-500 font-medium">{totalStorage > 0 ? 'Preservation Applied' : 'No Storage Required (₹0)'}</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">{t('totalNetRealisation')}</span>
            <p className="text-xl font-black text-emerald-900 font-mono">₹{totalNet.toLocaleString()}</p>
            <span className="text-[10px] text-emerald-700 font-bold">{t('directFarmerProceeds')}</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t('paymentSettlements')}</span>
            <p className="text-xl font-black text-blue-700 font-mono">{completedSettlements}</p>
            <span className="text-[10px] text-emerald-600 font-bold">Completed UPI Settlements</span>
          </div>
        </div>
      )}

      {/* TRANSACTIONS TABLE / EMPTY STATE */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-xs font-bold text-slate-500">Loading...</p>
          </div>
        ) : transactions.length === 0 ? (
          /* USEFUL EMPTY STATE */
          <div className="p-16 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
              <Receipt className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-800">{t('noTransactionsYet')}</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {t('noTransactionsDesc')}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => navigate(isBuyer ? '/buyer/search-farmers' : '/farmer/produce')}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>{isBuyer ? t('searchFarmersBtn') : t('myProduce')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* RESPONSIVE TRANSACTION TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4">{t('txnCode')}</th>
                  <th className="p-4">{t('cropAndQuantity')}</th>
                  <th className="p-4">{isBuyer ? t('farmerRole') : isAdmin ? t('counterparties') : t('buyerProcurer')}</th>
                  <th className="p-4">Agreed Amount</th>
                  <th className="p-4">Labour Charges</th>
                  <th className="p-4">Delay Amount</th>
                  <th className="p-4">Total Settled (UPI)</th>
                  <th className="p-4">{t('paymentStatus')}</th>
                  <th className="p-4 text-center">{t('feedbackActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {transactions.map((tItem) => {
                  const isCompleted = tItem.payment_status === 'COMPLETED' || tItem.payment_status === 'Completed' || tItem.payment_status === 'VERIFIED' || tItem.final_status === 'COMPLETED';
                  const isReleased = tItem.payment_status === 'RELEASED' || tItem.payment_status === 'PAYMENT_RELEASED';
                  const agreedProduceAmt = tItem.agreed_amount || tItem.net_realisation || 0;
                  const labourAmt = tItem.labour_charges || 0;
                  const delayAmt = tItem.delay_amount || 0;
                  const totalSettlement = tItem.total_payable_amount || (agreedProduceAmt + labourAmt + delayAmt);

                  return (
                    <tr key={tItem.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Txn Code */}
                      <td className="p-4">
                        <button
                          onClick={() => setSelectedTx(tItem)}
                          className="font-mono font-black text-emerald-700 hover:text-emerald-900 underline decoration-dotted flex items-center gap-1 cursor-pointer text-xs"
                        >
                          <span>{tItem.transaction_code}</span>
                        </button>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{formatDateTime(tItem.created_at)}</span>
                      </td>

                      {/* Crop & Qty */}
                      <td className="p-4">
                        <div className="font-extrabold text-slate-900">{tItem.crop_name}</div>
                        <span className="text-[11px] text-slate-500">{tItem.quantity} kg • ₹{tItem.price_per_kg}/kg</span>
                      </td>

                      {/* Counterparty */}
                      <td className="p-4">
                        {isAdmin ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-800">{tItem.farmer_name}</div>
                            <div className="text-[11px] text-blue-700">→ {tItem.buyer_company}</div>
                          </div>
                        ) : isBuyer ? (
                          <div>
                            <span className="font-bold text-slate-800 block">{tItem.farmer_name}</span>
                            <span className="text-[10px] text-slate-400">{tItem.farmer_village}, {tItem.farmer_district}</span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-slate-800 block">{tItem.buyer_company}</span>
                            <span className="text-[10px] text-slate-400">{tItem.buyer_city || tItem.buyer_district || 'Direct Buyer'}</span>
                          </div>
                        )}
                      </td>

                      {/* Agreed Amount */}
                      <td className="p-4 font-mono font-bold text-slate-900">
                        ₹{agreedProduceAmt.toLocaleString()}
                      </td>

                      {/* Labour Charges */}
                      <td className="p-4 font-mono">
                        <span className={labourAmt > 0 ? "font-bold text-blue-700" : "text-slate-500"}>
                          ₹{labourAmt.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-normal capitalize">
                          {tItem.labour_status || 'agreed'}
                        </span>
                      </td>

                      {/* Delay Amount */}
                      <td className="p-4 font-mono">
                        <span className={delayAmt > 0 ? "font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" : "text-slate-500"}>
                          ₹{delayAmt.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {delayAmt > 0 ? `${tItem.delay_days || 1}d delay` : 'On-time'}
                        </span>
                      </td>

                      {/* Total Settlement (UPI) */}
                      <td className="p-4 font-mono">
                        <span className="font-black text-emerald-800 text-sm block">
                          ₹{totalSettlement.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                          UPI Only
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td className="p-4">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            COMPLETED
                          </span>
                        ) : isReleased ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-300">
                            <Clock className="w-3 h-3 text-blue-700" />
                            {isFarmer ? "RELEASED (UPI)" : isBuyer ? "RELEASED (UPI)" : "RELEASED"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3" />
                            {tItem.payment_status || "PENDING"}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Farmer: Verify Payment Button */}
                          {isFarmer && isReleased && (
                            <button
                              onClick={() => handleVerifyPayment(tItem.id)}
                              disabled={verifyingTxId === tItem.id}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-[11px] rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{verifyingTxId === tItem.id ? "Verifying..." : "Verify Payment"}</span>
                            </button>
                          )}

                          {/* Buyer: Confirm Quality & Quantity if Handover Done but not confirmed */}
                          {isBuyer && tItem.procurement_status === 'HANDOVER_COMPLETED' && tItem.quality_status !== 'CONFIRMED' && !isCompleted && !isReleased && (
                            <button
                              onClick={() => navigate(`/buyer/pickup-confirmation?agreement_id=${tItem.agreement_id}&transaction_id=${tItem.id}`)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Confirm Quality & Qty</span>
                            </button>
                          )}

                          {/* Buyer: Release Payment Button if confirmed but pending */}
                          {isBuyer && (tItem.quality_status === 'CONFIRMED' || tItem.procurement_status === 'Quality Confirmed') && !isCompleted && !isReleased && (
                            <button
                              onClick={() => handleProcessPayment(tItem.id)}
                              disabled={payingTxId === tItem.id}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-[11px] rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>{payingTxId === tItem.id ? "Releasing..." : "Release Payment"}</span>
                            </button>
                          )}

                          {/* Feedback Button */}
                          <button
                            onClick={() => handleOpenRating(tItem)}
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] rounded-xl shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span>{tItem.user_feedback ? `${tItem.user_feedback.rating} ${t('starFeedback')}` : t('giveFeedback')}</span>
                          </button>

                          {/* View Details */}
                          <button
                            onClick={() => setSelectedTx(tItem)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            title="View Transaction Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TRANSACTION DETAILS MODAL */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center font-black">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">{t('transactionBreakdown')}</h3>
                  <span className="font-mono text-xs font-bold text-emerald-700">{selectedTx.transaction_code}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedTx(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Handover & Quality Confirmation Banner */}
            <div className="bg-emerald-50 border border-emerald-300 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-950 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Produce Handover Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200">
                  Quality: {selectedTx.quality_status || 'CONFIRMED'}
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200">
                  Quantity: {selectedTx.quantity_status || 'CONFIRMED'}
                </span>
                {selectedTx.quality_grade && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md border border-blue-200">
                    Grade: {selectedTx.quality_grade}
                  </span>
                )}
              </div>
            </div>

            {/* Produce & Parties Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('cropAndQuantity')}</span>
                <span className="font-extrabold text-slate-900">{selectedTx.crop_name} ({selectedTx.quantity} kg)</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('farmerSeller')}</span>
                <span className="font-bold text-slate-800">{selectedTx.farmer_name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('buyerProcurer')}</span>
                <span className="font-bold text-blue-800">{selectedTx.buyer_company}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('unitRate')}</span>
                <span className="font-bold text-slate-900">₹{selectedTx.price_per_kg} / kg</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('status')}</span>
                <span className="font-bold text-emerald-700">{selectedTx.procurement_status}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Payment Term</span>
                <span className="font-bold text-blue-800">Payment as per Negotiation</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Settlement Mode</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                  UPI Only
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Payment Due Date</span>
                <span className="font-mono font-bold text-amber-800">{selectedTx.payment_due_date ? formatDateTime(selectedTx.payment_due_date) : 'Calculated upon Handover'}</span>
              </div>
            </div>

            {/* Financial Ledger Calculation Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Commercial UPI Settlement Breakdown</span>
              </h4>

              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
                <div className="p-3 bg-white flex justify-between items-center">
                  <span className="font-medium text-slate-600">1. Agreed Produce Amount ({selectedTx.quantity} kg × ₹{selectedTx.price_per_kg}/kg)</span>
                  <span className="font-mono font-bold text-slate-900">₹{(selectedTx.agreed_amount || selectedTx.net_realisation)?.toLocaleString()}</span>
                </div>

                <div className="p-3 bg-slate-50/70 flex justify-between items-center text-slate-700">
                  <div>
                    <span className="font-medium">2. Actual Labour / Unloading Charges</span>
                    <span className="text-[10px] text-slate-400 block font-normal">
                      Status: <strong className="uppercase">{selectedTx.labour_status || 'Agreed'}</strong> {selectedTx.labour_notes && `• ${selectedTx.labour_notes}`}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-blue-700">
                    {selectedTx.labour_charges ? `+ ₹${selectedTx.labour_charges?.toLocaleString()}` : '₹0'}
                  </span>
                </div>

                <div className="p-3 bg-white flex justify-between items-center text-slate-700">
                  <div>
                    <span className="font-medium">3. Delay Penalty Amount</span>
                    <span className="text-[10px] text-slate-400 block font-normal">
                      {selectedTx.delay_amount ? `Payment delayed by ${selectedTx.delay_days || 1} day(s)` : 'Payment on-time (₹0 delay charge)'}
                    </span>
                  </div>
                  <span className={`font-mono font-bold ${selectedTx.delay_amount ? 'text-amber-700' : 'text-slate-500'}`}>
                    {selectedTx.delay_amount ? `+ ₹${selectedTx.delay_amount?.toLocaleString()}` : '₹0'}
                  </span>
                </div>

                {selectedTx.storage_cost > 0 && (
                  <div className="p-3 bg-slate-50/70 flex justify-between items-center text-slate-700">
                    <span className="font-medium">
                      Cold Storage Cost {selectedTx.cold_storage_required ? `(${selectedTx.storage_duration || 'Applied'})` : ''}
                    </span>
                    <span className="font-mono font-bold text-rose-600">
                      - ₹{selectedTx.storage_cost?.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="p-3.5 bg-emerald-50 flex justify-between items-center text-emerald-950 font-black">
                  <span className="text-sm">Total Settlement via UPI</span>
                  <span className="font-mono text-base font-black text-emerald-800">
                    ₹{(selectedTx.total_payable_amount || ((selectedTx.agreed_amount || selectedTx.net_realisation) + (selectedTx.labour_charges || 0) + (selectedTx.delay_amount || 0)))?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* UPI Payment Tracking Details */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">UPI Settlement Protocol</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-slate-400 block">{t('status')}</span>
                  <span className="font-extrabold text-emerald-700">
                    {selectedTx.payment_status === 'RELEASED' || selectedTx.payment_status === 'PAYMENT_RELEASED'
                      ? 'RELEASED (UPI)'
                      : (selectedTx.final_status === 'COMPLETED' || selectedTx.payment_status === 'VERIFIED' || selectedTx.payment_status === 'COMPLETED')
                      ? 'COMPLETED'
                      : selectedTx.payment_status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Payment Mode</span>
                  <span className="font-bold text-emerald-800">UPI Only</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Farmer UPI ID</span>
                  <span className="font-mono font-bold text-slate-800">{selectedTx.upi_id || selectedTx.payment?.upi_id || 'farmer@upi'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{t('paymentRef')}</span>
                  <span className="font-mono font-bold text-slate-700">{selectedTx.payment?.payment_reference || 'UPI/KL/729103859201'}</span>
                </div>
                {selectedTx.released_at && (
                  <div>
                    <span className="text-slate-400 block">Released At</span>
                    <span className="font-medium text-slate-700">{formatDateTime(selectedTx.released_at)}</span>
                  </div>
                )}
                {selectedTx.verified_at && (
                  <div>
                    <span className="text-slate-400 block">Verified At</span>
                    <span className="font-medium text-slate-700">{formatDateTime(selectedTx.verified_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="flex items-center gap-2">
                {/* Farmer: Verify Payment Button */}
                {isFarmer && (selectedTx.payment_status === 'RELEASED' || selectedTx.payment_status === 'PAYMENT_RELEASED') && (
                  <button
                    onClick={() => handleVerifyPayment(selectedTx.id)}
                    disabled={verifyingTxId === selectedTx.id}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{verifyingTxId === selectedTx.id ? "Verifying..." : "Verify Payment"}</span>
                  </button>
                )}

                {/* Buyer: Process Payment Button */}
                {isBuyer && (selectedTx.quality_status === 'CONFIRMED' || selectedTx.procurement_status === 'Quality Confirmed') && selectedTx.payment_status === 'PENDING' && (
                  <button
                    onClick={() => handleProcessPayment(selectedTx.id)}
                    disabled={payingTxId === selectedTx.id}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{payingTxId === selectedTx.id ? "Releasing..." : "Process Payment (Release Funds)"}</span>
                  </button>
                )}

                <button
                  onClick={() => handleOpenRating(selectedTx)}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Star className="w-4 h-4 fill-slate-950" />
                  <span>{selectedTx.user_feedback ? t('editFeedbackBtn') : t('giveFeedbackBtn')}</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedTx(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK & RATING MODAL */}
      {ratingModalTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                <span>{t('rateExperience')}</span>
              </h3>
              <button
                onClick={() => setRatingModalTx(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {t('ratePartnerPrompt')}
            </p>

            {/* Interactive Stars */}
            <div className="flex items-center justify-center space-x-3 text-3xl py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`transition-transform hover:scale-110 cursor-pointer ${
                    star <= rating ? "text-amber-500 fill-amber-500" : "text-slate-200"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-emerald-500"
              placeholder={t('feedbackPlaceholder')}
            />

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setRatingModalTx(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={submittingRating}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {submittingRating ? t('updating') : t('submitRating')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

