import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearSessionKey,
  createVerifier,
  deriveKey,
  encryptValue,
  getSessionKey,
  isCryptoAvailable,
  isUnlocked,
  setSessionKey,
  verifyPassphrase,
} from '../lib/crypto';
import { localStore } from '../lib/activityStore';
import { backupStore } from '../lib/backupStore';

/**
 * Ajustes de cifrado local (v4.0 C3).
 *
 * Solo se guarda el *flag* y el material de derivación, nunca la passphrase:
 *   jikan.encryption = {
 *     enabled: true,
 *     salt: '<base64>',
 *     iterations: 250000,
 *     verifier: { v, alg, iv, data }
 *   }
 *
 * La clave AES vive en memoria (`setSessionKey`), así que al recargar la app
 * queda bloqueada hasta que el usuario escribe su passphrase.
 */

const KEY = 'jikan.encryption';

const readSettings = () => {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    console.error('Error reading encryption settings:', error);
    return null;
  }
};

const writeSettings = (value) => {
  try {
    if (value) window.localStorage.setItem(KEY, JSON.stringify(value));
    else window.localStorage.removeItem(KEY);
  } catch (error) {
    console.error('Error writing encryption settings:', error);
  }
};

export function useEncryption() {
  const [settings, setSettings] = useState(readSettings);
  const [unlocked, setUnlocked] = useState(() => isUnlocked());
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  // Espejo síncrono del error: las operaciones son async, así que leer el estado
  // de React justo después del `await` daría el valor anterior.
  const errorRef = useRef(null);

  const setErrorState = useCallback((value, message = null) => {
    errorRef.current = value ? { code: value, message } : null;
    setError(value ? { code: value, message } : null);
  }, []);

  const supported = isCryptoAvailable();
  const enabled = Boolean(settings?.enabled);

  // El candado se aplica siempre que el cifrado esté activo, haya sesión o no:
  // también protege los snapshots locales de C2 y los datos de invitado.
  useEffect(() => {
    if (!enabled) clearSessionKey();
  }, [enabled]);

  const refresh = useCallback(() => {
    setSettings(readSettings());
    setUnlocked(isUnlocked());
  }, []);

  /**
   * Activa el cifrado. Deriva la clave, cifra las filas locales que hubiera y
   * guarda el verificador.
   * @param {string} passphrase
   * @returns {Promise<boolean>} `true` si quedó activo
   */
  const enable = useCallback(async (passphrase) => {
    if (!supported) {
      setErrorState('unsupported');
      return false;
    }
    setBusy(true);
    setErrorState(null);
    try {
      const { key, salt, iterations } = await deriveKey(passphrase);
      // La clave debe estar en memoria para poder cifrar las filas existentes.
      setSessionKey(key);
      const verifier = await createVerifier(key);
      const next = { enabled: true, salt, iterations, verifier };
      writeSettings(next);
      await localStore.encryptAll(key);
      await backupStore.encryptAll(key);
      setSettings(next);
      setUnlocked(true);
      return true;
    } catch (err) {
      console.error('Error enabling encryption:', err);
      clearSessionKey();
      setUnlocked(false);
      setErrorState('unexpected', err?.message ?? '');
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported]);

  /**
   * Desbloquea la sesión con la passphrase.
   * @returns {Promise<boolean>}
   */
  const unlock = useCallback(
    async (passphrase) => {
      if (!enabled) {
        setUnlocked(true);
        return true;
      }
      if (!supported) {
        setErrorState('unsupported');
        return false;
      }
      setBusy(true);
      setErrorState(null);
      try {
        const { key } = await deriveKey(passphrase, {
          salt: settings?.salt,
          iterations: settings?.iterations,
        });
        if (!(await verifyPassphrase(key, settings?.verifier))) {
          setErrorState('wrongPassphrase');
          return false;
        }
        setSessionKey(key);
        setUnlocked(true);
        return true;
      } catch (err) {
        console.error('Error unlocking:', err);
        setErrorState('unexpected', err?.message ?? '');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [enabled, settings?.iterations, settings?.salt, settings?.verifier, supported]
  );

  /**
   * Cambia la passphrase: rederiva la clave, revalida, vuelve a cifrar las filas
   * locales con la nueva clave y **descifra** los snapshots de C2.
   * @param {string} currentPassphrase
   * @param {string} newPassphrase
   */
  const changePassphrase = useCallback(
    async (currentPassphrase, newPassphrase) => {
      if (!supported) {
        setErrorState('unsupported');
        return false;
      }
      setBusy(true);
      setErrorState(null);
      try {
        const current = await deriveKey(currentPassphrase, {
          salt: settings?.salt,
          iterations: settings?.iterations,
        });
        if (!(await verifyPassphrase(current.key, settings?.verifier))) {
          setErrorState('wrongPassphrase');
          return false;
        }

        const next = await deriveKey(newPassphrase);
        const verifier = await createVerifier(next.key);
        const nextSettings = { enabled: true, salt: next.salt, iterations: next.iterations, verifier };

        // Reescribe filas y snapshots con la clave nueva antes de soltarla.
        setSessionKey(next.key);
        await localStore.reencryptAll(current.key, next.key);
        await backupStore.reencryptAll(current.key, next.key);
        writeSettings(nextSettings);
        setSettings(nextSettings);
        setUnlocked(true);
        return true;
      } catch (err) {
        console.error('Error changing passphrase:', err);
        clearSessionKey();
        setUnlocked(false);
        setErrorState('unexpected', err?.message ?? '');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [settings?.iterations, settings?.salt, settings?.verifier, supported]
  );

  /**
   * Desactiva el cifrado: descifra las filas locales y borra el verificador.
   * @param {string} passphrase
   */
  const disable = useCallback(
    async (passphrase) => {
      if (!supported) {
        setErrorState('unsupported');
        return false;
      }
      setBusy(true);
      setErrorState(null);
      try {
        const { key } = await deriveKey(passphrase, {
          salt: settings?.salt,
          iterations: settings?.iterations,
        });
        if (!(await verifyPassphrase(key, settings?.verifier))) {
          setErrorState('wrongPassphrase');
          return false;
        }
        setSessionKey(key);
        await localStore.decryptAll(key);
        await backupStore.decryptAll(key);
        clearSessionKey();
        writeSettings(null);
        setSettings(null);
        setUnlocked(false);
        return true;
      } catch (err) {
        console.error('Error disabling encryption:', err);
        setErrorState('unexpected', err?.message ?? '');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [settings?.iterations, settings?.salt, settings?.verifier, supported]
  );

  /** Bloquea la sesión sin tocar los datos (equivale a recargar). */
  const lock = useCallback(() => {
    clearSessionKey();
    setUnlocked(false);
  }, []);

  return {
    supported,
    enabled,
    unlocked: enabled && unlocked,
    busy,
    error,
    /** Error del último await, en síncrono (el estado de React llega tarde). */
    getError: () => errorRef.current?.code ?? null,
    getErrorMessage: () => errorRef.current?.message ?? '',
    enable,
    unlock,
    changePassphrase,
    disable,
    lock,
    refresh,
    clearError: () => setErrorState(null),
  };
}

export default useEncryption;

/**
 * Borra los ajustes de cifrado sin tocar los datos.
 * La usa la salida de emergencia de `App.jsx` (el usuario ya ha confirmado que
 * los datos se pierden), por eso va fuera del hook.
 */
export function clearEncryptionSettings() {
  clearSessionKey();
  writeSettings(null);
}



