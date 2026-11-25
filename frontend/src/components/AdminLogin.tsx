import { useState } from 'react';

interface AdminLoginProps {
  onLogin: (token: string) => void;
  error?: string | null;
}

export function AdminLogin({ onLogin, error }: AdminLoginProps) {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onLogin(password.trim());
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#0b1120',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        padding: '2rem',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '380px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span className="mi" aria-hidden="true" style={{ fontSize: '2rem', color: '#0284c7', display: 'block', marginBottom: '0.5rem' }}>
            directions_bus
          </span>
          <h2 style={{ color: '#f8fafc', margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
            Costa Bus Tracker
          </h2>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.82rem' }}>
            Acceso restringido a Torre de Control
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(220, 38, 38, 0.12)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            color: '#f87171',
            padding: '0.75rem',
            borderRadius: '6px',
            marginBottom: '1.25rem',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <span className="mi" aria-hidden="true" style={{ fontSize: '1rem' }}>error_outline</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="password" style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 500 }}>
              Clave de operador
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #334155',
                backgroundColor: '#0b1120',
                color: '#f8fafc',
                fontSize: '0.9rem',
                outline: 'none'
              }}
              placeholder="Ingresa la contraseña"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="btn btn--primary"
            style={{ width: '100%', padding: '0.65rem', fontWeight: 600, fontSize: '0.88rem' }}
          >
            Acceder al panel
          </button>
        </form>
      </div>
    </div>
  );
}