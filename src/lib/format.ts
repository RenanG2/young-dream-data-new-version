/** "2026-11-01T00:00:00.000Z" -> "01/11/2026" (sem converter fuso: o campo é uma data de calendário). */
export function formatDateBR(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function formatDateTimeBR(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Data de hoje no fuso do navegador, no formato YYYY-MM-DD (toISOString() usaria UTC e erraria à noite). */
export function todayLocalISO(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}
