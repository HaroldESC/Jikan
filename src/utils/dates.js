/**
 * Utilidades para manejo de fechas y días
 */

/**
 * Obtiene el nombre del día actual en español
 */
export const getCurrentDay = () => {
  const daysInSpanish = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const today = new Date().getDay();
  return daysInSpanish[today];
};

/**
 * Obtiene el índice del día (0 = Domingo, 1 = Lunes, etc.)
 */
export const getDayIndex = (dayName) => {
  const daysMap = {
    'Domingo': 0,
    'Lunes': 1,
    'Martes': 2,
    'Miércoles': 3,
    'Jueves': 4,
    'Viernes': 5,
    'Sábado': 6
  };
  return daysMap[dayName] || 1; // Por defecto Lunes
};

/**
 * Verifica si un día es hoy
 */
export const isToday = (dayName) => {
  return dayName === getCurrentDay();
};

/**
 * Formatea la hora actual en formato HH:MM
 */
export const getCurrentTimeFormatted = () => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Convierte una hora en formato HH:MM a horas decimales (9.5 = 09:30)
 */
export const timeToDecimal = (timeString) => {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours + minutes / 60;
};

/**
 * Convierte horas decimales (9.5 = 09:30) a una hora en formato 'HH:MM'
 * con dos dígitos por componente.
 *
 * Implementación canónica y única del proyecto: valores no finitos (NaN,
 * Infinity, null, cadenas no numéricas…) o negativos devuelven '00:00'.
 *
 * @param {number} decimal horas decimales (p. ej. 9.5 → '09:30').
 * @returns {string} 'HH:MM' ( cero relleno); '00:00' si la entrada no es
 *   un número finito no negativo.
 */
export const decimalToTime = (decimal) => {
  const value = Number(decimal);
  if (!Number.isFinite(value) || value < 0) return '00:00';
  const totalMinutes = Math.round(value * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Convierte horas decimales (9.5 = 09:30) en minutos totales (570).
 * Para cálculos de posiciones/duraciones sobre la rueda del día.
 *
 * @param {number} decimalHours horas decimales.
 * @returns {number} minutos totales redondeados.
 */
export const decimalToMinutes = (decimalHours) => Math.round(decimalHours * 60);
