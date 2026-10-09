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
 * Convierte horas decimales (9.5 = 09:30) a una hora en formato HH:MM
 */
export const decimalToTime = (decimal) => {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};
