import React, { useState, useEffect } from 'react';
import { Building2, ShieldCheck, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import axios from 'axios';

export const BuyerMgmtPage: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [buyers, setBuyers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBuyers = () => {
    axios.get('/api/admin/buyers')
      .then(res => setBuyers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBuyers();
  }, []);

  const handleVerifyAction = (buyerId: number, action: 'approve' | 'reject' | 'suspend') => {
    axios.put(`/api/admin/buyers/${buyerId}/verify?action=${action}`)
      .then(() => {
        showToast(`Buyer status updated (${action}) successfully!`, "success");
        fetchBuyers();
      })
      .catch(err => showToast("Error: " + (err.response?.data?.detail || "Could not update buyer verification"), "error"));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-purple-600" />
          {t('manageBuyersTitle')}
        </h1>
        <p className="text-xs text-slate-500">{t('manageBuyersSubtitle')}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="p-3">{t('companyName')}</th>
                <th className="p-3">{t('contactPerson')}</th>
                <th className="p-3">{t('district')}</th>
                <th className="p-3">GSTIN</th>
                <th className="p-3">{t('category')}</th>
                <th className="p-3">{t('verificationStatus')}</th>
                <th className="p-3">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {buyers.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-extrabold text-slate-900">{b.company_name}</td>
                  <td className="p-3">{b.contact_person}</td>
                  <td className="p-3">{b.district}</td>
                  <td className="p-3 font-mono font-bold text-slate-800">{b.gstin || b.gstin_masked}</td>
                  <td className="p-3">{b.buyer_category}</td>
                  <td className="p-3">
                    <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                      b.verification_status === 'verified'
                        ? 'bg-emerald-100 text-emerald-800'
                        : b.verification_status === 'pending'
                        ? 'bg-amber-100 text-amber-900 animate-pulse'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {b.verification_status === 'verified' ? t('statusVerified') : b.verification_status === 'pending' ? t('statusPending') : t('statusSuspended')}
                    </span>
                  </td>
                  <td className="p-3 space-x-1">
                    {b.verification_status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleVerifyAction(b.id, 'approve')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-sm"
                        >
                          {t('approveGst')}
                        </button>
                        <button
                          onClick={() => handleVerifyAction(b.id, 'reject')}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-lg shadow-sm"
                        >
                          {t('rejectGst')}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleVerifyAction(b.id, b.verification_status === 'suspended' ? 'approve' : 'suspend')}
                        className={`px-2.5 py-1 font-bold text-[10px] rounded-lg shadow-sm ${
                          b.verification_status === 'suspended'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-700 hover:bg-red-100 hover:text-red-700'
                        }`}
                      >
                        {b.verification_status === 'suspended' ? t('reActivateUser') : t('suspendUser')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
