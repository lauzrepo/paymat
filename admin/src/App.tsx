import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';

import { AuthLayout } from './components/layout/AuthLayout';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';

import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ContactsPage } from './pages/contacts/ContactsPage';
import { ContactDetailPage } from './pages/contacts/ContactDetailPage';
import { FamiliesPage } from './pages/families/FamiliesPage';
import { FamilyDetailPage } from './pages/families/FamilyDetailPage';
import { ProgramsPage } from './pages/programs/ProgramsPage';
import { EnrollmentsPage } from './pages/enrollments/EnrollmentsPage';
import { InvoicesPage } from './pages/invoices/InvoicesPage';
import { InvoiceDetailPage } from './pages/invoices/InvoiceDetailPage';
import { PaymentsPage } from './pages/payments/PaymentsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { FeedbackPage } from './pages/feedback/FeedbackPage';
import { FeedbackDetailPage } from './pages/feedback/FeedbackDetailPage';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/contacts/:id" element={<ContactDetailPage />} />
            <Route path="/families" element={<FamiliesPage />} />
            <Route path="/families/:id" element={<FamilyDetailPage />} />
            <Route path="/programs" element={<ProgramsPage />} />
            <Route path="/enrollments" element={<EnrollmentsPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/feedback/:id" element={<FeedbackDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
