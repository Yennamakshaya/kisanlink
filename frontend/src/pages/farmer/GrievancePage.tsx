import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { HelpCircle, PlusCircle, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import axios from 'axios';

export const GrievancePage: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const paramTxId = searchParams.get('transaction_id');
  const paramTxCode = searchParams.get('transaction_code');
  const paramCategory = searchParams.get('category');

  const [grievances, setGrievances] = useState<any[]>([]);
  const [category, setCategory] = useState(paramCategory || (paramTxCode ? 'Quality Dispute' : 'Payment Issue'));
  const [title, setTitle] = useState(paramTxCode ? `Dispute for Transaction: ${paramTxCode}` : '');
  const [description, setDescription] = useState(paramTxCode ? `Dispute raised regarding produce handover / quality audit discrepancy for Transaction ${paramTxCode}.` : '');
  const [showForm, setShowForm] = useState(!!paramTxCode);

  const fetchGrievances = () => {
    axios.get('/api/workflow/grievances')
      .then(res => setGrievances(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchGrievances();
    if (paramTxCode) {
      setShowForm(true);
      if (paramCategory) setCategory(paramCategory);
      setTitle(`Dispute for Transaction: ${paramTxCode}`);
      setDescription(`Dispute raised regarding produce handover / quality audit discrepancy for Transaction ${paramTxCode}.`);
    }
  }, [paramTxCode, paramCategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    axios.post('/api/workflow/grievances', {
      category,
      title,
      description,
      transaction_id: paramTxId ? Number(paramTxId) : null,
      transaction_code: paramTxCode || null
    })
    .then(res => {
      showToast(`Grievance Registered Successfully! Reference Code: ${res.data.grievance_code}`, "success");
      setTitle('');
      setDescription('');
      setShowForm(false);
      fetchGrievances();
    })
    .catch(err => showToast("Error: " + (err.response?.data?.detail || "Could not register grievance"), "error"));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-emerald-600" />
            {t('grievanceTitle')}
          </h1>
          <p className="text-xs text-slate-500">{t('grievanceSubtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{showForm ? t('closeForm') : t('raiseNewGrievance')}</span>
        </button>
      </div>

      {paramTxCode && showForm && (
        <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-amber-900">Transaction Dispute Linked</p>
            <p className="text-amber-800">This dispute will be formally associated with Transaction <span className="font-mono font-bold">{paramTxCode}</span> in the audit log.</p>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="font-bold text-sm text-slate-800 uppercase">{t('submitGrievanceDetails')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">{t('category')} *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full mt-1 p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                <option value="Quality mismatch">Quality mismatch (Grade/specification discrepancy)</option>
                <option value="Quantity mismatch">Quantity mismatch (Weight difference)</option>
                <option value="Payment delay">Payment delay (Settlement timeline delay)</option>
                <option value="Buyer cancellation">Buyer cancellation</option>
                <option value="Farmer cancellation">Farmer cancellation</option>
                <option value="Pickup delay">Pickup delay (Driver / Vehicle arrival delay)</option>
                <option value="Transport problem">Transport problem (Transit damage / Breakdown)</option>
                <option value="Other">Other Operational Issue</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">{t('title')} *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('titlePlaceholder')}
                className="w-full mt-1 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">{t('detailedDescription')} *</label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              className="w-full mt-1 p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow"
            >
              {t('submitGrievance')}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
        <h3 className="font-bold text-base text-slate-800">{t('yourFiledGrievances')}</h3>
        <div className="space-y-3">
          {grievances.map((g) => (
            <div key={g.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-800">{g.grievance_code}</span>
                  {g.transaction_code && (
                    <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                      Txn: {g.transaction_code}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  g.status === 'RESOLVED' || g.status === 'Resolved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : g.status === 'UNDER REVIEW' || g.status === 'Under Review'
                    ? 'bg-blue-100 text-blue-800'
                    : g.status === 'ESCALATED'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-amber-100 text-amber-900'
                }`}>
                  {g.status}
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900">{g.title} ({g.category})</h4>
              <p className="text-xs text-slate-600">{g.description}</p>
              {g.admin_remarks && (
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs text-emerald-900 font-medium mt-1">
                  <span className="font-bold text-emerald-800">{t('adminRemarks')}</span> {g.admin_remarks}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
