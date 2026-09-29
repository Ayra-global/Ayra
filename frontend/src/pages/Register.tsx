import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import { AuthShell } from './Login';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setSubmitting(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.details ?? {});
      } else setError('No se pudo conectar con el servidor');
    } finally {
      setSubmitting(false);
    }
  }

  const fe = (k: string) => fieldErrors[k]?.[0] && <small className="field-error">{fieldErrors[k][0]}</small>;

  return (
    <AuthShell title="Creá tu cuenta" subtitle="Recibís 1.000 USD ficticios para empezar">
      <form onSubmit={onSubmit} className="form">
        <label>
          Nombre
          <input value={form.name} onChange={set('name')} autoComplete="name" required minLength={2} />
          {fe('name')}
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
          {fe('email')}
        </label>
        <label>
          Contraseña
          <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" required minLength={8} />
          <small className="muted">Mínimo 8 caracteres, con letras y números</small>
          {fe('password')}
        </label>
        {error && <p className="alert error">{error}</p>}
        <button className="btn-primary" disabled={submitting}>{submitting ? 'Creando…' : 'Crear cuenta'}</button>
      </form>
      <p className="muted center">¿Ya tenés cuenta? <Link to="/login">Ingresá</Link></p>
    </AuthShell>
  );
}
