import { OPEN_ASSISTANT_EVENT } from './AssistantChat';
import { IconChevron, IconSparkles } from './Icons';

/** Tarjeta "AYRA AI · ¿En qué puedo ayudarte hoy?" (como en el mockup del flyer). Abre el chat. */
export function AssistantBanner() {
  return (
    <button type="button" className="ai-banner" onClick={() => window.dispatchEvent(new Event(OPEN_ASSISTANT_EVENT))}>
      <span className="ai-banner-icon"><IconSparkles size={24} /></span>
      <span className="ai-banner-text">
        <b>AYRA AI</b>
        <span>¿En qué puedo ayudarte hoy?</span>
      </span>
      <IconChevron />
    </button>
  );
}
