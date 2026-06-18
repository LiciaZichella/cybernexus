import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Gerarchia ruoli — deve corrispondere al RANK nel middleware backend
const RANK = { Guest: 0, Player: 1, Analyst: 2, Manager: 3, Admin: 4 };

export default function ProtectedRoute({ requiredRole }) {
  const { accessToken, user, loading } = useAuth();

  if (loading) return null;

  // Non autenticato → reindirizza al login
  if (!accessToken) return <Navigate to="/login" replace />;

  // Ruolo insufficiente → reindirizza alla dashboard
  if (requiredRole && (RANK[user?.role] ?? -1) < (RANK[requiredRole] ?? 99)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
