import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import type { UserRole } from '../../lib/types';

export function ProtectedRoute({
  children,
  allow,
}: {
  children: ReactNode;
  allow?: UserRole[];
}) {
  const { accessToken, user } = useAuthStore();

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allow && !allow.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
