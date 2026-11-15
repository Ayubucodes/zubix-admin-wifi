import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./features/auth/AuthContext";
import { LoginPage } from "./features/auth/LoginPage";
import { AppLayout } from "./layouts/AppLayout";
import { OverviewPage } from "./pages/OverviewPage";
import { PackagesPage } from "./pages/PackagesPage";
import { CustomersPage } from "./pages/CustomersPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { VouchersPage } from "./pages/VouchersPage";
import { SubscriptionsPage } from "./pages/SubscriptionsPage";
import { NetworkPage } from "./pages/NetworkPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AppLoadingSkeleton } from "./components/ui";
import type { PermissionCode } from "./types/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <AppLoadingSkeleton />;
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

function RequirePermission({ permission, children }: { permission: PermissionCode; children: React.ReactNode }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-600">
        You do not have access to this page.
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route
                index
                element={
                  <RequirePermission permission="reports:read">
                    <OverviewPage />
                  </RequirePermission>
                }
              />
              <Route
                path="packages"
                element={
                  <RequirePermission permission="packages:read">
                    <PackagesPage />
                  </RequirePermission>
                }
              />
              <Route
                path="customers"
                element={
                  <RequirePermission permission="customers:read">
                    <CustomersPage />
                  </RequirePermission>
                }
              />
              <Route
                path="payments"
                element={
                  <RequirePermission permission="payments:read">
                    <PaymentsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="vouchers"
                element={
                  <RequirePermission permission="vouchers:read">
                    <VouchersPage />
                  </RequirePermission>
                }
              />
              <Route
                path="subscriptions"
                element={
                  <RequirePermission permission="subscriptions:read">
                    <SubscriptionsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="network"
                element={
                  <RequirePermission permission="network:read">
                    <NetworkPage />
                  </RequirePermission>
                }
              />
              <Route
                path="reports"
                element={
                  <RequirePermission permission="reports:read">
                    <ReportsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="settings"
                element={
                  <RequirePermission permission="settings:manage">
                    <SettingsPage />
                  </RequirePermission>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
