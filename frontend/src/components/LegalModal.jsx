export default function LegalModal({ tipo, onClose }) {
  if (!tipo) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(7,9,15,.82)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()} //chiude il contenuto con onClik e con e.stopPropagation se si tocca fuori
        style={{
          background: 'var(--bg2,#0d1117)', border: '0.5px solid rgba(255,255,255,.12)',
          borderRadius: 16, maxWidth: 580, width: '100%', maxHeight: '80vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 24px 72px rgba(0,0,0,.5)',
        }}
      >
        <div style={{
          padding: '18px 24px', borderBottom: '0.5px solid rgba(255,255,255,.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 17, color: '#f0f4ff' }}>
            {tipo === 'privacy' ? '🔒 Privacy Policy' : '📋 Termini di Servizio'}
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: '50%', border: '0.5px solid rgba(255,255,255,.13)',
            background: 'transparent', color: '#8a96b0', cursor: 'pointer', fontSize: 14, lineHeight: 1,
          }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', overflowY: 'auto', fontSize: 13, color: '#8a96b0', lineHeight: 1.75 }}>
          {tipo === 'privacy' ? (
            <>
              <p style={{ marginBottom: 14 }}>
                <strong style={{ color: '#f0f4ff' }}>Dati raccolti.</strong>{' '}
                CyberNexus raccoglie esclusivamente i dati necessari al funzionamento della piattaforma educativa: indirizzo email, username, progressi nelle sfide CTF e punti accumulati. Le password non vengono mai memorizzate in chiaro — viene conservato unicamente l'hash bcrypt.
              </p>
              <p style={{ marginBottom: 14 }}>
                <strong style={{ color: '#f0f4ff' }}>Utilizzo dei dati.</strong>{' '}
                I dati sono usati esclusivamente per autenticare l'utente, calcolare la classifica e mostrare i progressi personali. I dati <strong style={{ color: '#f0f4ff' }}>non vengono venduti né ceduti a terzi</strong> in alcuna forma. Non è presente pubblicità né tracciamento a scopo commerciale.
              </p>
              <p style={{ marginBottom: 14 }}>
                <strong style={{ color: '#f0f4ff' }}>Autenticazione (JWT).</strong>{' '}
                La piattaforma utilizza token JWT per gestire le sessioni: l'access token ha scadenza di 15 minuti, il refresh token di 7 giorni e viene conservato in <code>localStorage</code>. Non vengono usati cookie di profilazione né tracker di terze parti.
              </p>
              <p style={{ marginBottom: 14 }}>
                <strong style={{ color: '#f0f4ff' }}>Archiviazione.</strong>{' '}
                I dati sono archiviati su <strong style={{ color: '#f0f4ff' }}>MongoDB Atlas</strong>, servizio cloud con crittografia a riposo. Non vengono archiviati dati bancari, di pagamento o documenti d'identità — la piattaforma è completamente gratuita.
              </p>
              <p style={{ color: '#4a5568', fontSize: 11, marginTop: 18 }}>
                Ultimo aggiornamento: Giugno 2026 · CyberNexus — Ingegneria Informatica.
              </p>
              <p style={{ marginTop: 8, fontSize: 12, color: '#7a8aaa' }}>
                Per informazioni: <strong style={{ color: '#f0f4ff' }}>info@cybernexus.io</strong>
              </p>
            </>
          ) : (
            <>
              <p style={{ marginBottom: 14 }}>
                Utilizzando <strong style={{ color: '#f0f4ff' }}>CyberNexus</strong> accetti di impiegare la piattaforma esclusivamente per scopi educativi e di formazione nel campo della cybersecurity. È vietato usare le competenze acquisite per danneggiare sistemi reali o violare la privacy altrui.
              </p>
              <p style={{ marginBottom: 14 }}>
                <strong style={{ color: '#f0f4ff' }}>Condotta.</strong>{' '}
                Gli utenti si impegnano a mantenere un comportamento rispettoso all'interno delle War Room e nella community. Comportamenti abusivi, tentativi di cheating o sabotaggio delle sfide comportano la sospensione dell'account.
              </p>
              <p style={{ marginBottom: 14 }}>
                <strong style={{ color: '#f0f4ff' }}>Contenuti CTF.</strong>{' '}
                Le sfide CTF sono progettate a scopo didattico. È vietato condividere soluzioni, flag o walkthrough al di fuori della piattaforma, per rispetto degli altri partecipanti.
              </p>
              <p style={{ marginBottom: 14 }}>
                <strong style={{ color: '#f0f4ff' }}>Account e gratuità.</strong>{' '}
                Ogni utente è responsabile della sicurezza del proprio account. La piattaforma è <strong style={{ color: '#f0f4ff' }}>completamente gratuita</strong> e non prevede pagamenti, abbonamenti o transazioni di alcun tipo.
              </p>
              <p style={{ color: '#4a5568', fontSize: 11, marginTop: 18 }}>
                Ultimo aggiornamento: Giugno 2026 · CyberNexus — Ingegneria Informatica.
              </p>
              <p style={{ marginTop: 8, fontSize: 12, color: '#7a8aaa' }}>
                Per informazioni: <strong style={{ color: '#f0f4ff' }}>info@cybernexus.io</strong>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
