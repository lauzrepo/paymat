import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryClient } from './lib/queryClient';
import { setOrgSlug } from './lib/api';
import { OrgSlugContext } from './context/OrgSlugContext';

import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';

import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { HomePage } from './pages/home/HomePage';
import { AccountPage } from './pages/account/AccountPage';
import { EnrollmentsPage } from './pages/enrollments/EnrollmentsPage';
import { InvoicesPage } from './pages/invoices/InvoicesPage';
import { InvoiceDetailPage } from './pages/invoices/InvoiceDetailPage';
import { PaymentHistoryPage } from './pages/payments/PaymentHistoryPage';
import { FeedbackListPage } from './pages/feedback/FeedbackListPage';
import { FeedbackFormPage } from './pages/feedback/FeedbackFormPage';

function OrgRoutes() {
  const { orgSlug = '' } = useParams<{ orgSlug: string }>();

  useEffect(() => {
    setOrgSlug(orgSlug);
  }, [orgSlug]);

  return (
    <OrgSlugContext.Provider value={orgSlug}>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="enrollments" element={<EnrollmentsPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="payments" element={<PaymentHistoryPage />} />
          <Route path="feedback" element={<FeedbackListPage />} />
          <Route path="feedback/new" element={<FeedbackFormPage />} />
        </Route>

        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </OrgSlugContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/:orgSlug/*" element={<OrgRoutes />} />
          <Route path="*" element={<Navigate to="/lauz" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
