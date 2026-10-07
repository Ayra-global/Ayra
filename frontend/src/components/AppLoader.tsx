import { Logo } from './Logo';
import './status.css';

/** Pantalla de carga con la marca AYRA (mientras se valida la sesión al abrir la app). */
export function AppLoader({ message = 'Cargando tu billetera…' }: { message?: string }) {
  return (
    <div className="app-loader" role="status" aria-live="polite">
      <div className="app-loader-logo">
        <Logo size={56} subtitle={false} />
      </div>
      <div className="app-loader-bar" aria-hidden="true">
        <span />
      </div>
      <p>{message}</p>
    </div>
  );
}
