/**
 * Utilidades de backup (puras: sin React, sin Supabase, sin i18n).
 *
 * Un backup de Jikan es un JSON con esta forma:
 *
 * {
 *   app: 'jikan',
 *   version: 1,
 *   exportedAt: '2026-10-04T12:00:00.000Z',
 *   scope: 'guest' | 'account',
 *   data: {
 *     activities:    [ { day_of_week, start_time, end_time, title, description, notes, color, links } ],
 *     exams:         [ { subject, date, time, activity_id, notes, color } ],
 *     reminders:     [ { id, text, time } ],
 *     panels:        { 'maru.content': { order: [...], visible: {...} } },
 *     settings:      { themeMode, style, font, locale },
 *     pomodoro:      { 'YYYY-MM-DD': n },
 *     notifications: { enabled, preMinutes }
 *   }
 * }
 *
 * Es el formato de "exportación completa" (GDPR): incluye todo lo que la app
 * guarda en el navegador. La **importación** solo consume `data.activities` y
 * `data.exams` (v5.0 D2) y siempre hace append: nunca sobrescribe ni borra lo
 * que ya existe.
 *
 * `data.exams` es **opcional** al importar (los backups anteriores a D2 no lo
 * traen), pero `BACKUP_VERSION` sigue en 1: el campo es aditivo y se valida con
 * `validateExams`. Los exámenes no llevan `id`, `user_id` ni `created_at`: son
 * datos, no filas de la base de datos.
 */

import { normalizeDay, DEFAULT_COLOR } from './csv';
import { sanitizeLinks } from './links';
import { exportDateKey } from './export';
import { isValidExamDate, sanitizeExam } from './exams';

export const BACKUP_APP = 'jikan';
export const BACKUP_VERSION = 1;
/** Retención por defecto del auto-backup local (nº de snapshots por usuario). */
export const BACKUP_RETENTION = 10;

const pad2 = (n) => String(n).padStart(2, '0');

// ─────────────────────────────────────────────────────────────────────────────
// Recolección del estado local (lectura de localStorage)
// ─────────────────────────────────────────────────────────────────────────────

const readJson = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const readRaw = (key, fallback) => {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

/** Claves de paneles del usuario: `jikan.panels.<style>.<group>.<uid>`. */
const panelKeyPattern = (userId) =>
  new RegExp(`^jikan\\.panels\\.[^.]+\\.[^.]+\\.${userId || 'anon'}$`);

/** Recoge paneles, recordatorios, pomodoro, notificaciones y ajustes. */
export function collectLocalState(userId) {
  const uid = userId || 'anon';

  const panels = {};
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && panelKeyPattern(uid).test(key)) {
        panels[key] = readJson(key, null);
      }
    }
  } catch {
    // localStorage no disponible: el backup sale solo con actividades.
  }

  return {
    reminders: readJson(`jikan.reminders.${uid}`, []),
    panels,
    settings: {
      themeMode: readRaw('jikan-theme', 'auto'),
      style: readRaw('jikan-style', 'maru'),
      font: readRaw('jikan-font', 'system'),
      locale: readRaw('jikan-lang', 'es'),
    },
    pomodoro: readJson(`jikan.pomodoro.${uid}`, {}),
    notifications: readJson(`jikan.notify.${uid}`, {}),
  };
}

/**
 * Construye el backup completo.
 *
 * @param {object} params
 * @param {Array}  params.activities filas crudas del store (`useActivities().rows`)
 * @param {Array}  [params.exams]   filas crudas (`useExams().rows`); las
 *   inservibles (sin asignatura o con fecha inválida) se descartan
 * @param {string} [params.userId]   id de usuario (o 'anon')
 * @param {boolean} [params.isGuest] marca el origen del backup
 * @returns {object} payload listo para serializar
 */
export function buildBackup({ activities = [], exams = [], userId, isGuest = false } = {}) {
  const rows = Array.isArray(activities) ? activities : [];
  const examRows = Array.isArray(exams) ? exams : [];
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    scope: isGuest ? 'guest' : 'account',
    data: {
      activities: rows.map((row) => ({
        day_of_week: row.day_of_week,
        start_time: row.start_time,
        end_time: row.end_time,
        title: row.title,
        description: row.description ?? '',
        notes: row.notes ?? '',
        color: row.color ?? DEFAULT_COLOR,
        links: sanitizeLinks(row.links),
      })),
      // `sanitizeExam` es la whitelist: devuelve exactamente los seis campos de
      // la fila canónica, así que aquí no puede colarse `id` ni `user_id`.
      exams: examRows.map((row) => sanitizeExam(row)).filter((exam) => exam),
      ...collectLocalState(userId),
    },
  };
}

/** Serializa el payload a JSON legible (2 espacios). */
export const serializeBackup = (payload) => JSON.stringify(payload, null, 2);

/**
 * Nombre del archivo de backup, mismo criterio que `jikan-schedule-…`.
 * @param {Date} [date]
 */
export const backupFileName = (date = new Date()) => `jikan-backup-${exportDateKey(date)}.json`;

// ─────────────────────────────────────────────────────────────────────────────
// Envolvente de la copia en la nube (C5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Versión de la envolvente de la copia subida a la nube.
 * Se llama `env` y NO `version` para no colisionar con `BACKUP_VERSION`:
 * la envolvente envuelve un backup ya cifrado, no es un backup en sí.
 */
export const CLOUD_ENVELOPE_ENV = 1;

/**
 * Envuelve un payload (cifrado o no) para subirlo a la nube.
 *
 * @param {object} params
 * @param {*}      params.payload contenido del campo `payload` (si la copia va
 *                   cifrada, el sobre devuelto por `encryptValue`)
 * @param {{ salt: string, iterations: number }} params.kdf material de
 *                   derivación, para rederivar la clave al restaurar
 * @returns {{ app: string, encrypted: boolean, env: number,
 *             kdf: { salt: string, iterations: number }, payload: * }}
 * @throws {Error} si falta `kdf.salt` (sin sal no se puede rederivar la clave)
 */
export function buildCloudEnvelope({ payload, kdf } = {}) {
  if (!kdf?.salt) {
    throw new Error('buildCloudEnvelope: kdf.salt is required');
  }
  return {
    app: BACKUP_APP,
    encrypted: true,
    env: CLOUD_ENVELOPE_ENV,
    kdf: { salt: kdf.salt, iterations: kdf.iterations },
    payload,
  };
}

/**
 * Detecta una envolvente de copia en la nube (descargada de Drive).
 * @param {*} value
 * @returns {boolean}
 */
export function isCloudEnvelope(value) {
  return Boolean(value && typeof value === 'object' && value.encrypted === true && value.app === BACKUP_APP);
}

// ─────────────────────────────────────────────────────────────────────────────
// Validación / parseo
// ─────────────────────────────────────────────────────────────────────────────

/** 'HH:MM' o 'H:MM' → minutos desde medianoche (o null si es inválido). */
const parseTime = (value) => {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const toTimeString = (minutes) =>
  `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;

/**
 * Valida una lista de actividades crudas (las del backup o de un snapshot).
 *
 * @param {Array} list
 * @param {number} [offset] número de fila del primer elemento (1-indexado)
 * @returns {{ rows: Array, errors: Array<{row:number,key:string,message:string}> }}
 */
export function validateActivities(list, offset = 1) {
  const errors = [];
  const rows = [];

  (Array.isArray(list) ? list : []).forEach((activity, index) => {
    const row = offset + index;
    if (!activity || typeof activity !== 'object') {
      errors.push({ row, key: 'backup.errRow', message: 'Not an object' });
      return;
    }

    const day = normalizeDay(activity.day_of_week ?? activity.day);
    const title = typeof activity.title === 'string' ? activity.title.trim() : '';
    const startMinutes = parseTime(activity.start_time);
    const endMinutes = parseTime(activity.end_time);

    let key = null;
    let message = null;
    if (!day) {
      key = 'csv.errDay';
      message = 'Invalid day';
    } else if (!title) {
      key = 'csv.errTitle';
      message = 'Empty title';
    } else if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
      key = 'csv.errTime';
      message = 'Invalid time range (end must be after start)';
    }

    if (key) {
      errors.push({ row, key, message });
      return;
    }

    const rawColor = typeof activity.color === 'string' ? activity.color.trim() : '';
    rows.push({
      day_of_week: day,
      start_time: toTimeString(startMinutes),
      end_time: toTimeString(endMinutes),
      title,
      description: typeof activity.description === 'string' ? activity.description : '',
      notes: typeof activity.notes === 'string' ? activity.notes : '',
      color: /^#[0-9a-fA-F]{6}$/.test(rawColor) ? rawColor.toLowerCase() : DEFAULT_COLOR,
      links: sanitizeLinks(activity.links),
    });
  });

  return { rows, errors };
}

/**
 * Valida una lista de exámenes crudos (los del backup o de un snapshot).
 *
 * Mismo criterio que `validateActivities`: un error por fila, con su número
 * 1-indexado, y normalización de lo que sí se puede guardar. Las dos únicas
 * causas de rechazo son la asignatura vacía (`backup.errSubject`) y la fecha
 * ausente o imposible (`backup.errDate`); el resto de campos pasan por
 * `sanitizeExam`, que es la fuente de verdad de la fila canónica.
 *
 * @param {Array} list
 * @param {number} [offset] número de fila del primer elemento (1-indexado)
 * @returns {{ rows: Array, errors: Array<{row:number,key:string,message:string}> }}
 */
export function validateExams(list, offset = 1) {
  const errors = [];
  const rows = [];

  (Array.isArray(list) ? list : []).forEach((entry, index) => {
    const row = offset + index;
    if (!entry || typeof entry !== 'object') {
      errors.push({ row, key: 'backup.errRow', message: 'Not an object' });
      return;
    }

    const subject = typeof entry.subject === 'string' ? entry.subject.trim() : '';
    if (subject === '') {
      errors.push({ row, key: 'backup.errSubject', message: 'Empty subject' });
      return;
    }

    const date = typeof entry.date === 'string' ? entry.date.trim() : '';
    if (!isValidExamDate(date)) {
      errors.push({ row, key: 'backup.errDate', message: 'Invalid date' });
      return;
    }

    const exam = sanitizeExam(entry);
    if (!exam) {
      // Salvaguarda: `sanitizeExam` solo devuelve `null` por esos dos motivos.
      errors.push({ row, key: 'backup.errDate', message: 'Invalid exam' });
      return;
    }

    rows.push(exam);
  });

  return { rows, errors };
}

/**
 * Parsea y valida un backup.
 *
 * Nunca lanza: los errores se acumulan por fila con su número (1-indexado, como
 * en `parseActivitiesCsv`) y los errores de formato se reportan en la fila 1.
 *
 * `data.exams` es opcional (los backups de antes de v5.0 D2 no lo tienen): si no
 * viene, `examRows` sale vacío y **no** se genera ningún error.
 *
 * @param {string} text contenido del archivo.
 * @returns {{ payload: object|null, rows: Array, examRows: Array,
 *   errors: Array<{row:number,key:string}> }}
 *   `rows` son actividades listas para `useActivities().appendRows()` y
 *   `examRows` exámenes para `useExams().appendExamRows()`.
 */
export function parseBackup(text) {
  const errors = [];
  let payload = null;

  const source = typeof text === 'string' ? text : '';
  const clean = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;

  try {
    payload = JSON.parse(clean);
  } catch {
    errors.push({ row: 1, key: 'backup.errFormat', message: 'Invalid JSON' });
    return { payload: null, rows: [], examRows: [], errors };
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    errors.push({ row: 1, key: 'backup.errFormat', message: 'Not a backup object' });
    return { payload: null, rows: [], examRows: [], errors };
  }
  if (payload.app !== BACKUP_APP) {
    errors.push({ row: 1, key: 'backup.errFormat', message: 'Not a Jikan backup' });
    return { payload: null, rows: [], examRows: [], errors };
  }
  if (typeof payload.version !== 'number' || payload.version > BACKUP_VERSION) {
    errors.push({ row: 1, key: 'backup.errVersion', message: 'Unsupported version' });
    return { payload: null, rows: [], examRows: [], errors };
  }

  const activities = payload.data?.activities;
  if (!Array.isArray(activities)) {
    errors.push({ row: 1, key: 'backup.errFormat', message: 'Missing data.activities' });
    return { payload, rows: [], examRows: [], errors };
  }

  const { rows, errors: rowErrors } = validateActivities(activities, 1);
  const { rows: examRows, errors: examErrors } = validateExams(payload.data?.exams ?? [], 1);
  return { payload, rows, examRows, errors: [...errors, ...rowErrors, ...examErrors] };
}

/**
 * Descarga un texto como archivo (helper compartido por export JSON).
 * Mismo patrón que el export CSV de `MainShell`.
 */
export function downloadTextFile(text, fileName, mimeType = 'application/json;charset=utf-8') {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}