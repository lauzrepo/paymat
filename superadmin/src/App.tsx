import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';

import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';

import { LoginPage } from './pages/auth/LoginPage';
import { OrganizationsPage } from './pages/organizations/OrganizationsPage';
import { OrganizationDetailPage } from './pages/organizations/OrganizationDetailPage';
import { CreateOrganizationPage } from './pages/organizations/CreateOrganizationPage';
import { SettingsPage } from './pages/settings/SettingsPage';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<OrganizationsPage />} />
            <Route path="/organizations/new" element={<CreateOrganizationPage />} />
            <Route path="/organizations/:id" element={<OrganizationDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
