/**
 * Exportación de la semana completa a PDF y XLSX (solo salida, sin importación).
 *
 * Funciones puras respecto a React/Supabase: reciben el mapa `schedules` que
 * devuelve `useActivities()` y las etiquetas ya traducidas (`labels`), de modo
 * que este módulo no depende del i18n.
 *
 * `jspdf` / `xlsx` se cargan con `import()` diferido (solo al exportar), para
 * no penalizar el bundle inicial de la app.
 *
 * Contenido: los mismos 7 días y las mismas columnas que el CSV
 * (day/title/start/end/color/description/notes), ordenados Lunes → Domingo.
 */

import { decimalToTime } from './dates';
import { DAY_ORDER, DEFAULT_COLOR } from './csv';

const BRAND = [124, 92, 255]; // #7c5cff
const INK = [30, 41, 59];
const MUTED = [100, 116, 139];

const pad2 = (n) => String(n).padStart(2, '0');

/** 'HH:MM' → minutos desde medianoche (o null si es inválido). */
const parseTime = (value) => {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

/** Duración legible: 90 → '1h 30m'. */
export const formatDuration = (minutes) => {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
};

/** Fecha local → 'YYYY-MM-DD' (sufijo de los nombres de archivo). */
export const exportDateKey = (date = new Date()) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** Nombre de archivo base, igual que el export CSV. */
export const exportFileName = (extension, date = new Date()) =>
  `jikan-schedule-${exportDateKey(date)}.${extension}`;

/**
 * Aplana el mapa de actividades en filas ordenadas por día y hora de inicio.
 *
 * @param {object} activities mapa `{ [día]: actividad[] }` (schedules).
 * @param {string[]} [dayOrder] orden de los días de la semana.
 * @returns {Array<{day, title, start, end, durationMinutes, color,
 *   description, notes}>}
 */
export function buildWeekRows(activities, dayOrder = DAY_ORDER) {
  const entries = [];

  if (activities && typeof activities === 'object') {
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
  const startMinutesOf = ({ activity }) => {
    const parsed = parseTime(activity.startTime ?? activity.start_time);
    if (parsed != null) return parsed;
    return Math.round((Number(activity.start) || 0) * 60);
  };
  const endMinutesOf = ({ activity }) => {
    const parsed = parseTime(activity.endTime ?? activity.end_time);
    if (parsed != null) return parsed;
    return Math.round((Number(activity.end) || 0) * 60);
  };

  entries.sort(
    (a, b) => dayRank(a.day) - dayRank(b.day) || startMinutesOf(a) - startMinutesOf(b)
  );

  return entries.map(({ day, activity }) => {
    const startMinutes = startMinutesOf({ activity });
    const endMinutes = endMinutesOf({ activity });
    return {
      day,
      title: activity.title ?? '',
      start: activity.startTime ?? activity.start_time ?? decimalToTime(startMinutes / 60),
      end: activity.endTime ?? activity.end_time ?? decimalToTime(endMinutes / 60),
      durationMinutes: Math.max(0, endMinutes - startMinutes),
      color: activity.color || DEFAULT_COLOR,
      description: activity.description ?? '',
      notes: activity.notes ?? '',
    };
  });
}

/** Totales de la semana + desglose por día (incluye días sin actividades). */
export function buildWeekSummary(rows, dayOrder = DAY_ORDER) {
  const byDay = dayOrder.map((day) => {
    const dayRows = rows.filter((row) => row.day === day);
    return {
      day,
      count: dayRows.length,
      minutes: dayRows.reduce((total, row) => total + row.durationMinutes, 0),
    };
  });

  return {
    totalActivities: rows.length,
    totalMinutes: rows.reduce((total, row) => total + row.durationMinutes, 0),
    byDay,
  };
}

/** Relleno legible según el color de la actividad (contraste texto/fondo). */
const readableTextOn = (hex) => {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  const value = match ? match[1] : DEFAULT_COLOR.slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  // Luminancia relativa aproximada (WCAG).
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? INK : [255, 255, 255];
};

const hexToRgb = (hex) => {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  const value = match ? match[1] : DEFAULT_COLOR.slice(1);
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
};

/**
 * Genera y descarga un PDF A4 apaisado con la semana completa: portada de
 * resumen (fechas, totales, tabla por día) y una tabla por cada día con
 * actividades, coloreada con el color de cada actividad.
 *
 * @param {object} options
 * @param {Array} options.rows filas de `buildWeekRows`.
 * @param {string[]} [options.dayOrder]
 * @param {object} options.labels etiquetas traducidas (`export.*`).
 * @param {string} [options.fileName]
 * @returns {Promise<void>}
 */
export async function exportWeekToPdf({ rows, dayOrder = DAY_ORDER, labels, fileName }) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const summary = buildWeekSummary(rows, dayOrder);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // ── Portada / resumen ──
  doc.setFont('helvetica', 'bold').setFontSize(22).setTextColor(...BRAND);
  doc.text('Jikan', margin, margin + 4);

  doc.setFontSize(14).setTextColor(...INK);
  doc.text(labels.docTitle, margin, margin + 12);

  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...MUTED);
  doc.text(labels.generatedOn.replace('{date}', exportDateKey()), margin, margin + 19);

  // Recuadro de totales
  const boxTop = margin + 25;
  const boxHeight = 18;
  doc.setFillColor(245, 243, 255);
  doc.roundedRect(margin, boxTop, pageWidth - margin * 2, boxHeight, 3, 3, 'F');

  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...BRAND);
  doc.text(labels.summaryTitle, margin + 6, boxTop + 7);
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...INK);
  doc.text(
    `${labels.totalActivities}: ${summary.totalActivities}    ·    ${labels.totalHours}: ${formatDuration(summary.totalMinutes)}`,
    margin + 6,
    boxTop + 14
  );

  // ── Una tabla por día ──
  // Anchos proporionales escalados al ancho útil: autotable no reajusta las
  // columnas con `cellWidth` propio, así que deben sumar exactamente el ancho
  // disponible (si no, avisa por consola y deja margen sin usar).
  const columns = [
    { width: 20, align: 'center' },
    { width: 20, align: 'center' },
    { width: 58 },
    { width: 22, align: 'center' },
    { width: 26, align: 'center', fontSize: 7 },
    { width: 62 },
    { width: 61 },
  ];
  const scale = (pageWidth - margin * 2) / columns.reduce((total, column) => total + column.width, 0);
  const columnStyles = {};
  columns.forEach((column, index) => {
    columnStyles[index] = { cellWidth: column.width * scale, halign: column.align || 'left' };
    if (column.fontSize) columnStyles[index].fontSize = column.fontSize;
  });

  const head = [
    [labels.colStart, labels.colEnd, labels.colTitle, labels.colDuration, labels.colColor, labels.colDescription, labels.colNotes],
  ];

  let firstTable = true;
  dayOrder.forEach((day) => {
    const dayRows = rows.filter((row) => row.day === day);
    if (dayRows.length === 0) return;

    const title = `${day} · ${dayRows.length} · ${formatDuration(
      dayRows.reduce((total, row) => total + row.durationMinutes, 0)
    )}`;

    // Encabezado del día: nueva página si no queda sitio.
    const needed = 34; // título + cabecera + primera fila + holgura
    const position = doc.lastAutoTable ? doc.lastAutoTable.finalY : boxTop + boxHeight;
    if (!firstTable && position + needed > pageHeight - margin) doc.addPage();

    doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...INK);
    doc.text(title, margin, firstTable ? boxTop + boxHeight + 10 : position + 8);

    autoTable(doc, {
      startY: firstTable ? boxTop + boxHeight + 14 : position + 12,
      head,
      body: dayRows.map((row) => [
        row.start,
        row.end,
        row.title,
        formatDuration(row.durationMinutes),
        String(row.color).toUpperCase(),
        row.description,
        row.notes,
      ]),
      margin: { left: margin, right: margin, bottom: margin },
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2,
        textColor: INK,
        overflow: 'linebreak',
        valign: 'top',
      },
      headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
      columnStyles,
      didParseCell: (data) => {
        if (data.section !== 'body' || data.column.index !== 4) return;
        const hex = dayRows[data.row.index]?.color;
        data.cell.styles.fillColor = hexToRgb(hex);
        data.cell.styles.textColor = readableTextOn(hex);
      },
    });

    firstTable = false;
  });

  // ── Pie con numeración de páginas ──
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED);
    doc.text(
      labels.pageNumber.replace('{page}', String(page)).replace('{total}', String(total)),
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  doc.save(fileName || exportFileName('pdf'));
}

/**
 * Genera y descarga un XLSX con dos hojas: la semana completa (mismas columnas
 * que el CSV, autofiltro y anchos) y un resumen por día.
 *
 * @param {object} options mismas opciones que `exportWeekToPdf`.
 * @returns {Promise<void>}
 */
export async function exportWeekToXlsx({ rows, dayOrder = DAY_ORDER, labels, fileName }) {
  const XLSX = await import('xlsx');
  const summary = buildWeekSummary(rows, dayOrder);

  const head = [
    labels.colDay,
    labels.colTitle,
    labels.colStart,
    labels.colEnd,
    labels.colDuration,
    labels.colColor,
    labels.colDescription,
    labels.colNotes,
  ];

  const weekAoa = [
    head,
    ...rows.map((row) => [
      row.day,
      row.title,
      row.start,
      row.end,
      formatDuration(row.durationMinutes),
      row.color,
      row.description,
      row.notes,
    ]),
  ];

  const weekSheet = XLSX.utils.aoa_to_sheet(weekAoa);
  weekSheet['!cols'] = [
    { wch: 12 },
    { wch: 32 },
    { wch: 9 },
    { wch: 9 },
    { wch: 11 },
    { wch: 11 },
    { wch: 40 },
    { wch: 40 },
  ];
  if (rows.length > 0) {
    weekSheet['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: rows.length, c: head.length - 1 },
      }),
    };
  }

  const summaryAoa = [
    [labels.colDay, labels.totalActivities, labels.totalHours],
    ...summary.byDay.map((entry) => [entry.day, entry.count, formatDuration(entry.minutes)]),
    [],
    [`${labels.totalActivities}:`, summary.totalActivities],
    [`${labels.totalHours}:`, formatDuration(summary.totalMinutes)],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryAoa);
  summarySheet['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 18 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, weekSheet, labels.sheetWeek);
  XLSX.utils.book_append_sheet(workbook, summarySheet, labels.sheetSummary);

  XLSX.writeFile(workbook, fileName || exportFileName('xlsx'));
}
