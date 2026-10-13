/**
 * Utilidades del calendario de exámenes (puras: sin React, sin Supabase,
 * sin i18n).
 *
 * Esta es la **única** fuente de validación/normalización de exámenes: la
 * reusan `examStore`, `useExams`, el panel y el backup.
 *
 * Forma canónica de fila:
 *   { subject, date, time, activity_id, notes, color }
 *   - `subject`     → asignatura (obligatoria)
 *   - `date`        → 'YYYY-MM-DD' (obligatoria, y tiene que existir)
 *   - `time`        → 'HH:MM' o `null` (opcional; sin hora = 00:00 local)
 *   - `activity_id` → uuid de `activities(id)` o `null` (opcional)
 *   - `notes`       → texto libre (opcional)
 *   - `color`       → '#rrggbb'
 */

export const MAX_SUBJECT = 120;
export const MAX_NOTES = 2000;
export const DEFAULT_EXAM_COLOR = '#7c5cff';

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const pad2 = (value) => String(value).padStart(2, '0');

/**
 * ¿Es una fecha de examen válida? Exige el formato 'YYYY-MM-DD' **y** que el
 * día exista de verdad en el calendario (rechaza '2026-02-31').
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isValidExamDate(value) {
  if (typeof value !== 'string') return false;
  const match = value.trim().match(DATE_PATTERN);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  // `new Date(26, 1, 31)` se desbordaría a 1926: se fija el año a mano.
  if (year >= 0 && year <= 99) date.setFullYear(year);
  return (
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  );
}

/**
 * 'HH:MM' (o 'H:MM') → hora canónica 'HH:MM', o `null` si no es válida.
 * Mismo criterio que `parseTime` de `backup.js`, pero sin la regla de rango
 * (`end > start`): aquí la hora es un valor suelto.
 *
 * Acepta también 'HH:MM:SS', que es como PostgREST devuelve una columna
 * `time` de Postgres; los segundos se truncan al minuto.
 *
 * @param {*} value
 * @returns {string|null}
 */
function normalizeExamTime(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(TIME_PATTERN);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${pad2(hours)}:${pad2(minutes)}`;
}

/**
 * Normaliza cualquier entrada a una fila de examen válida. Recorta `subject` y
 * `notes` a sus límites, deja `time`/`activity_id` en `null` si no valen y
 * cae en `DEFAULT_EXAM_COLOR` ante un color no hexadecimal.
 *
 * Devuelve `null` (no lanza) si la fila no se puede arreglar: asignatura vacía
 * o fecha ausente/inválida.
 *
 * @param {*} row
 * @returns {{subject: string, date: string, time: string|null,
 *   activity_id: string|null, notes: string, color: string}|null}
 */
export function sanitizeExam(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;

  const subject = String(row.subject ?? '').trim().slice(0, MAX_SUBJECT);
  if (subject === '') return null;

  const date = typeof row.date === 'string' ? row.date.trim() : '';
  if (!isValidExamDate(date)) return null;

  const activityId = typeof row.activity_id === 'string' ? row.activity_id.trim() : '';
  const color = typeof row.color === 'string' ? row.color.trim() : '';

  return {
    subject,
    date,
    time: normalizeExamTime(row.time),
    activity_id: activityId === '' ? null : activityId,
    notes: String(row.notes ?? '').slice(0, MAX_NOTES),
    color: COLOR_PATTERN.test(color) ? color.toLowerCase() : DEFAULT_EXAM_COLOR,
  };
}

/**
 * Instante **local** del examen. Sin hora válida se sitúa a las 00:00 de ese
 * día. `null` si la fecha no es válida.
 *
 * @param {*} date 'YYYY-MM-DD'
 * @param {*} [time] 'HH:MM' o `null`
 * @returns {Date|null}
 */
export function examTimestamp(date, time = null) {
  if (!isValidExamDate(date)) return null;
  const [year, month, day] = date.trim().split('-').map(Number);
  const normalized = normalizeExamTime(time);
  const hours = normalized ? Number(normalized.slice(0, 2)) : 0;
  const minutes = normalized ? Number(normalized.slice(3, 5)) : 0;
  // Constructor local a propósito: `toISOString()` / `Date.parse` introducirían
  // desvíos de zona horaria en las claves de fecha.
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

/**
 * Días naturales hasta el examen: 0 = hoy, negativo = ya pasado.
 *
 * Compara fechas **locales** en ambos extremos (nunca UTC) para que un examen
 * de "hoy" no reste un día por el desplazamiento horario.
 *
 * @param {*} date 'YYYY-MM-DD'
 * @param {Date} [now]
 * @returns {number} `NaN` si la fecha no es válida
 */
export function daysUntilExam(date, now = new Date()) {
  const target = examTimestamp(date, null);
  if (!target) return Number.NaN;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Redondeo: un día natural no siempre son 24 h exactas (cambio de hora).
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Orden de lectura: por `date`, luego por `time` (los `null` al final) y por
 * `subject` como desempate. No muta el array de entrada.
 *
 * @param {*} rows
 * @returns {Array}
 */
export function sortExams(rows) {
  return [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    const timeA = normalizeExamTime(a.time);
    const timeB = normalizeExamTime(b.time);
    if (timeA !== timeB) {
      if (timeA == null) return 1;
      if (timeB == null) return -1;
      return timeA < timeB ? -1 : 1;
    }
    return String(a.subject ?? '').localeCompare(String(b.subject ?? ''));
  });
}