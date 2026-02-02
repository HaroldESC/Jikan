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