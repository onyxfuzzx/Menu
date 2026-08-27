import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

interface RequireAuthProps {
  allowedRoles?: string[];
}

export function RequireAuth({ allowedRoles }: RequireAuthProps) {
  const { user, token } = useAuthStore();
  const location = useLocation();

  if (!token || !user) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Role not authorized, redirect to home/dashboard
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
