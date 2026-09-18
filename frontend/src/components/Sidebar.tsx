import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  LayoutDashboard, Sprout, PlusCircle, TrendingUp, Users, ShoppingBag, 
  FileCheck, Calendar, Truck, ArrowLeftRight, HelpCircle, Shield, BarChart3, Building2,
  Sparkles, ChevronRight, Inbox, Package, CreditCard, Bell, MessageSquare
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  isHero?: boolean;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (!user) return null;

  const farmerGroups: NavGroup[] = [
    {
      title: t("SELL"),
      items: [
        { to: '/farmer/market-prices?tab=sell-smart', label: t('Sell Smart Engine'), icon: Sparkles, isHero: true },
        { to: '/farmer/dashboard', label: t('dashboard'), icon: LayoutDashboard },
        { to: '/farmer/produce', label: t('myProduce'), icon: Sprout },
        { to: '/farmer/market-prices', label: t('marketPrice'), icon: TrendingUp },
        { to: '/farmer/buyers', label: t('buyersList'), icon: Users },
      ]
    },
    {
      title: t("DEAL"),
      items: [
        { to: '/farmer/negotiations', label: t('offersAndNegotiations'), icon: ArrowLeftRight },
        { to: '/farmer/agreements', label: t('agreements'), icon: FileCheck },
      ]
    },
    {
      title: t("DELIVERY"),
      items: [
        { to: '/farmer/slot-booking', label: t('slotBooking'), icon: Calendar },
        { to: '/farmer/handover', label: t('handover'), icon: Truck },
        { to: '/farmer/transactions', label: t('transactions'), icon: Shield },
      ]
    },
    {
      title: t("SUPPORT"),
      items: [
        { to: '/farmer/grievance', label: t('grievance'), icon: HelpCircle },
        { to: '/farmer/messages', label: t('Admin Messages'), icon: MessageSquare },
      ]
    }
  ];

  const buyerGroups: NavGroup[] = [
    {
      title: t("Procurement & Demand"),
      items: [
        { to: '/buyer/dashboard', label: t('dashboard'), icon: LayoutDashboard },
        { to: '/buyer/requirements', label: t('myRequirements'), icon: ShoppingBag },
        { to: '/buyer/add-requirement', label: t('addRequirement'), icon: PlusCircle },
        { to: '/buyer/search-farmers', label: t('searchFarmers'), icon: Sprout },
      ]
    },
    {
      title: t("Commercial Deals"),
      items: [
        { to: '/buyer/requests', label: t('incomingRequests'), icon: Inbox },
        { to: '/buyer/negotiations', label: t('offersAndNegotiations'), icon: ArrowLeftRight },
        { to: '/buyer/agreements', label: t('agreements'), icon: FileCheck },
      ]
    },
    {
      title: t("Fulfillment & Audit"),
      items: [
        { to: '/buyer/slot-booking', label: t('slotBooking'), icon: Calendar },
        { to: '/buyer/pickup-confirmation', label: t('pickupQualityConfirm'), icon: Truck },
        { to: '/buyer/transactions', label: t('transactions'), icon: Shield },
      ]
    },
    {
      title: t("Support"),
      items: [
        { to: '/buyer/grievance', label: t('grievance'), icon: HelpCircle },
        { to: '/buyer/messages', label: t('Admin Messages'), icon: MessageSquare },
      ]
    }
  ];

  const adminGroups: NavGroup[] = [
    {
      title: t("Core Governance"),
      items: [
        { to: '/admin/dashboard?tab=overview', label: t('Platform Overview'), icon: LayoutDashboard },
        { to: '/admin/dashboard?tab=farmers', label: t('Farmer Management'), icon: Sprout },
        { to: '/admin/dashboard?tab=buyers', label: t('Buyer Management'), icon: Building2 },
        { to: '/admin/dashboard?tab=produce', label: t('Produce & Lots'), icon: Package },
      ]
    },
    {
      title: t("Operations & Settlement"),
      items: [
        { to: '/admin/dashboard?tab=procurement', label: t('Procurement & Handover'), icon: Truck },
        { to: '/admin/dashboard?tab=transactions', label: t('Transactions & Payments'), icon: CreditCard },
        { to: '/admin/dashboard?tab=market', label: t('Market Intelligence'), icon: TrendingUp },
      ]
    },
    {
      title: t("Compliance & Security"),
      items: [
        { to: '/admin/dashboard?tab=grievances', label: t('Grievance Center'), icon: HelpCircle },
        { to: '/admin/dashboard?tab=notifications', label: t('Notifications & Alerts'), icon: Bell },
        { to: '/admin/dashboard?tab=audit-logs', label: t('System Audit Logs'), icon: FileCheck },
      ]
    }
  ];

  let groups = farmerGroups;
  if (user.role === 'buyer') groups = buyerGroups;
  if (user.role === 'admin') groups = adminGroups;

  // Mobile quick nav items
  const mobileNavItems = user.role === 'farmer' ? [
    { to: '/farmer/dashboard', label: 'Home', icon: LayoutDashboard },
    { to: '/farmer/market-prices?tab=sell-smart', label: 'Sell Smart', icon: Sparkles, isHero: true },
    { to: '/farmer/produce', label: 'Produce', icon: Sprout },
    { to: '/farmer/negotiations', label: 'Deals', icon: ArrowLeftRight },
    { to: '/farmer/transactions', label: 'Ledger', icon: Shield },
  ] : user.role === 'buyer' ? [
    { to: '/buyer/dashboard', label: 'Home', icon: LayoutDashboard },
    { to: '/buyer/search-farmers', label: 'Farmers', icon: Sprout },
    { to: '/buyer/requirements', label: 'Demands', icon: ShoppingBag },
    { to: '/buyer/negotiations', label: 'Deals', icon: ArrowLeftRight },
    { to: '/buyer/transactions', label: 'Ledger', icon: Shield },
  ] : [
    { to: '/admin/dashboard?tab=overview', label: 'Overview', icon: LayoutDashboard },
    { to: '/admin/dashboard?tab=farmers', label: 'Farmers', icon: Sprout },
    { to: '/admin/dashboard?tab=buyers', label: 'Buyers', icon: Building2 },
    { to: '/admin/dashboard?tab=produce', label: 'Lots', icon: Package },
    { to: '/admin/dashboard?tab=grievances', label: 'Disputes', icon: HelpCircle },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden md:flex shadow-xl border-r border-slate-800 flex-shrink-0">
        <div className="space-y-4 overflow-y-auto pr-1">
          {groups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {group.title && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  {group.title}
                </div>
              )}
              {group.items.map((link) => {
                const Icon = link.icon;
                const currentFull = location.pathname + (location.search || (location.pathname === '/admin/dashboard' ? '?tab=overview' : ''));
                const isItemActive = link.to.includes('?')
                  ? currentFull === link.to
                  : location.pathname === link.to;

                if (link.isHero) {
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={`block mb-2 p-2.5 rounded-xl border transition-all ${
                        isItemActive
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-md shadow-emerald-900/40'
                          : 'bg-gradient-to-r from-emerald-950/80 to-slate-800 text-emerald-300 border-emerald-700/60 hover:border-emerald-500 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                          <span className="text-xs font-black tracking-wide">{link.label}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 opacity-75" />
                      </div>
                      {link.badge && (
                        <span className="block mt-1 text-[9px] font-bold uppercase tracking-wider text-emerald-200/90 pl-6">
                          {link.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                }

                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isItemActive
                        ? 'bg-emerald-600 text-white font-bold shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{link.label}</span>
                    </div>
                    {link.badge && (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                        {link.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs mt-4">
          <p className="font-bold text-slate-200">{t('appName')} {t('stateName')}</p>
          <p className="text-slate-400 text-[11px] mt-0.5">{t('tagline')}</p>
        </div>
      </aside>

      {/* Mobile Bottom Quick Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex justify-around items-center px-2 py-1.5 safe-area-bottom shadow-2xl">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const currentFull = location.pathname + (location.search || (location.pathname === '/admin/dashboard' ? '?tab=overview' : ''));
          const isItemActive = item.to.includes('?')
            ? currentFull === item.to
            : location.pathname === item.to;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center py-1 px-2 rounded-lg transition-colors ${
                isItemActive 
                  ? 'text-emerald-400 font-bold' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${item.isHero ? 'text-amber-400' : ''}`} />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};
