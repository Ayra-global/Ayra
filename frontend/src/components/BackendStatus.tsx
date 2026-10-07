import { useCallback, useEffect, useRef, useState } from 'react';
import { BACKEND_DOWN_EVENT, BACKEND_UP_EVENT, checkHealth } from '../lib/api';
import './status.css';

const RETRY_SECONDS = 10;

type Status = 'ok' | 'down' | 'restored';

/**
 * Aviso global de "backend no disponible".
 * - Al abrir la app hace un ping a /health (así el aviso aparece incluso en el login).
 * - Cualquier request que falle por red dispara el aviso (ver lib/api.ts).
 * - Mientras está caído, reintenta solo cada 10 s y permite reintentar a mano.
 * - Cuando vuelve, muestra "Conexión restablecida" con un botón para actualizar.
 */
export function BackendStatus() {
  const [status, setStatus] = useState<Status>('ok');
  const [countdown, setCountdown] = useState(RETRY_SECONDS);
  const [checking, setChecking] = useState(false);
  const statusRef = useRef<Status>('ok');
  statusRef.current = status;

  const retry = useCallback(async () => {
    setChecking(true);
    await checkHealth(); // dispara BACKEND_UP / BACKEND_DOWN según el resultado
    setChecking(false);
    setCountdown(RETRY_SECONDS);
  }, []);

  // Escuchar los eventos que emite lib/api.ts
  useEffect(() => {
    const onDown = () => {
      setStatus('down');
      setCountdown(RETRY_SECONDS);
    };
    const onUp = () => {
      if (statusRef.current === 'down') setStatus('restored');
    };
    window.addEventListener(BACKEND_DOWN_EVENT, onDown);
    window.addEventListener(BACKEND_UP_EVENT, onUp);
    void checkHealth(); // chequeo inicial
    return () => {
      window.removeEventListener(BACKEND_DOWN_EVENT, onDown);
      window.removeEventListener(BACKEND_UP_EVENT, onUp);
    };
  }, []);

  // Cuenta regresiva y reintento automático mientras está caído
  useEffect(() => {
    if (status !== 'down') return;
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          void retry();
          return RETRY_SECONDS;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [status, retry]);

  // El aviso de "restablecida" se oculta solo
  useEffect(() => {
    if (status !== 'restored') return;
    const id = setTimeout(() => setStatus('ok'), 8000);
    return () => clearTimeout(id);
  }, [status]);

  if (status === 'ok') return null;

  if (status === 'restored') {
    return (
      <div className="backend-banner restored" role="status">
        <span className="dot" />
        <span className="text">Conexión restablecida.</span>
        <button type="button" onClick={() => window.location.reload()}>Actualizar</button>
      </div>
    );
  }

  return (
    <div className="backend-banner down" role="alert">
      <span className="dot" />
      <span className="text">
        <b>No pudimos conectar con el servidor.</b>{' '}
        <span className="hint">{checking ? 'Reintentando…' : `Reintentamos en ${countdown} s.`}</span>
      </span>
      <button type="button" onClick={() => void retry()} disabled={checking}>
        Reintentar ahora
      </button>
    </div>
  );
}
