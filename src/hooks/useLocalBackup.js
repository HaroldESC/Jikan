import { useCallback, useEffect, useRef, useState } from 'react';
import { backupStore } from '../lib/backupStore';
import { BACKUP_RETENTION, buildBackup, validateActivities } from '../utils/backup';

/** Cada cuánto se revisa si hay que guardar un snapshot aunque no haya mutaciones. */
const PERIODIC_CHECK_MS = 30 * 60 * 1000;

/**
 * Firma estable de un payload: ignora `exportedAt` para que volver a generar el
 * backup con los mismos datos no produzca un snapshot nuevo.
 */
const signatureOf = (payload) => {
  if (!payload) return '';
  const { exportedAt, ...rest } = payload;
  return JSON.stringify(rest);
};

/**
 * Auto-backup local (v4.0 C2).
 *
 * Guarda un snapshot versionado en IndexedDB (`backups`) cada vez que cambia el
 * estado (actividades, recordatorios, paneles, ajustes, pomodoro) y al menos
 * cada `PERIODIC_CHECK_MS` minutos. Todo ocurre en el dispositivo, sin red.
 *
 * Retención: se conservan las `retention` copias más recientes por usuario.
 *
 * @param {object} params
 * @param {string}  params.userId      id de usuario (o 'anon' para invitados)
 * @param {Array}   params.activities  filas crudas del store (`useActivities().rows`)
 * @param {boolean} params.loading    mientras `true` no se hace nada
 * @param {boolean} params.isGuest
 * @returns {{ snapshots, busy, lastBackupAt, refresh, createSnapshot,
 *             readSnapshotActivities, deleteSnapshot, clearSnapshots }}
 */
export function useLocalBackup({ userId, activities = [], loading = false, isGuest = false, retention = BACKUP_RETENTION, enabled = true }) {
  const [snapshots, setSnapshots] = useState([]);
  const [busy, setBusy] = useState(false);
  // Firma del último snapshot creado o confirmado en esta sesión (evita bucles).
  const lastSignatureRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      setSnapshots(await backupStore.list(userId));
    } catch (error) {
      console.error('Error listing local backups:', error);
    }
  }, [enabled, userId]);

  /** Crea un snapshot y aplica la retención. Devuelve el snapshot o null. */
  const writeSnapshot = useCallback(async () => {
    const payload = buildBackup({ activities, userId, isGuest });
    lastSignatureRef.current = signatureOf(payload);

    const snapshot = await backupStore.create({ userId, payload });
    await backupStore.prune(userId, retention);
    setSnapshots(await backupStore.list(userId));
    return snapshot;
  }, [activities, isGuest, retention, userId]);

  /**
   * Compara el estado actual con el último snapshot guardado:
   * si no hay cambios no escribe nada.
   */
  const sync = useCallback(async () => {
    if (!enabled || loading) return;
    const payload = buildBackup({ activities, userId, isGuest });
    const signature = signatureOf(payload);
    if (signature === lastSignatureRef.current) return;

    setBusy(true);
    try {
      const latest = await backupStore.latest(userId);
      if (latest && signatureOf(latest.payload) === signature) {
        // Ya estaba respaldado (p. ej. tras recargar la página).
        lastSignatureRef.current = signature;
        return;
      }
      await backupStore.create({ userId, payload });
      await backupStore.prune(userId, retention);
      setSnapshots(await backupStore.list(userId));
      lastSignatureRef.current = signature;
    } catch (error) {
      console.error('Error writing local backup:', error);
    } finally {
      setBusy(false);
    }
  }, [activities, enabled, isGuest, loading, retention, userId]);

  // Reacciona a los cambios de estado (cada mutación reload() y produce rows nuevos).
  useEffect(() => {
    sync();
  }, [sync]);

  // Revisión periódica: captura cambios que no pasan por `activities`
  // (idioma, tema, estilo, recordatorios, pomodoro).
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(() => {
      sync();
    }, PERIODIC_CHECK_MS);
    return () => clearInterval(timer);
  }, [enabled, sync]);

  // Al cambiar de usuario,olvida la firma cacheada para releer su historial.
  useEffect(() => {
    lastSignatureRef.current = null;
    refresh();
  }, [refresh, userId]);

  /** Snapshot manual (botón "Guardar copia ahora"). */
  const createSnapshot = useCallback(async () => {
    setBusy(true);
    try {
      return await writeSnapshot();
    } catch (error) {
      console.error('Error creating local backup:', error);
      return null;
    } finally {
      setBusy(false);
    }
  }, [writeSnapshot]);

  /**
   * Actividades de un snapshot, ya validadas y listas para `appendRows`.
   * @param {object} snapshot
   * @returns {{ rows: Array, errors: Array }}
   */
  const readSnapshotActivities = useCallback((snapshot) => {
    const activities = snapshot?.payload?.data?.activities;
    return validateActivities(Array.isArray(activities) ? activities : [], 1);
  }, []);

  const deleteSnapshot = useCallback(
    async (id) => {
      await backupStore.remove(id);
      setSnapshots(await backupStore.list(userId));
    },
    [userId]
  );

  const clearSnapshots = useCallback(async () => {
    await backupStore.clear(userId);
    setSnapshots([]);
  }, [userId]);

  const lastBackupAt = snapshots[0]?.created_at ?? null;

  return {
    snapshots,
    busy,
    lastBackupAt,
    refresh,
    createSnapshot,
    readSnapshotActivities,
    deleteSnapshot,
    clearSnapshots,
  };
}

export default useLocalBackup;