import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';

import { AuthLayout } from './components/layout/AuthLayout';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { MateProvider } from './context/MateContext';

import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { AcceptInvitePage } from './pages/auth/AcceptInvitePage';

import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ContactsPage } from './pages/contacts/ContactsPage';
import { ContactDetailPage } from './pages/contacts/ContactDetailPage';
import { FamiliesPage } from './pages/families/FamiliesPage';
import { FamilyDetailPage } from './pages/families/FamilyDetailPage';
import { ProgramsPage } from './pages/programs/ProgramsPage';
import { ProgramDetailPage } from './pages/programs/ProgramDetailPage';
import { EnrollmentsPage } from './pages/enrollments/EnrollmentsPage';
import { InvoicesPage } from './pages/invoices/InvoicesPage';
import { InvoiceDetailPage } from './pages/invoices/InvoiceDetailPage';
import { PaymentsPage } from './pages/payments/PaymentsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { FeedbackPage } from './pages/feedback/FeedbackPage';
import { FeedbackDetailPage } from './pages/feedback/FeedbackDetailPage';
import { BillingPage } from './pages/billing/BillingPage';
import { OnboardingPage } from './pages/onboarding/OnboardingPage';
import { HowToPage } from './pages/help/HowToPage';
import { AssistantPage } from './pages/assistant/AssistantPage';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />

          <Route path="/accept-invite" element={<AcceptInvitePage />} />

          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute>
                <MateProvider>
                  <AppLayout />
                </MateProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/contacts/:id" element={<ContactDetailPage />} />
            <Route path="/families" element={<FamiliesPage />} />
            <Route path="/families/:id" element={<FamilyDetailPage />} />
            <Route path="/programs" element={<ProgramsPage />} />
            <Route path="/programs/:id" element={<ProgramDetailPage />} />
            <Route path="/enrollments" element={<EnrollmentsPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/feedback/:id" element={<FeedbackDetailPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/how-to" element={<HowToPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
