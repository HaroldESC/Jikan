/**
 * Utilidades de flashcards (puras: sin React, sin Supabase, sin IndexedDB,
 * sin i18n).
 *
 * Esta es la **única** fuente de validación/normalización y de cálculo de
 * repaso: la reusan `flashcardStore`, `useFlashcards`, el panel y el backup.
 *
 * Forma canónica de mazo (`Deck`):
 *   { title, exam_id }
 *   - `title`   → nombre del mazo (obligatorio)
 *   - `exam_id` → uuid de `exams(id)` o `null` (opcional; vínculo informativo)
 *
 * Forma canónica de carta (`Card`):
 *   { front, back, ease, interval, due, reps, last_review }
 *   - `front`      → anverso (obligatorio)
 *   - `back`       → reverso (obligatorio)
 *   - `ease`       → factor de dificultad en [MIN_EASE, MAX_EASE]
 *   - `interval`   → días hasta el próximo repaso (entero ≥ 0)
 *   - `due`        → 'YYYY-MM-DD' o `null` (nunca repasada)
 *   - `reps`       → repasos acumulados (0 = carta nueva)
 *   - `last_review`→ ISO completo del último repaso o `null`
 *
 * El algoritmo es un **SM-2 ligero**: solo hay dos grados (`'again'` y
 * `'good'`), sin barajado de las dos caras. El reparto de turnos se calcula
 * siempre en **fechas locales**: `toISOString()` convierte a UTC y podría
 * desplazar el día en zonas horarias negativas o positivas.
 */

import { isValidExamDate } from './exams';

export const MAX_DECK_TITLE = 80;
export const MAX_CARD_SIDE = 1000;
export const MAX_CARDS_PER_DECK = 500;
export const MIN_EASE = 1.3;
export const DEFAULT_EASE = 2.5;
export const MAX_EASE = 3.0;
export const MAX_INTERVAL_DAYS = 365;
export const SECOND_INTERVAL_DAYS = 3;
export const DEFAULT_REVIEW_LIMIT = 20;

const pad2 = (value) => String(value).padStart(2, '0');

/** Redondeo a 2 decimales: evita los 2.6000000000000003 de la aritmética float. */
const round2 = (value) => Math.round(value * 100) / 100;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Entero finito (acepta '5' de un CSV/backup), `fallback` si no hay número. */
function toInt(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

/** Factor de dificultad acotado a [MIN_EASE, MAX_EASE]. */
function toEase(value) {
  const parsed = Number(value);
  return round2(clamp(Number.isFinite(parsed) ? parsed : DEFAULT_EASE, MIN_EASE, MAX_EASE));
}

/** 'YYYY-MM-DD' válido o `null`. Reutiliza el validador de `utils/exams.js`. */
function normalizeDue(value) {
  const due = typeof value === 'string' ? value.trim() : '';
  return isValidExamDate(due) ? due : null;
}

/** Momento ISO legible o `null` (los basura del backup no se propagan). */
function normalizeTimestamp(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '' || Number.isNaN(Date.parse(trimmed))) return null;
  return trimmed;
}

/** Clave de fecha local de un instante: 'YYYY-MM-DD'. */
function dateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Normaliza cualquier entrada a un mazo válido. Recorta el título a su límite
 * y deja `exam_id` en `null` si no es un uuid plausible.
 *
 * Devuelve `null` (no lanza) si no hay título.
 *
 * @param {*} row
 * @returns {{title: string, exam_id: string|null}|null}
 */
export function sanitizeDeck(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;

  const title = String(row.title ?? '').trim().slice(0, MAX_DECK_TITLE);
  if (title === '') return null;

  const examId = typeof row.exam_id === 'string' ? row.exam_id.trim() : '';
  return { title, exam_id: examId === '' ? null : examId };
}

/**
 * Normaliza cualquier entrada a una carta válida: recorta los dos lados a
 * `MAX_CARD_SIDE`, acota `ease`, acota `interval` y descarta `due`/`last_review`
 * ilegibles.
 *
 * Devuelve `null` (no lanza) si falta `front` o `back`.
 *
 * @param {*} row
 * @returns {{front: string, back: string, ease: number, interval: number,
 *   due: string|null, reps: number, last_review: string|null}|null}
 */
export function sanitizeCard(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;

  const front = String(row.front ?? '').trim().slice(0, MAX_CARD_SIDE);
  const back = String(row.back ?? '').trim().slice(0, MAX_CARD_SIDE);
  if (front === '' || back === '') return null;

  return {
    front,
    back,
    ease: toEase(row.ease),
    interval: clamp(toInt(row.interval), 0, MAX_INTERVAL_DAYS),
    due: normalizeDue(row.due),
    reps: Math.max(0, toInt(row.reps)),
    last_review: normalizeTimestamp(row.last_review),
  };
}

/**
 * Hoy en **fecha local** como 'YYYY-MM-DD'. A propósito no se usa
 * `toISOString()`: en UTC salta de día con las zonas horarias negativas.
 *
 * @param {Date} [now]
 * @returns {string}
 */
export function todayKey(now = new Date()) {
  return dateKey(now);
}

/**
 * 'YYYY-MM-DD' de `days` naturales a partir del día local de `now`.
 *
 * @param {Date} now
 * @param {number} days
 * @returns {string}
 */
function shiftKey(now, days) {
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  base.setDate(base.getDate() + days);
  return dateKey(base);
}

/**
 * Aplica un grado de repaso y devuelve el estado nuevo de la carta (solo los
 * campos de repaso; `front`/`back` no se tocan).
 *
 *   reps     = prevReps + 1
 *   'again'  → ease = max(MIN_EASE, ease - 0.2), interval = 1
 *   'good'   → ease = min(MAX_EASE, ease + 0.1)
 *              interval = prevReps === 0 ? 1
 *                       : prevReps === 1 ? SECOND_INTERVAL_DAYS
 *                       : round(interval * ease)
 *   interval = clamp(interval, 1, MAX_INTERVAL_DAYS)
 *   due      = hoy + interval (fecha local)
 *
 * Cualquier grado distinto de `'good'` cuenta como `'again'` (fail-safe).
 *
 * @param {*} card
 * @param {'again'|'good'} grade
 * @param {Date} [now]
 * @returns {{ease: number, interval: number, due: string, reps: number,
 *   last_review: string}}
 */
export function scheduleCard(card, grade, now = new Date()) {
  const sanitized = sanitizeCard(card) ?? {
    front: '',
    back: '',
    ease: DEFAULT_EASE,
    interval: 0,
    due: null,
    reps: 0,
    last_review: null,
  };

  const prevReps = Math.max(0, toInt(sanitized.reps));
  let ease = sanitized.ease;
  let interval;

  if (grade === 'good') {
    ease = Math.min(MAX_EASE, ease + 0.1);
    interval =
      prevReps === 0
        ? 1
        : prevReps === 1
          ? SECOND_INTERVAL_DAYS
          : Math.round(sanitized.interval * ease);
  } else {
    ease = Math.max(MIN_EASE, ease - 0.2);
    interval = 1;
  }

  interval = clamp(interval, 1, MAX_INTERVAL_DAYS);
  return {
    ease: round2(ease),
    interval,
    due: shiftKey(now, interval),
    reps: prevReps + 1,
    last_review: now.toISOString(),
  };
}

/** Compara por `due` ascendente, con los `null` al final. */
const byDue = (a, b) => {
  if (a.due === b.due) return 0;
  if (a.due == null) return 1;
  if (b.due == null) return -1;
  return a.due < b.due ? -1 : 1;
};

/**
 * Cola de repaso de una tanda:
 *   1. vencidas (`due` ≤ hoy), por `due` ascendente (las más atrasadas primero);
 *   2. nuevas (`reps === 0`);
 *   3. el resto, por `due`.
 *
 * Las de `due` futuro solo entran cuando no hay vencidas ni nuevas, de modo
 * que siempre se puede repasar algo aunque el mazo esté al día. No muta el
 * array de entrada.
 *
 * @param {*} cards
 * @param {{limit?: number, now?: Date}} [options]
 * @returns {Array} como mucho `limit` cartas
 */
export function pickReviewCards(cards, { limit = DEFAULT_REVIEW_LIMIT, now = new Date() } = {}) {
  const list = Array.isArray(cards) ? cards.filter((card) => card && typeof card === 'object') : [];
  const today = todayKey(now);
  const overdue = [];
  const fresh = [];
  const rest = [];

  for (const card of list) {
    const entry = { card, due: normalizeDue(card.due) };
    if (entry.due && entry.due <= today) overdue.push(entry);
    else if (toInt(card.reps) === 0) fresh.push(entry);
    else rest.push(entry);
  }

  const max = Number.isFinite(Number(limit)) && Number(limit) >= 0 ? Math.floor(Number(limit)) : 0;
  return [...overdue.sort(byDue), ...fresh.sort(byDue), ...rest.sort(byDue)]
    .slice(0, max)
    .map((entry) => entry.card);
}

/**
 * ¿Toca repasar esta carta hoy? Una carta nunca repasada (`due === null`)
 * siempre toca: es lo que hace que un mazo recién creado se pueda estudiar. Un
 * `due` ilegible (basura de un backup) se trata igual, así que una carta
 * corrupta sale en el repaso en lugar de esconderse.
 *
 * @param {*} card
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isCardDue(card, now = new Date()) {
  if (!card || typeof card !== 'object') return false;
  const due = normalizeDue(card.due);
  if (!due) return true;
  return due <= todayKey(now);
}