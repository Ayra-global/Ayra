import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError, consumeSessionExpired, SESSION_EXPIRED_MESSAGE } from '../lib/api';
import { Logo } from '../components/Logo';
import { IconContexts, IconExchange, IconGlobe, IconShield, IconSparkles, IconUsers } from '../components/Icons';

const FEATURES = [
  { icon: IconGlobe, label: 'Múltiples monedas' },
  { icon: IconContexts, label: 'Contextos personalizables' },
  { icon: IconExchange, label: 'Conversión en tiempo real' },
  { icon: IconUsers, label: 'Proyectos compartidos' },
  { icon: IconSparkles, label: 'Asistente con IA' },
  { icon: IconShield, label: 'Seguridad avanzada' },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expired] = useState(consumeSessionExpired);

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
      {expired && !error && <p className="alert warn">{SESSION_EXPIRED_MESSAGE}</p>}
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
        <Logo size={84} tone="light" tagline />
        <h1>Tu dinero se adapta <span className="grad">a tu vida</span></h1>
        <p>
          AYRA es una billetera digital multi-moneda para gestionar tu dinero según tu contexto de vida:
          viajes, estudios, trabajo o proyectos compartidos. Todo en un solo lugar, simple y seguro.
        </p>
        <ul className="feature-grid">
          {FEATURES.map(({ icon: Icon, label }) => (
            <li key={label}>
              <span className="feature-icon"><Icon /></span>
              {label}
            </li>
          ))}
        </ul>
        <p className="handwritten">Same money. Bigger dreams ♡</p>
      </section>
      <section className="auth-card card">
        <h2>{title}</h2>
        <p className="muted">{subtitle}</p>
        {children}
      </section>
    </div>
  );
}
