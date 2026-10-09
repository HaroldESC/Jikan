import { decimalToTime } from '../../utils/dates';

export const toSeiActivity = (maruActivity) => ({
  id: maruActivity.id,
  label: maruActivity.title,
  start: decimalToTime(maruActivity.start),
  end: decimalToTime(maruActivity.end),
  color: maruActivity.color,
  description: maruActivity.description || '',
  notes: maruActivity.notes || '',
  type: maruActivity.type || 'general',
});

export const DAYS_ABBR = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
export const DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DAY_MAP = { Domingo: 0, Lunes: 1, Martes: 2, Miércoles: 3, Jueves: 4, Viernes: 5, Sábado: 6 };
