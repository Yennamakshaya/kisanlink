import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';

// Common Components
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { KisanAssistantModal } from './components/KisanAssistantModal';

// Auth Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterSelectPage } from './pages/RegisterSelectPage';
import { FarmerRegisterPage } from './pages/FarmerRegisterPage';
import { BuyerRegisterPage } from './pages/BuyerRegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';

// Farmer Pages
import { FarmerDashboard } from './pages/farmer/FarmerDashboard';
import { MyProducePage } from './pages/farmer/MyProducePage';
import { AddProducePage } from './pages/farmer/AddProducePage';
import { MarketPricesPage } from './pages/farmer/MarketPricesPage';
import { BuyersListPage } from './pages/farmer/BuyersListPage';
import { NegotiationsPage } from './pages/farmer/NegotiationsPage';
import { AgreementPage } from './pages/farmer/AgreementPage';
import { SlotBookingPage } from './pages/farmer/SlotBookingPage';
import { HandoverPage } from './pages/farmer/HandoverPage';
import { FarmerTransactionsPage } from './pages/farmer/FarmerTransactionsPage';
import { GrievancePage } from './pages/farmer/GrievancePage';

// Buyer Pages
import { BuyerDashboard } from './pages/buyer/BuyerDashboard';
import { SearchFarmersPage } from './pages/buyer/SearchFarmersPage';
import { PickupConfirmationPage } from './pages/buyer/PickupConfirmationPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { BuyerMgmtPage } from './pages/admin/BuyerMgmtPage';
import { FarmerMgmtPage } from './pages/admin/FarmerMgmtPage';

// Shared Pages
import { MessagesPage } from './pages/shared/MessagesPage';

// Public Layout (NO Sidebar Ever)
const PublicLayout: React.FC<{ onOpenAssistant: () => void }> = ({ onOpenAssistant }) => {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Navbar onOpenAssistant={onOpenAssistant} />
      <main className="flex-1 w-full">
        <Outlet />
      </main>
    </div>
  );
};

// Farmer Portal Layout (Farmer Sidebar Only)
const FarmerLayout: React.FC<{ onOpenAssistant: () => void }> = ({ onOpenAssistant }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login?role=farmer" replace />;
  }

  if (user.role !== 'farmer') {
    return <Navigate to={user.role === 'buyer' ? '/buyer/dashboard' : '/admin/dashboard'} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Navbar onOpenAssistant={onOpenAssistant} />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Buyer Portal Layout (Buyer Sidebar Only)
const BuyerLayout: React.FC<{ onOpenAssistant: () => void }> = ({ onOpenAssistant }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login?role=buyer" replace />;
  }

  if (user.role !== 'buyer') {
    return <Navigate to={user.role === 'farmer' ? '/farmer/dashboard' : '/admin/dashboard'} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Navbar onOpenAssistant={onOpenAssistant} />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Admin Portal Layout (Admin Sidebar Only)
const AdminLayout: React.FC<{ onOpenAssistant: () => void }> = ({ onOpenAssistant }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to={user.role === 'farmer' ? '/farmer/dashboard' : '/buyer/dashboard'} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Navbar onOpenAssistant={onOpenAssistant} />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  return (
    <>
      <Routes>
        {/* Public Routes - No Sidebar Ever */}
        <Route element={<PublicLayout onOpenAssistant={() => setIsAssistantOpen(true)} />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterSelectPage />} />
          <Route path="/register/farmer" element={<FarmerRegisterPage />} />
          <Route path="/register/buyer" element={<BuyerRegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
        </Route>

        {/* Farmer Portal - Farmer Sidebar Only */}
        <Route element={<FarmerLayout onOpenAssistant={() => setIsAssistantOpen(true)} />}>
          <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
          <Route path="/farmer/produce" element={<MyProducePage />} />
          <Route path="/farmer/add-produce" element={<AddProducePage />} />
          <Route path="/farmer/market-prices" element={<MarketPricesPage />} />
          <Route path="/farmer/buyers" element={<BuyersListPage />} />
          <Route path="/farmer/negotiations" element={<NegotiationsPage />} />
          <Route path="/farmer/agreements" element={<AgreementPage />} />
          <Route path="/farmer/agreement/:id" element={<AgreementPage />} />
          <Route path="/farmer/slot-booking" element={<SlotBookingPage />} />
          <Route path="/farmer/handover" element={<HandoverPage />} />
          <Route path="/farmer/transactions" element={<FarmerTransactionsPage />} />
          <Route path="/farmer/grievance" element={<GrievancePage />} />
          <Route path="/farmer/messages" element={<MessagesPage portalType="farmer" />} />
        </Route>

        {/* Buyer Portal - Buyer Sidebar Only */}
        <Route element={<BuyerLayout onOpenAssistant={() => setIsAssistantOpen(true)} />}>
          <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
          <Route path="/buyer/requests" element={<NegotiationsPage />} />
          <Route path="/buyer/incoming-requests" element={<NegotiationsPage />} />
          <Route path="/buyer/requirements" element={<BuyerDashboard />} />
          <Route path="/buyer/add-requirement" element={<BuyerDashboard />} />
          <Route path="/buyer/search-farmers" element={<SearchFarmersPage />} />
          <Route path="/buyer/negotiations" element={<NegotiationsPage />} />
          <Route path="/buyer/agreements" element={<AgreementPage />} />
          <Route path="/buyer/agreement/:id" element={<AgreementPage />} />
          <Route path="/buyer/slot-booking" element={<SlotBookingPage />} />
          <Route path="/buyer/pickup-confirmation" element={<PickupConfirmationPage />} />
          <Route path="/buyer/transactions" element={<FarmerTransactionsPage />} />
          <Route path="/buyer/grievance" element={<GrievancePage />} />
          <Route path="/buyer/messages" element={<MessagesPage portalType="buyer" />} />
        </Route>

        {/* Admin Portal - Admin Sidebar Only */}
        <Route element={<AdminLayout onOpenAssistant={() => setIsAssistantOpen(true)} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/farmers" element={<Navigate to="/admin/dashboard?tab=farmers" replace />} />
          <Route path="/admin/buyers" element={<Navigate to="/admin/dashboard?tab=buyers" replace />} />
          <Route path="/admin/produce" element={<Navigate to="/admin/dashboard?tab=produce" replace />} />
          <Route path="/admin/market-data" element={<Navigate to="/admin/dashboard?tab=market" replace />} />
          <Route path="/admin/procurements" element={<Navigate to="/admin/dashboard?tab=procurement" replace />} />
          <Route path="/admin/transactions" element={<Navigate to="/admin/dashboard?tab=transactions" replace />} />
          <Route path="/admin/payments" element={<Navigate to="/admin/dashboard?tab=transactions" replace />} />
          <Route path="/admin/feedback" element={<Navigate to="/admin/dashboard?tab=grievances" replace />} />
          <Route path="/admin/grievances" element={<Navigate to="/admin/dashboard?tab=grievances" replace />} />
          <Route path="/admin/analytics" element={<Navigate to="/admin/dashboard?tab=overview" replace />} />
          <Route path="/admin/notifications" element={<Navigate to="/admin/dashboard?tab=notifications" replace />} />
          <Route path="/admin/audit-logs" element={<Navigate to="/admin/dashboard?tab=audit-logs" replace />} />
        </Route>

        {/* Fallback Catch-All */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Kisan Assistant Modal */}
      <KisanAssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />
    </>
  );
};

import { ToastProvider } from './context/ToastContext';

export const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <LanguageProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </LanguageProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
