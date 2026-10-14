// Helpers for turning the site's light markup (*italic*, **bold**, `code`, {circled})
// into HTML, Markdown or plain text for the résumé outputs.

export const esc = (s = '') =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);

// Résumé HTML: keep bold and code, soften italics, drop the hand-drawn circle.
export const html = (s = '') =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\{(.+?)\}/g, '$1');

export const md = (s = '') =>
  String(s ?? '')
    .replace(/\{(.+?)\}/g, '$1')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '_$1_');

export const plain = (s = '') =>
  String(s ?? '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\{(.+?)\}/g, '$1');

// Skill items mark "core" skills as *Name* — strip that for print.
export const skillName = (s = '') => String(s).replace(/^\*([^*]+)\*/, '$1');

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

// "Nov 2024 — Now" → { start: "2024-11", end: undefined }; "2021 — 2024" → { start: "2021", end: "2024" }
export function parsePeriod(period = '') {
  const parts = String(period).split(/\s*[—–-]\s*/);
  const one = (t = '') => {
    const m = t.trim().match(/^(?:([A-Za-z]{3})[a-z]*\s+)?(\d{4})$/);
    if (!m) return undefined;
    const mon = m[1] && MONTHS[m[1].toLowerCase()];
    return mon ? `${m[2]}-${String(mon).padStart(2, '0')}` : m[2];
  };
  return { start: one(parts[0]), end: parts.length > 1 ? one(parts[1]) : one(parts[0]) };
}
