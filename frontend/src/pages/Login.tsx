import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Bienvenido de nuevo" subtitle="Ingresá a tu wallet">
      <form onSubmit={onSubmit} className="form">
        <label>
          Email
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Contraseña
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="alert error">{error}</p>}
        <button className="btn-primary" disabled={submitting}>{submitting ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
      <p className="muted center">¿No tenés cuenta? <Link to="/register">Registrate</Link></p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="auth-screen">
      <section className="auth-hero">
        <div className="brand big">
          <span className="brand-mark">AYRA</span>
          <span className="brand-sub">CONTEXTUAL WALLET</span>
        </div>
        <h1>Tu dinero se adapta <span className="grad">a tu vida</span></h1>
        <p>Una billetera. Todos tus mundos. Viajes, estudios, trabajo y proyectos compartidos en un solo lugar.</p>
      </section>
      <section className="auth-card card">
        <h2>{title}</h2>
        <p className="muted">{subtitle}</p>
        {children}
      </section>
    </div>
  );
}
