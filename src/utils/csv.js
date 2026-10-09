/**
 * Utilidades CSV (puras: sin React ni Supabase).
 *
 * Formato de fila: day,title,start,end,color,description,notes
 * - `day`: nombre canónico en español ('Lunes'…'Domingo').
 * - `start`/`end`: 'HH:MM' (se acepta también 'H:MM').
 * - `color`: '#RRGGBB' (vacío o inválido → color por defecto).
 */

import { decimalToTime } from './dates';

export const CSV_HEADER = ['day', 'title', 'start', 'end', 'color', 'description', 'notes'];
export const DEFAULT_COLOR = '#7c5cff';
// Orden de exportación por defecto: semana empezando en lunes (igual que useActivities).
export const DAY_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Días canónicos + alias ingleses comunes (todo en minúsculas y sin acentos).
const DAY_ALIASES = {
  lunes: 'Lunes', monday: 'Lunes', mon: 'Lunes',
  martes: 'Martes', tuesday: 'Martes', tue: 'Martes',
  miercoles: 'Miércoles', wednesday: 'Miércoles', wed: 'Miércoles',
  jueves: 'Jueves', thursday: 'Jueves', thu: 'Jueves', thur: 'Jueves',
  viernes: 'Viernes', friday: 'Viernes', fri: 'Viernes',
  sabado: 'Sábado', saturday: 'Sábado', sat: 'Sábado',
  domingo: 'Domingo', sunday: 'Domingo', sun: 'Domingo',
};

// Cabeceras aceptadas por columna (normalizadas: minúsculas y sin acentos).
const HEADER_COLUMNS = {
  day: ['day', 'dia', 'day_of_week'],
  title: ['title', 'titulo', 'nombre', 'actividad', 'activity', 'name'],
  start: ['start', 'inicio', 'start_time', 'desde', 'hora_inicio'],
  end: ['end', 'fin', 'end_time', 'hasta', 'hora_fin'],
  color: ['color'],
  description: ['description', 'descripcion', 'desc'],
  notes: ['notes', 'nota', 'notas'],
};
const REQUIRED_COLUMNS = ['day', 'title', 'start', 'end'];

const stripAccents = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const pad2 = (n) => String(n).padStart(2, '0');

/** Normaliza un día escrito por el usuario a su forma canónica (o null). */
export const normalizeDay = (value) => {
  if (value == null) return null;
  const key = stripAccents(String(value).trim().toLowerCase());
  return DAY_ALIASES[key] || null;
};

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

/** Escapa un campo CSV: comillas dobles internas, envuelve , " y saltos de línea. */
const escapeField = (value) => {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * Exporta actividades a CSV con BOM UTF-8 y cabecera.
 *
 * @param {object|Array} activities mapa `{ [día]: actividad[] }` (schedules)
 *   o lista plana con `day_of_week`/`day`.
 * @param {string[]} [dayOrder] orden de días de la semana.
 * @returns {string} contenido CSV listo para descargar.
 */
export function exportActivitiesToCsv(activities, dayOrder = DAY_ORDER) {
  const entries = [];

  if (Array.isArray(activities)) {
    activities.forEach((activity) => {
      entries.push({ day: activity.day_of_week ?? activity.day ?? '', activity });
    });
  } else if (activities && typeof activities === 'object') {
    Object.entries(activities).forEach(([day, list]) => {
      (Array.isArray(list) ? list : []).forEach((activity) => {
        entries.push({ day, activity });
      });
    });
  }

  const dayRank = (day) => {
    const index = dayOrder.indexOf(day);
    return index === -1 ? dayOrder.length : index;
  };
  const startMinutes = ({ activity }) => {
    const raw = activity.startTime ?? activity.start_time;
    const parsed = parseTime(raw);
    if (parsed != null) return parsed;
    return typeof activity.start === 'number' ? Math.round(activity.start * 60) : 0;
  };

  entries.sort((a, b) => dayRank(a.day) - dayRank(b.day) || startMinutes(a) - startMinutes(b));

  const lines = [CSV_HEADER.join(',')];
  entries.forEach(({ day, activity }) => {
    const start = activity.startTime ?? activity.start_time ?? decimalToTime(activity.start ?? 0);
    const end = activity.endTime ?? activity.end_time ?? decimalToTime(activity.end ?? 0);
    lines.push([
      escapeField(day),
      escapeField(activity.title ?? ''),
      escapeField(start),
      escapeField(end),
      escapeField(activity.color || DEFAULT_COLOR),
      escapeField(activity.description ?? ''),
      escapeField(activity.notes ?? ''),
    ].join(','));
  });

  // BOM UTF-8 para que Excel abra bien los acentos; CRLF por compatibilidad.
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

/**
 * Tokeniza CSV respetando comillas, comillas dobles escapadas, CRLF y
 * campos multilínea. Devuelve registros `{ line, cells }` donde `line` es
 * la línea física del archivo donde empieza el registro.
 */
const parseRecords = (text) => {
  const records = [];
  let cells = [];
  let field = '';
  let inQuotes = false;
  let line = 1;
  let recordLine = 1;

  const endRecord = () => {
    cells.push(field);
    field = '';
    records.push({ line: recordLine, cells });
    cells = [];
    recordLine = line;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === '\n') line++;
        else if (ch === '\r' && text[i + 1] !== '\n') line++;
        field += ch;
      }
      continue;
    }

    if (ch === '"' && field === '') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(field);
      field = '';
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') i++;
      line++;
      endRecord();
    } else if (ch === '\n') {
      line++;
      endRecord();
    } else {
      field += ch;
    }
  }

  if (field !== '' || cells.length > 0) endRecord();
  return records;
};

const isBlankRecord = (record) => record.cells.every((cellValue) => cellValue.trim() === '');

/**
 * Parsea y valida un CSV de actividades.
 *
 * Nunca lanza: los errores se acumulan por fila con su número de línea.
 *
 * @param {string} text contenido del archivo.
 * @returns {{ rows: Array, errors: Array<{row: number, key: string, message: string}> }}
 *   `rows` listos para insertar en Supabase (`day_of_week`, `start_time`,
 *   `end_time`, `title`, `description`, `color`, `notes`).
 */
export function parseActivitiesCsv(text) {
  const rows = [];
  const errors = [];

  const source = typeof text === 'string' ? text : '';
  const clean = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
  const records = parseRecords(clean).filter((record) => !isBlankRecord(record));

  if (records.length === 0) {
    errors.push({ row: 1, key: 'csv.parseError', message: 'Empty file' });
    return { rows, errors };
  }

  const header = records[0].cells.map((cellValue) => stripAccents(cellValue.trim().toLowerCase()));
  const column = {};
  Object.entries(HEADER_COLUMNS).forEach(([name, aliases]) => {
    column[name] = header.findIndex((cellValue) => aliases.includes(cellValue));
  });

  const missing = REQUIRED_COLUMNS.filter((name) => column[name] === -1);
  if (missing.length > 0) {
    errors.push({
      row: records[0].line,
      key: 'csv.errHeader',
      message: `Missing columns: ${missing.join(', ')}`,
    });
    return { rows, errors };
  }

  const cell = (record, index) =>
    index >= 0 && index < record.cells.length ? record.cells[index].trim() : '';

  for (let i = 1; i < records.length; i++) {
    const record = records[i];
    const day = normalizeDay(cell(record, column.day));
    const title = cell(record, column.title);
    const startMinutes = parseTime(cell(record, column.start));
    const endMinutes = parseTime(cell(record, column.end));

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
      errors.push({ row: record.line, key, message });
      continue;
    }

    const rawColor = cell(record, column.color);
    const color = /^#[0-9a-fA-F]{6}$/.test(rawColor) ? rawColor.toLowerCase() : DEFAULT_COLOR;

    rows.push({
      day_of_week: day,
      title,
      start_time: `${pad2(Math.floor(startMinutes / 60))}:${pad2(startMinutes % 60)}`,
      end_time: `${pad2(Math.floor(endMinutes / 60))}:${pad2(endMinutes % 60)}`,
      description: cell(record, column.description),
      color,
      notes: cell(record, column.notes),
    });
  }

  return { rows, errors };
}
