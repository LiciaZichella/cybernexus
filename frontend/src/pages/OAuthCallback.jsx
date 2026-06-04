import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshToken: doRefresh } = useAuth();

  useEffect(() => {
    const rt = searchParams.get('refreshToken');
    if (!rt) { navigate('/login'); return; }
    localStorage.setItem('refreshToken', rt);
    doRefresh().then(ok => navigate(ok ? '/dashboard' : '/login'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', gap: 14, fontFamily: "'DM Sans',sans-serif",
      background: '#111827', color: '#8a96b0', fontSize: 14,
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        border: '2px solid rgba(255,255,255,.1)', borderTopColor: '#7C6FEA',
        animation: 'spin 0.8s linear infinite',
      }} />
      Accesso in corso...
    </div>
  );
}
