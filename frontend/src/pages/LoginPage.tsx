import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Sprout, Building2, ShieldCheck, Lock, User, ArrowRight } from 'lucide-react';
import axios from 'axios';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRole = (searchParams.get('role') as 'farmer' | 'buyer' | 'admin') || 'farmer';
  
  const [role, setRole] = useState<'farmer' | 'buyer' | 'admin'>(initialRole);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  React.useEffect(() => {
    const roleParam = searchParams.get('role') as 'farmer' | 'buyer' | 'admin';
    if (roleParam && ['farmer', 'buyer', 'admin'].includes(roleParam)) {
      setRole(roleParam);
    }
  }, [searchParams]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMsg(t('errorEnterCredentials'));
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    axios.post('/api/auth/login', {
      identifier: identifier.trim(),
      password,
      role
    })
    .then(res => {
      const { access_token, role: userRole, user_id, name } = res.data;
      login(access_token, userRole, user_id, name);
      if (userRole === 'farmer') navigate('/farmer/dashboard');
      else if (userRole === 'buyer') navigate('/buyer/dashboard');
      else navigate('/admin/dashboard');
    })
    .catch(err => {
      setErrorMsg(err.response?.data?.detail || t('errorAuthFailed'));
    })
    .finally(() => setLoading(false));
  };

  const getButtonText = () => {
    if (loading) return t('authenticating');
    if (role === 'buyer') {
      return language === 'te'
        ? `${t('buyerRole')} ${t('login')}`
        : language === 'hi'
        ? `${t('buyerRole')} ${t('login')}`
        : "Buyer Login";
    }
    if (role === 'admin') {
      return language === 'te'
        ? `${t('adminRole')} ${t('login')}`
        : language === 'hi'
        ? `${t('adminRole')} ${t('login')}`
        : "Admin Login";
    }
    return language === 'te'
      ? `${t('farmerRole')} ${t('login')}`
      : language === 'hi'
      ? `${t('farmerRole')} ${t('login')}`
      : "Farmer Login";
  };

  const getButtonBgColor = () => {
    if (role === 'buyer') return 'bg-blue-600 hover:bg-blue-700';
    if (role === 'admin') return 'bg-purple-600 hover:bg-purple-700';
    return 'bg-emerald-600 hover:bg-emerald-700';
  };


  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="bg-emerald-800 text-white p-6 text-center space-y-2">
          <div className="inline-flex bg-emerald-600/60 p-3 rounded-2xl border border-emerald-500/50">
            <Sprout className="w-8 h-8 text-amber-300" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">{t('appName')} {t('stateName')}</h2>
          <p className="text-xs text-emerald-200 font-medium">{t('enterCredentials')}</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-1.5">
          <button
            type="button"
            onClick={() => { setRole('farmer'); setErrorMsg(null); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              role === 'farmer' ? 'bg-white text-emerald-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sprout className="w-4 h-4 text-emerald-600" />
            <span>{t('farmerRole')}</span>
          </button>
          <button
            type="button"
            onClick={() => { setRole('buyer'); setErrorMsg(null); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              role === 'buyer' ? 'bg-white text-blue-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>{t('buyerRole')}</span>
          </button>
          <button
            type="button"
            onClick={() => { setRole('admin'); setErrorMsg(null); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              role === 'admin' ? 'bg-white text-purple-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>{t('adminRole')}</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleLogin} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">{t('mobileOrEmail')}</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t('enterMobileOrEmail')}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">{t('password')}</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('enterPassword')}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center space-x-1.5 text-slate-600 cursor-pointer">
              <input type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" defaultChecked />
              <span>{t('rememberSession')}</span>
            </label>
            <a
              href="/forgot-password"
              className="text-emerald-700 font-bold hover:underline"
            >
              {t('forgotPassword')}
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 text-white font-extrabold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ${getButtonBgColor()}`}
          >
            <span key={role} className="no-translate">
              {getButtonText()}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Registration Links: Only for Farmer & Buyer (No Admin) */}
          <div className="pt-4 border-t border-slate-100 text-center space-y-2">
            <p className="text-xs text-slate-500 font-medium">{t('dontHaveAccount')}</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={() => navigate('/register/farmer')}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {t('registerAsFarmer')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/register/buyer')}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {t('registerAsBuyer')}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
