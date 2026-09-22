import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminLogin } from './pages/admin/AdminLogin';
import { CafeDashboardLayout } from './pages/cafe/CafeDashboardLayout';
import { CafeLogin } from './pages/cafe/CafeLogin';
import { CustomerOrderApp } from './pages/customer/CustomerOrderApp';
import { InviteAcceptancePage } from './pages/InviteAcceptancePage';

// ── Route Guards ─────────────────────────────────────────────────────────────

/**
 * ProtectedAdminRoute
 * Redirects to /admin/login if the current user does not have the platform_admin role.
 * Checks custom claims (via userProfile resolved in AuthContext) so no extra DB read needed.
 */
const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSuperAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-300">
        <span className="text-sm animate-pulse">Verifying access...</span>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

/**
 * RequireCafeAccess
 * Wraps the /cafe/:cafeId route. Redirects to /cafe/login if the current user
 * is not staff/owner of the requested cafe (checked via custom claims → Firestore fallback).
 * Platform admins are always allowed through.
 */
const RequireCafeAccess: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { cafeId } = useParams<{ cafeId: string }>();
  const { isCafeStaff, isSuperAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-300">
        <span className="text-sm animate-pulse">Verifying cafe access...</span>
      </div>
    );
  }

  // Allow platform admins unrestricted access to any cafe dashboard
  if (isSuperAdmin) return <>{children}</>;

  // For staff/owners, check cafeId matches their token
  if (!cafeId || !isCafeStaff(cafeId)) {
    return <Navigate to="/cafe/login" replace />;
  }

  return <>{children}</>;
};

// ── Customer redirect helper for /order/:cafeId without tableId ───────────────
const CustomerOrderRedirect: React.FC = () => {
  const { cafeId } = useParams<{ cafeId: string }>();
  return <Navigate to={`/order/${cafeId}/T1`} replace />;
};

// ── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Root Redirect */}
          <Route path="/" element={<Navigate to="/cafe/login" replace />} />

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

          {/* Cafe Dashboard Routes — protected by cafeId-scoped guard */}
          <Route path="/cafe/login" element={<CafeLogin />} />
          <Route
            path="/cafe/:cafeId"
            element={
              <RequireCafeAccess>
                <CafeDashboardLayout />
              </RequireCafeAccess>
            }
          />

          {/* Invite acceptance — public route, validates token internally */}
          <Route path="/invite/:token" element={<InviteAcceptancePage />} />

          {/* Customer Mobile Ordering — no auth required */}
          <Route path="/order/:cafeId" element={<CustomerOrderRedirect />} />
          <Route path="/order/:cafeId/:tableId" element={<CustomerOrderApp />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/cafe/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
