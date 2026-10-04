/**
 * Cifrado local del horario (v4.0 C3) con la Web Crypto API.
 *
 * Diseño (decidido por el usuario):
 *   - Se cifra **todo** el horario local: título, descripción, notas, color, día
 *     y horas. No hay "campos sueltos" sin cifrar.
 *   - La clave se deriva de una passphrase con PBKDF2-SHA256 y **nunca sale del
 *     dispositivo**. Solo vive en memoria durante la sesión: al recargar hay que
 *     volver a escribirla.
 *   - Si el usuario olvida la passphrase, los datos se pierden (no hay copia).
 *
 * Esquema del sobre (envelope) — JSON-safe, portable y versionado:
 *   { v: 1, alg: 'AES-GCM', iv: <base64>, data: <base64> }
 *
 * La sal y el número de iteraciones NO viajan en el sobre: viven una sola vez en
 * los ajustes (`jikan.encryption`) porque hay una única clave maestra por
 * dispositivo; cada sobre lleva su propio IV aleatorio.
 */

export const ENVELOPE_VERSION = 1;
export const ALGORITHM = 'AES-GCM';
export const KDF = 'PBKDF2-SHA256';
export const PBKDF2_ITERATIONS = 250000;
export const SALT_BYTES = 16;
export const IV_BYTES = 12;
export const MIN_PASSPHRASE_LENGTH = 8;
/** Texto cifrado usado para comprobar que la passphrase es correcta. */
export const VERIFIER_PLAINTEXT = 'jikan-verifier-v1';

/** ¿El navegador soporta Web Crypto con PBKDF2/AES-GCM? */
export function isCryptoAvailable() {
  return (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.subtle !== 'undefined' &&
    typeof globalThis.crypto.subtle.importKey === 'function'
  );
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Bytes aleatorios criptográficamente seguros → base64. */
export function randomBytesBase64(length) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytesToBase64(bytes);
}

export function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Deriva la clave maestra AES-GCM de una passphrase. */
export async function deriveKey(passphrase, { salt, iterations = PBKDF2_ITERATIONS } = {}) {
  if (!isCryptoAvailable()) throw new Error('Web Crypto no disponible en este navegador');
  const saltBytes = salt ? base64ToBytes(salt) : base64ToBytes(randomBytesBase64(SALT_BYTES));

  const material = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await globalThis.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
    material,
    { name: ALGORITHM, length: 256 },
    false, // no exportable: el JavaScript no puede leer la clave
    ['encrypt', 'decrypt']
  );

  return { key, salt: bytesToBase64(saltBytes), iterations };
}

/** Cifra cualquier valor JSON-serializable. */
export async function encryptValue(key, value) {
  const iv = randomBytesBase64(IV_BYTES);
  const plaintext = encoder.encode(JSON.stringify(value ?? null));
  const cipher = await globalThis.crypto.subtle.encrypt(
    { name: ALGORITHM, iv: base64ToBytes(iv) },
    key,
    plaintext
  );
  return { v: ENVELOPE_VERSION, alg: ALGORITHM, iv, data: bytesToBase64(new Uint8Array(cipher)) };
}

/** Descifra un sobre. Lanza si la clave es incorrecta o el sobre está corrupto. */
export async function decryptValue(key, envelope) {
  if (!envelope || envelope.v !== ENVELOPE_VERSION || envelope.alg !== ALGORITHM) {
    throw new Error('Formato de sobre no soportado');
  }
  const plain = await globalThis.crypto.subtle.decrypt(
    { name: ALGORITHM, iv: base64ToBytes(envelope.iv) },
    key,
    base64ToBytes(envelope.data)
  );
  return JSON.parse(decoder.decode(plain));
}

/** Crea el sobre de verificación que permite validar una passphrase sin datos. */
export async function createVerifier(key) {
  return encryptValue(key, VERIFIER_PLAINTEXT);
}

/** `true` si la passphrase abre el verificador (sin distinguir tipos de error). */
export async function verifyPassphrase(key, verifier) {
  if (!verifier) return true; // cifrado recién activado sin verificador: nada que comprobar
  try {
    return (await decryptValue(key, verifier)) === VERIFIER_PLAINTEXT;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Clave de sesión: vive SOLO en memoria, nunca se persiste
// ─────────────────────────────────────────────────────────────────────────────

let sessionKey = null;

export const getSessionKey = () => sessionKey;
export const setSessionKey = (key) => {
  sessionKey = key ?? null;
};
export const clearSessionKey = () => {
  sessionKey = null;
};
export const isUnlocked = () => sessionKey != null;

/** Cifra un valor si hay clave; si no la hay devuelve el valor tal cual. */
export async function maybeEncrypt(value) {
  if (!sessionKey) return value;
  return { enc: await encryptValue(sessionKey, value) };
}

/** Descifra cuando corresponde; si no hay clave devuelve el valor tal cual. */
export async function maybeDecrypt(stored) {
  if (!stored || typeof stored !== 'object' || !stored.enc) return stored;
  if (!sessionKey) throw new Error('Local data is locked');
  return decryptValue(sessionKey, stored.enc);
}