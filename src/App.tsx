import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DemoRoleBanner } from './components/common/DemoRoleBanner';
import { LandingPage } from './pages/LandingPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminLogin } from './pages/admin/AdminLogin';
import { CafeDashboardLayout } from './pages/cafe/CafeDashboardLayout';
import { CafeLogin } from './pages/cafe/CafeLogin';
import { CustomerOrderApp } from './pages/customer/CustomerOrderApp';
import { InviteAcceptancePage } from './pages/InviteAcceptancePage';

// Protected Admin Route wrapper
const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSuperAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-300">
        Loading...
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

// Customer redirect helper for /order/:cafeId without table
const CustomerOrderRedirect: React.FC = () => {
  const { cafeId } = useParams<{ cafeId: string }>();
  return <Navigate to={`/order/${cafeId}/T1`} replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        {/* Floating Quick Role Simulator Banner for effortless demo testing */}
        <DemoRoleBanner />

        <Routes>
          {/* Landing / Portal Directory */}
          <Route path="/" element={<LandingPage />} />

          {/* Super Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            }
          />

          {/* Cafe Dashboard Routes */}
          <Route path="/cafe/login" element={<CafeLogin />} />
          <Route path="/cafe/:cafeId" element={<CafeDashboardLayout />} />
          <Route path="/invite/:token" element={<InviteAcceptancePage />} />

          {/* Customer Mobile Ordering Routes */}
          <Route path="/order/:cafeId" element={<CustomerOrderRedirect />} />
          <Route path="/order/:cafeId/:tableId" element={<CustomerOrderApp />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
