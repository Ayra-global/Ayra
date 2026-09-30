import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, ApiError } from '../lib/api';
import type { ChatMessage } from '../lib/types';

const SUGGESTIONS = ['¿Cuánto tengo en total?', '¿Cuánto gasté en mi viaje?', '¿Qué diferencia hay entre vender e intercambiar?'];

export function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: '¡Hola! Soy AYRA AI 👋 ¿En qué puedo ayudarte hoy?' },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, open]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || sending) return;
    const history = messages.slice(1); // sin el saludo inicial
    setMessages((m) => [...m, { role: 'user', text: msg }]);
    setInput('');
    setSending(true);
    try {
      const { reply } = await api.chat(msg, history);
      setMessages((m) => [...m, { role: 'assistant', text: reply }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: err instanceof ApiError ? `⚠️ ${err.message}` : '⚠️ Error de conexión' }]);
    } finally {
      setSending(false);
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  if (!open) {
    return (
      <button className="assistant-fab" onClick={() => setOpen(true)}>
        <span>🤖</span> AYRA AI
      </button>
    );
  }

  return (
    <aside className="assistant card">
      <header>
        <b>🤖 AYRA AI</b>
        <button className="btn-ghost" onClick={() => setOpen(false)} aria-label="Cerrar">✕</button>
      </header>
      <div className="messages">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>{m.text}</div>
        ))}
        {sending && <div className="bubble assistant typing">…</div>}
        <div ref={endRef} />
      </div>
      {messages.length === 1 && (
        <div className="suggestions">
          {SUGGESTIONS.map((s) => <button key={s} onClick={() => void send(s)}>{s}</button>)}
        </div>
      )}
      <form onSubmit={onSubmit} className="chat-input">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Preguntá sobre tu dinero…" maxLength={1000} />
        <button className="btn-primary" disabled={sending || !input.trim()}>Enviar</button>
      </form>
    </aside>
  );
}
