import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../i18n/translations';
import { 
  Bot, Bell, LogOut, Globe, Sprout, CheckCheck, ArrowRight, 
  MessageSquare, FileCheck, Calendar, Shield, AlertTriangle, Info, CheckCircle2
} from 'lucide-react';
import axios from 'axios';
import { formatDateTime } from '../utils/dateUtils';

interface NavbarProps {
  onOpenAssistant: () => void;
}

interface NotificationItem {
  id: number;
  notification_id?: number;
  title: string;
  message: string;
  is_read: boolean;
  type?: string;
  notification_type?: string;
  related_id?: string | number;
  related_type?: string;
  created_at?: string;
  raw_created_at?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAssistant }) => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpenNotifications, setIsOpenNotifications] = useState<boolean>(false);
  const [loadingNotifs, setLoadingNotifs] = useState<boolean>(false);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = (silent = false) => {
    if (!user?.token) return;
    if (!silent) setLoadingNotifs(true);
    axios.get('/api/workflow/notifications')
      .then(res => {
        const data = res.data || {};
        setUnreadCount(data.unread_count ?? (data.count || 0));
        setNotifications(data.notifications || []);
      })
      .catch(() => {
        // Fallback gracefully without throwing UI errors
      })
      .finally(() => {
        if (!silent) setLoadingNotifs(false);
      });
  };

  useEffect(() => {
    fetchNotifications();

    // Polling every 15 seconds for real-time notification synchronization
    const timer = setInterval(() => {
      fetchNotifications(true);
    }, 15000);

    return () => clearInterval(timer);
  }, [user]);

  // Handle outside click to close notifications panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setIsOpenNotifications(false);
      }
    };
    if (isOpenNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpenNotifications]);

  const handleToggleNotifications = () => {
    const nextState = !isOpenNotifications;
    setIsOpenNotifications(nextState);
    if (nextState) {
      fetchNotifications();
    }
  };

  const handleMarkAllRead = () => {
    axios.patch('/api/workflow/notifications/read-all')
      .then(() => {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      })
      .catch(() => {
        // Optimistic update
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      });
  };

  const handleNotificationClick = (n: NotificationItem) => {
    // Mark as read in backend
    if (!n.is_read) {
      axios.patch(`/api/workflow/notifications/${n.id}/read`)
        .then(() => {
          setUnreadCount(prev => Math.max(0, prev - 1));
          setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item));
        })
        .catch(() => {});
    }

    setIsOpenNotifications(false);

    // Route based on role and related_type
    const role = user?.role || 'farmer';
    const typeUpper = (n.type || n.notification_type || '').toUpperCase();
    const relTypeUpper = (n.related_type || '').toUpperCase();
    const relId = n.related_id;
    const titleUpper = (n.title || '').toUpperCase();

    // 1. Message / Chat Notification -> Open exact related chat directly
    const isMessageNotif =
      typeUpper.includes('MESSAGE') ||
      relTypeUpper === 'COMMUNICATION' ||
      typeUpper === 'ADMIN_MESSAGE' ||
      typeUpper === 'USER_MESSAGE' ||
      titleUpper.includes('NEW MESSAGE');

    if (isMessageNotif) {
      const convId = relId ? String(relId) : '';
      if (role === 'admin') {
        const userIdMatch = convId.match(/\d+/);
        const userId = userIdMatch ? userIdMatch[0] : '';
        // Dispatch window event for instant in-page reaction if already on admin dashboard
        window.dispatchEvent(new CustomEvent('open-admin-chat', {
          detail: { conversation_id: convId, user_id: userId }
        }));
        navigate(`/admin/dashboard?conversation_id=${encodeURIComponent(convId)}${userId ? `&chat_user_id=${userId}` : ''}&open_chat=true&t=${Date.now()}`);
      } else if (role === 'farmer') {
        navigate(`/farmer/messages?conversation_id=${encodeURIComponent(convId)}`);
      } else if (role === 'buyer') {
        navigate(`/buyer/messages?conversation_id=${encodeURIComponent(convId)}`);
      }
      return;
    }

    if (typeUpper.includes('REQUEST') || relTypeUpper === 'FARMER_REQUEST') {
      const targetPath = role === 'buyer' ? '/buyer/negotiations?tab=requests' : '/farmer/negotiations?tab=requests';
      navigate(targetPath);
    } else if (typeUpper.includes('NEGOTIATION') || relTypeUpper === 'NEGOTIATION') {
      let offerParam = '';
      if (relId) {
        const cleanId = String(relId).replace('NEG-', '').replace(/^0+/, '');
        offerParam = `?offer_id=${cleanId || relId}`;
      }
      navigate(role === 'buyer' ? `/buyer/negotiations${offerParam}` : `/farmer/negotiations${offerParam}`);
    } else if (typeUpper.includes('AGREEMENT') || relTypeUpper === 'AGREEMENT') {
      if (role === 'buyer') {
        navigate('/buyer/agreements');
      } else {
        navigate(relId ? `/farmer/agreement/${relId}` : '/farmer/agreements');
      }
    } else if (typeUpper.includes('SLOT') || relTypeUpper === 'SLOT' || relTypeUpper === 'SLOT_BOOKED') {
      navigate(role === 'buyer' ? '/buyer/slot-booking' : '/farmer/slot-booking');
    } else if (
      typeUpper.includes('HANDOVER') || 
      typeUpper.includes('TRANSACTION') || 
      typeUpper.includes('PAYMENT') || 
      typeUpper.includes('FEEDBACK') || 
      relTypeUpper === 'TRANSACTION' || 
      relTypeUpper === 'PAYMENT' || 
      relTypeUpper === 'FEEDBACK'
    ) {
      if (role === 'admin') {
        navigate('/admin/transactions');
      } else {
        navigate(role === 'buyer' ? '/buyer/transactions' : '/farmer/transactions');
      }
    } else if (typeUpper.includes('GRIEVANCE') || relTypeUpper === 'ADMIN_GRIEVANCE') {
      navigate(role === 'admin' ? '/admin/grievances' : `/${role}/grievance`);
    } else if (typeUpper.includes('BUYER_REGISTRATION') || relTypeUpper === 'ADMIN_BUYER') {
      navigate('/admin/buyers');
    } else if (typeUpper.includes('FARMER_REGISTRATION') || relTypeUpper === 'ADMIN_FARMER') {
      navigate('/admin/farmers');
    } else {
      // Default to dashboard
      navigate(`/${role}/dashboard`);
    }
  };

  const getActionLabel = (n: NotificationItem) => {
    const typeUpper = (n.type || n.notification_type || '').toUpperCase();
    const relTypeUpper = (n.related_type || '').toUpperCase();
    const titleUpper = (n.title || '').toUpperCase();

    if (
      typeUpper.includes('MESSAGE') || 
      relTypeUpper === 'COMMUNICATION' || 
      typeUpper === 'ADMIN_MESSAGE' || 
      typeUpper === 'USER_MESSAGE' ||
      titleUpper.includes('NEW MESSAGE')
    ) {
      return t('platformAccess');
    }
    if (typeUpper.includes('NEGOTIATION') || relTypeUpper === 'NEGOTIATION') return t('viewNegotiation');
    if (typeUpper.includes('AGREEMENT') || relTypeUpper === 'AGREEMENT') return t('viewAgreement');
    if (typeUpper.includes('SLOT') || relTypeUpper === 'SLOT' || relTypeUpper === 'SLOT_BOOKED') return t('viewBooking');
    if (typeUpper.includes('TRANSACTION') || typeUpper.includes('HANDOVER') || typeUpper.includes('PAYMENT') || relTypeUpper === 'TRANSACTION') return t('viewTransaction');
    if (typeUpper.includes('GRIEVANCE') || relTypeUpper === 'ADMIN_GRIEVANCE') return t('viewGrievance');
    return t('platformAccess');
  };

  const getIconForType = (n: NotificationItem) => {
    const typeUpper = (n.type || n.notification_type || '').toUpperCase();
    const relTypeUpper = (n.related_type || '').toUpperCase();
    const titleUpper = (n.title || '').toUpperCase();

    if (
      typeUpper.includes('MESSAGE') || 
      relTypeUpper === 'COMMUNICATION' || 
      typeUpper === 'ADMIN_MESSAGE' || 
      typeUpper === 'USER_MESSAGE' ||
      titleUpper.includes('NEW MESSAGE')
    ) {
      return <MessageSquare className="w-4 h-4 text-indigo-500" />;
    }
    if (typeUpper.includes('NEGOTIATION')) return <MessageSquare className="w-4 h-4 text-amber-500" />;
    if (typeUpper.includes('AGREEMENT')) return <FileCheck className="w-4 h-4 text-emerald-500" />;
    if (typeUpper.includes('SLOT')) return <Calendar className="w-4 h-4 text-blue-500" />;
    if (typeUpper.includes('PAYMENT') || typeUpper.includes('TRANSACTION')) return <Shield className="w-4 h-4 text-emerald-600" />;
    if (typeUpper.includes('REJECTED') || typeUpper.includes('ERROR')) return <AlertTriangle className="w-4 h-4 text-red-500" />;
    return <Info className="w-4 h-4 text-emerald-600" />;
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBrandClick = () => {
    if (!user) {
      navigate('/');
    } else if (user.role === 'farmer') {
      navigate('/farmer/dashboard');
    } else if (user.role === 'buyer') {
      navigate('/buyer/dashboard');
    } else {
      navigate('/admin/dashboard');
    }
  };

  return (
    <header className="bg-emerald-800 text-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            onClick={handleBrandClick}
            className="flex items-center space-x-3 cursor-pointer select-none"
          >
            <div className="bg-emerald-500 p-2 rounded-xl text-white shadow-inner flex items-center justify-center">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
                KisanLink
              </span>
              <p className="text-[11px] text-emerald-200 hidden sm:block">
                {t('tagline')}
              </p>
            </div>
          </div>

          {/* Controls: Language Switcher, Assistant, Notifications, User Menu */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Language Switcher */}
            <div className="flex items-center bg-emerald-950/60 p-1 rounded-lg border border-emerald-700/50">
              <Globe className="w-4 h-4 text-emerald-300 ml-1.5 mr-1 hidden xs:block" />
              <button
                onClick={() => handleLanguageChange('en')}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                  language === 'en' ? 'bg-emerald-500 text-white shadow' : 'text-emerald-200 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => handleLanguageChange('te')}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                  language === 'te' ? 'bg-emerald-500 text-white shadow' : 'text-emerald-200 hover:text-white'
                }`}
              >
                తెలుగు
              </button>
              <button
                onClick={() => handleLanguageChange('hi')}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                  language === 'hi' ? 'bg-emerald-500 text-white shadow' : 'text-emerald-200 hover:text-white'
                }`}
              >
                हिन्दी
              </button>
            </div>

            {/* Kisan Assistant Button */}
            <button
              onClick={onOpenAssistant}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all transform active:scale-95"
            >
              <Bot className="w-4 h-4 animate-pulse" />
              <span className="hidden md:inline">{t('kisanAssistant')}</span>
            </button>

            {/* Notifications Bell & Dropdown */}
            {user && (
              <div className="relative" ref={notifDropdownRef}>
                <button
                  onClick={handleToggleNotifications}
                  title={t('notifications')}
                  className={`p-2 text-emerald-200 hover:text-white rounded-lg transition-colors relative ${
                    isOpenNotifications ? 'bg-emerald-700 text-white' : 'hover:bg-emerald-700/50'
                  }`}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown Panel */}
                {isOpenNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* Header */}
                    <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Bell className="w-4 h-4 text-emerald-400" />
                        <h3 className="font-extrabold text-sm text-slate-100">{t('notificationsTitle')}</h3>
                        {unreadCount > 0 && (
                          <span className="bg-emerald-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                            {unreadCount} {t('unread')}
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[11px] text-emerald-300 hover:text-emerald-100 font-bold flex items-center gap-1 transition-colors"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>{t('markAllAsRead')}</span>
                        </button>
                      )}
                    </div>

                    {/* Notification Items List */}
                    <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                      {loadingNotifs ? (
                        <div className="p-8 text-center text-xs text-slate-400">
                          {t('Loading notifications...')}
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 space-y-2">
                          <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300" />
                          <p className="text-xs font-semibold text-slate-500">{t('noNotifications')}</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${
                              !n.is_read ? 'bg-emerald-50/60 font-medium' : 'bg-white'
                            }`}
                          >
                            <div className="mt-0.5 flex-shrink-0">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                !n.is_read ? 'bg-emerald-100' : 'bg-slate-100'
                              }`}>
                                {getIconForType(n)}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-start justify-between gap-1">
                                <h4 className={`text-xs ${!n.is_read ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                                  {n.title}
                                </h4>
                                {!n.is_read && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                                {n.message}
                              </p>
                              <div className="flex items-center justify-between pt-1 text-[10px]">
                                <span className="text-slate-400 font-semibold">{formatDateTime(n.created_at || n.raw_created_at)}</span>
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNotificationClick(n);
                                  }}
                                  className="text-emerald-700 hover:text-emerald-800 font-extrabold flex items-center gap-0.5 hover:underline cursor-pointer"
                                >
                                  {getActionLabel(n)} <ArrowRight className="w-3 h-3" />
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-2.5 bg-slate-50 text-center border-t border-slate-100 text-[11px] text-slate-500 font-semibold">
                      {t('allNotifications')} ({notifications.length})
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Profile / Logout */}
            {user ? (
              <div className="flex items-center space-x-2 border-l border-emerald-700/60 pl-3">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-white leading-tight">{user.name}</p>
                  <span className="text-[10px] bg-emerald-900 text-emerald-300 uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold border border-emerald-700">
                    {user.role === 'farmer' ? t('farmerRole') : user.role === 'buyer' ? t('buyerRole') : t('adminRole')}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  title={t('logout')}
                  className="p-2 text-emerald-200 hover:text-red-300 hover:bg-emerald-700/50 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <a
                href="/login"
                className="bg-white text-emerald-800 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-50 transition-colors"
              >
                {t('login')}
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

