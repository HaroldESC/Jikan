import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cloudBackupFileName,
  connect as gdriveConnect,
  deleteBackup,
  disconnect as gdriveDisconnect,
  downloadBackup,
  expiresAt as readTokenExpiresAt,
  isConfigured,
  isConnected,
  listBackups,
  uploadBackup,
} from '../lib/gdrive';
import { encryptValue, getSessionKey } from '../lib/crypto';
import { buildBackup, buildCloudEnvelope, serializeBackup } from '../utils/backup';

/** Warn this long before the GIS access token expires (flips status to 'expired'). */
const EXPIRY_WARNING_MS = 60 * 1000;

/** Error carrying a machine-readable `.code` (MainShell maps codes to i18n keys). */
const errorWithCode = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

/**
 * Gate every action against the *live* token, never against `status`:
 * `status` flips to 'expired' on purpose 60 s early, and a dead token must
 * never reach the network (a 401 remains the safety net anyway).
 */
const requireConnected = () => {
  if (!isConnected()) {
    throw errorWithCode('expired', 'Google Drive is not connected');
  }
};

/**
 * Cloud backup state (v4.0 C5): Google Drive connection + manual backups.
 *
 * The OAuth token lives outside React (module state in `src/lib/gdrive.js`),
 * so this hook mirrors it into `status`/`expiresAt` and schedules a proactive
 * timer that lowers `status` to 'expired' 60 s before the token dies. It also
 * owns the cloud list state (`items`/`listBusy`/`listError`).
 *
 * Errors are never swallowed: they propagate to the caller with `.code`
 * intact (no i18n here; MainShell renders the messages). `list()` also stores
 * the error code in `listError` before rethrowing so the UI can show it.
 *
 * @param {object} params
 * @param {Array}  params.rows       crudas del store (`useActivities().rows`)
 * @param {object} params.user       usuario actual (o invitado)
 * @param {boolean} [params.isGuest]
 * @param {object} [params.encryption] retorno de `useEncryption()`
 * @returns {{ configured, status, expiresAt, busy, items, listBusy, listError,
 *             connect, disconnect, upload, list, download, remove }}
 *   status: 'disconnected' | 'connected' | 'expired'
 */
export function useCloudBackup({ rows = [], user, isGuest = false, encryption }) {
  const configured = isConfigured();
  const [status, setStatus] = useState(() => (isConnected() ? 'connected' : 'disconnected'));
  const [expiresAt, setExpiresAt] = useState(() => readTokenExpiresAt());
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState([]);
  const [listBusy, setListBusy] = useState(false);
  const [listError, setListError] = useState(null);
  const expiryTimerRef = useRef(null);

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  }, []);

  /**
   * Re-reads the live token and reschedules the proactive expiry flip.
   * Called on mount and after connect/disconnect.
   */
  const syncConnection = useCallback(() => {
    clearExpiryTimer();
    const exp = readTokenExpiresAt();
    setExpiresAt(exp);
    if (!isConnected()) {
      setStatus('disconnected');
      return;
    }
    setStatus('connected');
    if (exp) {
      // Flip to 'expired' 60 s before the real expiry (min 0 if already close).
      const delay = Math.max(0, exp - Date.now() - EXPIRY_WARNING_MS);
      expiryTimerRef.current = setTimeout(() => {
        expiryTimerRef.current = null;
        setStatus('expired');
      }, delay);
    }
  }, [clearExpiryTimer]);

  // Mount: initial sync. Unmount: drop the pending timer.
  useEffect(() => {
    syncConnection();
    return clearExpiryTimer;
  }, [syncConnection, clearExpiryTimer]);

  /** Opens the GIS consent popup (inside a user gesture) and syncs status. */
  const connect = useCallback(async () => {
    setBusy(true);
    setListError(null);
    try {
      const result = await gdriveConnect();
      syncConnection();
      return result;
    } finally {
      setBusy(false);
    }
  }, [syncConnection]);

  /** Revokes/forgets the in-memory token and syncs status. */
  const disconnect = useCallback(() => {
    setBusy(true);
    setListError(null);
    try {
      gdriveDisconnect();
      syncConnection();
    } finally {
      setBusy(false);
    }
  }, [syncConnection]);

  /**
   * Refreshes `items`. On failure it stores the error code in `listError`
   * and rethrows: callers decide how to present it (MainShell → alert).
   */
  const list = useCallback(async () => {
    requireConnected();
    setListBusy(true);
    setListError(null);
    try {
      const result = await listBackups();
      setItems(result);
      return result;
    } catch (error) {
      setListError(error?.code ?? null);
      throw error;
    } finally {
      setListBusy(false);
    }
  }, []);

  /**
   * Uploads the current state as a new cloud backup.
   *
   * With local encryption active the payload is encrypted with the session
   * key first and wrapped in a cloud envelope (`env` + KDF material); without
   * it the text is the same clear-text JSON as the GDPR export. The follow-up
   * `list()` refresh is best-effort and never fails the upload.
   *
   * @returns {Promise<{ id, name, createdTime }>}
   */
  const upload = useCallback(async () => {
    setBusy(true);
    try {
      requireConnected();
      const payload = buildBackup({ activities: rows, userId: user?.id, isGuest });

      let text;
      let encrypted = false;
      if (encryption?.enabled) {
        const sessionKey = getSessionKey();
        if (!sessionKey) {
          throw errorWithCode('locked', 'Encryption is enabled but the session is locked');
        }
        // Plaintext never leaves the device: encrypt, then wrap with the KDF material.
        const cryptoEnvelope = await encryptValue(sessionKey, payload);
        const envelope = buildCloudEnvelope({ payload: cryptoEnvelope, kdf: encryption.kdf });
        text = JSON.stringify(envelope, null, 2);
        encrypted = true;
      } else {
        text = serializeBackup(payload);
      }

      const result = await uploadBackup({ name: cloudBackupFileName(), text, encrypted });
      try {
        await list();
      } catch {
        // Best-effort refresh: a failed list must not fail the upload.
      }
      return result;
    } finally {
      setBusy(false);
    }
  }, [encryption, isGuest, list, rows, user]);

  /**
   * Downloads the raw file text. Decryption/parse (restore) happens in
   * MainShell, not here.
   * @returns {Promise<string>}
   */
  const download = useCallback(async (id) => {
    requireConnected();
    return downloadBackup(id);
  }, []);

  /** Deletes a cloud backup and drops it from `items` locally. */
  const remove = useCallback(
    async (id) => {
      setBusy(true);
      try {
        requireConnected();
        await deleteBackup(id);
        setItems((prev) => prev.filter((item) => item.id !== id));
      } finally {
        setBusy(false);
      }
    },
    []
  );

  return {
    configured,
    status,
    expiresAt,
    busy,
    items,
    listBusy,
    listError,
    connect,
    disconnect,
    upload,
    list,
    download,
    remove,
  };
}

export default useCloudBackup;
