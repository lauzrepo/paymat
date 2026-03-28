import { Navigate } from 'react-router-dom';
import { authStore } from '../../store/authStore';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!authStore.getAccessToken()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
