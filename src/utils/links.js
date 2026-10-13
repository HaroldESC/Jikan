/**
 * Utilidades de enlaces a recursos por actividad (puras: sin React,
 * sin Supabase, sin i18n).
 *
 * Forma canónica: array de `{ label: string, url: string }`.
 * Serialización CSV: `label|url;label|url`.
 */

export const MAX_LINKS = 10;
export const LINK_LABEL_MAX = 80;
export const LINK_URL_MAX = 2048;

/**
 * ¿Es una URL válida para un enlace? Solo `http:`/`https:`, no vacía y
 * con longitud total ≤ 2048.
 *
 * @param {*} url
 * @returns {boolean}
 */
export function isValidUrl(url) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed === '' || trimmed.length > LINK_URL_MAX) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normaliza cualquier entrada a un array válido de enlaces: conserva solo
 * objetos con URL válida, recorta el label a 80 caracteres y el total a 10.
 *
 * Nunca lanza.
 *
 * @param {*} value
 * @returns {Array<{label: string, url: string}>}
 */
export function sanitizeLinks(value) {
  if (!Array.isArray(value)) return [];
  const links = [];
  for (const item of value) {
    if (links.length >= MAX_LINKS) break;
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const url = String(item.url ?? '').trim();
    if (!isValidUrl(url)) continue;
    const label = String(item.label ?? '').trim().slice(0, LINK_LABEL_MAX);
    links.push({ label, url });
  }
  return links;
}

/**
 * Serializa enlaces al formato de la columna CSV: `label|url;label|url`.
 *
 * @param {*} links
 * @returns {string}
 */
export function linksToCsvValue(links) {
  return sanitizeLinks(links)
    .map((link) => `${link.label}|${link.url}`)
    .join(';');
}

/**
 * Parsea el formato `label|url;label|url` de vuelta a array.
 * Las entradas malformadas se descartan. Nunca lanza.
 *
 * @param {*} text
 * @returns {Array<{label: string, url: string}>}
 */
export function linksFromCsvValue(text) {
  try {
    if (typeof text !== 'string') return [];
    const trimmed = text.trim();
    if (trimmed === '') return [];
    const collected = [];
    for (const entry of trimmed.split(';')) {
      const part = entry.trim();
      if (part === '') continue;
      const separator = part.indexOf('|');
      if (separator === -1) continue;
      const label = part.slice(0, separator).trim();
      const url = part.slice(separator + 1).trim();
      if (url === '') continue;
      collected.push({ label, url });
    }
    return sanitizeLinks(collected);
  } catch {
    return [];
  }
}
