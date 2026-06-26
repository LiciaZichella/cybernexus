import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithOAuth } = useAuth();

  useEffect(() => {
    
    const at = searchParams.get('accessToken');
    const rt = searchParams.get('refreshToken');

    if (!at || !rt) {
      
      navigate('/login?error=oauth');
      return;
    }

    
    loginWithOAuth(at, rt).then(ok => navigate(ok ? '/dashboard' : '/login?error=oauth'));
  }, []); 
//Mentre aspetta renderizza uno spinner CSS
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
