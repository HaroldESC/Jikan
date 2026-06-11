const decimalToTimeStr = (decimal) => {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const toSeiActivity = (maruActivity) => ({
  id: maruActivity.id,
  label: maruActivity.title,
  start: decimalToTimeStr(maruActivity.start),
  end: decimalToTimeStr(maruActivity.end),
  color: maruActivity.color,
  description: maruActivity.description || '',
  type: maruActivity.type || 'general',
});

export const DAYS_ABBR = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
export const DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DAY_MAP = { Domingo: 0, Lunes: 1, Martes: 2, Miércoles: 3, Jueves: 4, Viernes: 5, Sábado: 6 };
