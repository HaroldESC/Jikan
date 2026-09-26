import { useCallback, useEffect, useState } from 'react';

/**
 * Persisted reminders (localStorage, keyed per user).
 *
 * Shape: { id: string, text: string, time: 'HH:MM' }
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

export function useReminders(userId) {
  const [reminders, setReminders] = useState(() => readStored(userId));

  // Re-read when the signed-in user changes.
  useEffect(() => {
    setReminders(readStored(userId));
  }, [userId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey(userId), JSON.stringify(reminders));
    } catch (error) {
      console.error('Error saving reminders:', error);
    }
  }, [reminders, userId]);

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
