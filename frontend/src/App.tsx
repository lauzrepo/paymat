import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';

import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';

import { LoginPage } from './pages/auth/LoginPage';
import { HomePage } from './pages/home/HomePage';
import { FeedbackListPage } from './pages/feedback/FeedbackListPage';
import { FeedbackFormPage } from './pages/feedback/FeedbackFormPage';

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
            <Route index element={<HomePage />} />
            <Route path="/feedback" element={<FeedbackListPage />} />
            <Route path="/feedback/new" element={<FeedbackFormPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
