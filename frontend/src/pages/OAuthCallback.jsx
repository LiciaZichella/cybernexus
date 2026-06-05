import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithOAuth } = useAuth();

  useEffect(() => {
    // Legge entrambi i token dai query param del redirect OAuth
    const at = searchParams.get('accessToken');
    const rt = searchParams.get('refreshToken');

    if (!at || !rt) {
      // Token mancanti: redirect a login con messaggio di errore
      navigate('/login?error=oauth');
      return;
    }

    // Completa l'autenticazione OAuth direttamente senza round-trip extra
    loginWithOAuth(at, rt).then(ok => navigate(ok ? '/dashboard' : '/login?error=oauth'));
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
