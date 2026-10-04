import { useCallback, useEffect, useState } from 'react';

/**
 * Persisted reminders (localStorage, keyed per user).
 *
 * Shape: { id: string, text: string, time: 'HH:MM' }
 *
 * @param {string} userId
 * @param {object} [options]
 * @param {boolean} [options.persist=true]
 *   Modo privado (v4.0 C3): con `persist: false` los recordatorios solo viven en
 *   memoria — no se guardan ni se leen de localStorage, así que no se sincronizan.
 */
const storageKey = (userId) => `jikan.reminders.${userId || 'anon'}`;

const readStored = (userId) => {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error reading reminders:', error);
    return [];
  }
};

export function useReminders(userId, { persist = true } = {}) {
  const [reminders, setReminders] = useState(() => (persist ? readStored(userId) : []));

  // Re-read when the signed-in user changes.
  useEffect(() => {
    setReminders(persist ? readStored(userId) : []);
  }, [userId, persist]);

  useEffect(() => {
    if (!persist) return;
    try {
      window.localStorage.setItem(storageKey(userId), JSON.stringify(reminders));
    } catch (error) {
      console.error('Error saving reminders:', error);
    }
  }, [reminders, userId, persist]);

  const addReminder = useCallback(({ text, time }) => {
    const trimmed = (text || '').trim();
    if (!trimmed || !time) return false;

    setReminders((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text: trimmed, time },
    ]);
    return true;
  }, []);

  const deleteReminder = useCallback((id) => {
    setReminders((prev) => prev.filter((reminder) => reminder.id !== id));
  }, []);

  return { reminders, addReminder, deleteReminder };
}

export default useReminders;
