import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ requiredRole }) {
  const { accessToken, user, loading } = useAuth();

  if (loading) return null;

  // Non autenticato → reindirizza al login
  if (!accessToken) return <Navigate to="/login" replace />;

  // Ruolo insufficiente → reindirizza alla dashboard
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
