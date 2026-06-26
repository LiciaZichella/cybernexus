import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Landing       from './pages/Landing';
import Login         from './pages/Login';
import OAuthCallback from './pages/OAuthCallback';
import Dashboard     from './pages/Dashboard';
import CTFArena      from './pages/CTFArena';
import Leaderboard   from './pages/Leaderboard';
import WarRoom       from './pages/WarRoom';
import Admin         from './pages/Admin';

export default function App() {
  return (
    <Routes>  
      
      <Route path="/"               element={<Landing />} />
      <Route path="/login"          element={<Login />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />

      
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard"   element={<Dashboard />} />
        <Route path="/ctf"         element={<CTFArena />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/warroom"      element={<WarRoom />} />
        <Route path="/warroom/:id" element={<WarRoom />} />
      </Route>

      
      <Route element={<ProtectedRoute requiredRole="Admin" />}>
        <Route path="/admin" element={<Admin />} />
      </Route>
    </Routes>
  );
}
