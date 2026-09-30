/**
 * Vercel Function: POST /api/send-email
 * La llama SOLO el backend (Railway) después de cada transacción exitosa.
 * Protegida con el header x-internal-secret.
 */
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'node:crypto';

interface Payload {
  to: string;
  name: string;
  transaction: {
    id: string;
    type: 'buy' | 'sell' | 'exchange' | 'deposit';
    fromCurrency: string | null;
    toCurrency: string;
    fromAmount: string | null;
    toAmount: string;
    rate: string | null;
    fee: string;
    feeCurrency: string | null;
    contextName: string | null;
    createdAt: string;
  };
}

const ses = new SESClient({
  region: process.env.SES_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.SES_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.SES_SECRET_ACCESS_KEY ?? '',
  },
});

const TYPE_LABEL: Record<Payload['transaction']['type'], string> = {
  buy: 'Compra',
  sell: 'Venta',
  exchange: 'Intercambio',
  deposit: 'Depósito',
};

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const num = (v: string | null, currency?: string | null) =>
  v == null ? '—' : `${Number(v).toLocaleString('es-AR', { maximumFractionDigits: 8 })}${currency ? ` ${currency}` : ''}`;

function secretOk(header: string | string[] | undefined): boolean {
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected || typeof header !== 'string') return false;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function isPayload(b: unknown): b is Payload {
  const p = b as Payload;
  return (
    !!p &&
    typeof p.to === 'string' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.to) &&
    typeof p.transaction?.id === 'string' &&
    typeof p.transaction?.toAmount === 'string'
  );
}

function render(p: Payload) {
  const t = p.transaction;
  const label = TYPE_LABEL[t.type] ?? t.type;
  const date = new Date(t.createdAt).toLocaleString('es-AR', { timeZone: 'UTC' }) + ' UTC';
  const rows: [string, string][] = [
    ['Tipo', label],
    ['Debitado', num(t.fromAmount, t.fromCurrency)],
    ['Acreditado', num(t.toAmount, t.toCurrency)],
    ['Tasa aplicada', t.rate ? `1 ${t.fromCurrency} = ${num(t.rate)} ${t.toCurrency}` : '—'],
    ['Comisión', Number(t.fee) > 0 ? num(t.fee, t.feeCurrency) : 'Sin comisión'],
    ...(t.contextName ? ([['Contexto', t.contextName]] as [string, string][]) : []),
    ['Fecha', date],
    ['ID', t.id],
  ];

  const subject = `AYRA · ${label} confirmada: ${num(t.toAmount, t.toCurrency)}`;
  const text = [`Hola ${p.name},`, '', `Tu operación fue confirmada:`, ...rows.map(([k, v]) => `${k}: ${v}`), '', 'Operación simulada — AYRA no usa dinero real.'].join('\n');
  const html = `<!doctype html><html><body style="margin:0;background:#f4f5fb;font-family:Arial,Helvetica,sans-serif;color:#0f1b3d">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0"><tr><td align="center">
  <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden">
    <tr><td style="background:#0f1b3d;padding:22px 28px;color:#fff;font-size:22px;font-weight:bold;letter-spacing:2px">AYRA
      <div style="font-size:11px;letter-spacing:3px;color:#a5b4fc;font-weight:normal">CONTEXTUAL WALLET</div></td></tr>
    <tr><td style="padding:28px">
      <p style="margin:0 0 6px">Hola ${esc(p.name)},</p>
      <p style="margin:0 0 20px">Tu <b>${esc(label.toLowerCase())}</b> fue confirmada ✅</p>
      <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px">
        ${rows.map(([k, v]) => `<tr><td style="color:#64748b;border-bottom:1px solid #eef0f6">${esc(k)}</td><td align="right" style="border-bottom:1px solid #eef0f6"><b>${esc(v)}</b></td></tr>`).join('')}
      </table>
      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8">Operación simulada con fines educativos — AYRA no usa dinero real.</p>
    </td></tr>
  </table></td></tr></table></body></html>`;
  return { subject, text, html };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!secretOk(req.headers['x-internal-secret'])) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!isPayload(req.body)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  if (!process.env.SES_FROM_EMAIL) {
    return res.status(500).json({ error: 'SES_FROM_EMAIL no configurado' });
  }

  const { subject, text, html } = render(req.body);

  try {
    const out = await ses.send(
      new SendEmailCommand({
        Source: process.env.SES_FROM_EMAIL,
        Destination: { ToAddresses: [req.body.to] },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: { Text: { Data: text, Charset: 'UTF-8' }, Html: { Data: html, Charset: 'UTF-8' } },
        },
      }),
    );
    return res.status(200).json({ ok: true, messageId: out.MessageId });
  } catch (err) {
    console.error('[send-email] SES error', err);
    return res.status(502).json({ error: 'No se pudo enviar el email' });
  }
}
