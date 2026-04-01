import { Navigate } from 'react-router-dom';
import { authStore } from '../../store/authStore';
import { useOrgSlug } from '../../context/OrgSlugContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const orgSlug = useOrgSlug();
  if (!authStore.getAccessToken()) {
    return <Navigate to={`/${orgSlug}/login`} replace />;
  }
  return <>{children}</>;
}
