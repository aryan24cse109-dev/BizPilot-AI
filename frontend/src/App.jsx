import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';

// Layouts
import { BusinessLayout } from './layouts/BusinessLayout.jsx';
import { ClientLayout } from './layouts/ClientLayout.jsx';
import { AuthLayout } from './layouts/AuthLayout.jsx';

// Auth Pages
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.jsx';
import { OnboardingPage } from './pages/OnboardingPage.jsx';

// Business Pages
import { DashboardPage } from './pages/DashboardPage.jsx';
import { AIAssistantPage } from './pages/AIAssistantPage.jsx';
import { InvoicesPage } from './pages/InvoicesPage.jsx';
import { InvoiceDetailsPage } from './pages/InvoiceDetailsPage.jsx';
import { ClientsPage } from './pages/ClientsPage.jsx';
import { DiscoverPage } from './pages/DiscoverPage.jsx';
import { PaymentsPage } from './pages/PaymentsPage.jsx';
import { MessagesPage } from './pages/MessagesPage.jsx';
import { AnalyticsPage } from './pages/AnalyticsPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';

// Client Portal Pages
import { ClientHomePage } from './pages/client/ClientHomePage.jsx';
import { ClientInvoicesPage } from './pages/client/ClientInvoicesPage.jsx';
import { ClientInvoiceDetailsPage } from './pages/client/ClientInvoiceDetailsPage.jsx';
import { ClientMessagingPage } from './pages/client/ClientMessagingPage.jsx';
import { ClientPaymentHistoryPage } from './pages/client/ClientPaymentHistoryPage.jsx';
import { ClientProfilePage } from './pages/client/ClientProfilePage.jsx';

import { LoadingSpinner } from './components/common/LoadingSpinner.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark flex items-center justify-center">
        <LoadingSpinner size="lg" text="Authenticating session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Smart Root Redirect based on user's activeRole preference
const RootRedirect = () => {
  const { user, loading, activeRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading workspace..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={activeRole === 'client' ? '/portal' : '/business'} replace />;
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <ToastProvider>
              <BrowserRouter>
                <Routes>
                  {/* Public Auth Routes inside AuthLayout */}
                  <Route element={<AuthLayout />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route
                      path="/onboarding"
                      element={
                        <ProtectedRoute>
                          <OnboardingPage />
                        </ProtectedRoute>
                      }
                    />
                  </Route>

                  {/* Business Workspace Experience */}
                  <Route
                    path="/business"
                    element={
                      <ProtectedRoute>
                        <BusinessLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<DashboardPage />} />
                    <Route path="ai" element={<AIAssistantPage />} />
                    <Route path="invoices" element={<InvoicesPage />} />
                    <Route path="invoices/:id" element={<InvoiceDetailsPage />} />
                    <Route path="clients" element={<ClientsPage />} />
                    <Route path="discover" element={<DiscoverPage />} />
                    <Route path="payments" element={<PaymentsPage />} />
                    <Route path="messages" element={<MessagesPage />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Route>

                  {/* Client Portal Experience (Separate Approchable Layout) */}
                  <Route
                    path="/portal"
                    element={
                      <ProtectedRoute>
                        <ClientLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<ClientHomePage />} />
                    <Route path="invoices" element={<ClientInvoicesPage />} />
                    <Route path="invoices/:id" element={<ClientInvoiceDetailsPage />} />
                    <Route path="history" element={<ClientPaymentHistoryPage />} />
                    <Route path="messages" element={<ClientMessagingPage />} />
                    <Route path="profile" element={<ClientProfilePage />} />
                  </Route>

                  {/* Root redirect */}
                  <Route path="/" element={<RootRedirect />} />

                  {/* Legacy routes backward compatibility */}
                  <Route path="/invoices" element={<Navigate to="/business/invoices" replace />} />
                  <Route path="/invoices/:id" element={<Navigate to="/business/invoices" replace />} />
                  <Route path="/ai" element={<Navigate to="/business/ai" replace />} />
                  <Route path="/clients" element={<Navigate to="/business/clients" replace />} />
                  <Route path="/payments" element={<Navigate to="/business/payments" replace />} />
                  <Route path="/messages" element={<Navigate to="/business/messages" replace />} />
                  <Route path="/analytics" element={<Navigate to="/business/analytics" replace />} />
                  <Route path="/settings" element={<Navigate to="/business/settings" replace />} />

                  {/* Fallback */}
                  <Route path="*" element={<RootRedirect />} />
                </Routes>
              </BrowserRouter>
            </ToastProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
