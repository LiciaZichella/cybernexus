import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


const RANK = { Guest: 0, Player: 1, Analyst: 2, Admin: 3 };

export default function ProtectedRoute({ requiredRole }) {
  const { accessToken, user, loading } = useAuth();

  if (loading) return null;

  
  if (!accessToken) return <Navigate to="/login" replace />;

  
  if (requiredRole && (RANK[user?.role] ?? -1) < (RANK[requiredRole] ?? 99)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
