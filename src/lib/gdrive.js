/**
 * Google Drive client + Google Identity Services (GIS) OAuth 2.0 (v4.0 C5).
 *
 * Framework-free: no React, no dependencies — plain `fetch` against Drive API
 * v3 with the GIS token client (scope `drive.file`, popup, no redirect).
 *
 * - The GIS script loads and `initTokenClient()` runs eagerly **at module
 *   load** (only with `VITE_GOOGLE_CLIENT_ID`): Google requires
 *   `requestAccessToken()` inside the transient user activation (~5 s), so a
 *   slow load would be reported as "popup blocked". `connect()` only invokes
 *   `requestAccessToken()` and awaits the deferred settled by the callbacks.
 * - The access token lives only in module memory (never localStorage):
 *   reloading the tab ends the session, as decided.
 * - Every Drive call goes through `driveFetch()`, mapping failures to an
 *   `Error` with a stable `.code`: expired | forbidden | rate | offline | api |
 *   not_configured | denied | popup_closed | popup_blocked.
 *
 * Backups are JSON files tagged with the Drive property `app=jikan` so that
 * `listBackups()` finds them again (see `uploadBackup()`).
 */

import { exportDateKey } from '../utils/export';

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GSI_SRC = 'https://accounts.google.com/gsi/client';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const BACKUP_QUERY = "properties has { key='app' and value='jikan' } and trashed=false";

// Session state (module memory only: never persisted): token + expiry, the
// in-flight `connect()` deferred ({ promise, resolve, reject }) and the
// module-level GIS promise (script load + init, result remembered).
let accessToken = null;
let tokenExpiresAt = null;
let tokenClient = null;
let pendingConnect = null;
let gsiPromise = null;

const pad2 = (n) => String(n).padStart(2, '0');
const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

/** Builds an `Error` carrying a stable `.code` (plus optional extra fields). */
function fail(code, extra) {
  const e = new Error(code);
  e.code = code;
  if (extra) Object.assign(e, extra);
  return e;
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function clearToken() {
  accessToken = null;
  tokenExpiresAt = null;
}

/** ¿Hay Client ID configurado en las env vars? */
export function isConfigured() {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
}

/** Token presente y aún no caducado. */
export function isConnected() {
  return accessToken != null && tokenExpiresAt != null && Date.now() < tokenExpiresAt;
}

/** Caducidad del token (epoch ms) o `null` sin sesión. */
export function expiresAt() {
  return accessToken != null ? tokenExpiresAt : null;
}

// ── Google Identity Services (token client) ─────────────────────────────────

function onTokenResponse(response) {
  const pending = pendingConnect;
  pendingConnect = null;
  if (response?.error || !response?.access_token) {
    pending?.reject(fail('denied', { error: response?.error ?? 'missing_access_token' }));
    return;
  }
  accessToken = response.access_token;
  tokenExpiresAt = Date.now() + (response.expires_in ?? 3600) * 1000;
  pending?.resolve(true);
}

function onTokenError(err) {
  const type = err?.type;
  const code = type === 'popup_failed_to_open' ? 'popup_blocked'
    : type === 'popup_closed' ? 'popup_closed' : 'denied';
  const pending = pendingConnect;
  pendingConnect = null;
  pending?.reject(fail(code));
}

/** Loads the GIS script once and initializes the token client immediately. */
function ensureGis() {
  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GSI_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(fail('offline'));
      document.head.appendChild(script);
    }).then(() => {
      tokenClient = globalThis.google?.accounts?.oauth2?.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: SCOPE,
        callback: onTokenResponse,
        error_callback: onTokenError,
      }) ?? null;
      if (!tokenClient) throw fail('offline');
    });
    // Remember the failure (no retry) without an unhandled rejection.
    gsiPromise.catch(() => {});
  }
  return gsiPromise;
}

// Eager init at module load (see header): `connect()` must not pay the load.
if (isConfigured() && typeof document !== 'undefined') ensureGis();

// ── Connection ───────────────────────────────────────────────────────────────

/** Pide un token dentro de un gesto. → true | Error con `.code`. */
export async function connect() {
  if (!isConfigured()) throw fail('not_configured');
  if (isOffline()) throw fail('offline');
  if (isConnected()) return true;
  if (pendingConnect) return pendingConnect.promise;

  try {
    await ensureGis();
  } catch (err) {
    throw err?.code ? err : fail('offline');
  }
  if (!tokenClient) throw fail('offline');

  const deferred = createDeferred();
  pendingConnect = deferred;
  try {
    tokenClient.requestAccessToken();
  } catch (err) {
    pendingConnect = null;
    deferred.reject(err?.code ? err : fail('denied', { error: String(err?.message ?? err) }));
  }
  return deferred.promise;
}

/** Borra el token de memoria y revoca el acceso en Google (fire-and-forget). */
export function disconnect() {
  const token = accessToken;
  clearToken();
  if (!token) return;
  try {
    globalThis.google?.accounts?.oauth2?.revoke(token, () => {});
  } catch {
    // Revocation is best-effort: local state is already cleared.
  }
}

// ── Drive API ────────────────────────────────────────────────────────────────

/** Pre-check: offline → `offline`; token caducado → limpia y `expired`. */
function requireToken() {
  if (isOffline()) throw fail('offline');
  if (accessToken != null && tokenExpiresAt != null && Date.now() >= tokenExpiresAt) clearToken();
  if (!isConnected()) throw fail('expired');
  return accessToken;
}

/** Única puerta de salida a la red: añade el bearer y mapea los errores. */
async function driveFetch(url, options = {}) {
  const token = requireToken();
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: { ...(options.headers ?? {}), Authorization: `Bearer ${token}` },
    });
  } catch {
    throw fail('offline');
  }
  if (response.ok) return response;
  if (response.status === 401) { clearToken(); throw fail('expired'); }
  if (response.status === 403) throw fail('forbidden');
  if (response.status === 429 || response.status >= 500) throw fail('rate');
  let message = response.statusText || `HTTP ${response.status}`;
  try {
    const body = await response.json();
    if (body?.error?.message) message = body.error.message;
  } catch { /* non-JSON body: keep the status text */ }
  throw fail('api', { status: response.status, message });
}

/**
 * Sube una copia (multipart: metadata + JSON). La propiedad `app: 'jikan'` es
 * obligatoria: sin ella `listBackups()` no la vuelve a encontrar.
 * @returns {Promise<{ id: string, name: string, createdTime: string }>}
 */
export async function uploadBackup({ name, text, encrypted = false }) {
  const boundary = `jikan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const properties = { app: 'jikan', enc: encrypted ? '1' : '0' };
  const metadata = JSON.stringify({ name, properties });
  const head = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`;
  const body = `${head}${metadata}\r\n${head}${text ?? ''}\r\n--${boundary}--\r\n`;

  const response = await driveFetch(
    `${DRIVE_UPLOAD}?uploadType=multipart&fields=id,name,createdTime`,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    }
  );
  const file = await response.json();
  return { id: file.id, name: file.name, createdTime: file.createdTime };
}

/**
 * Copias de la cuenta (máx. 50), más recientes primero. `fields` es explícito
 * porque el default de Drive no incluye `size`.
 * @returns {Promise<Array<{ id, name, createdTime, size }>} ordenadas desc}
 */
export async function listBackups() {
  const url =
    `${DRIVE_API}/files?q=${encodeURIComponent(BACKUP_QUERY)}` +
    `&fields=${encodeURIComponent('files(id,name,createdTime,size)')}` +
    `&orderBy=${encodeURIComponent('createdTime desc')}&pageSize=50`;
  const response = await driveFetch(url);
  const data = await response.json();
  const files = Array.isArray(data.files) ? data.files : [];
  return files
    .map((f) => ({ id: f.id, name: f.name, createdTime: f.createdTime, size: f.size ?? null }))
    .sort((a, b) => String(b.createdTime ?? '').localeCompare(String(a.createdTime ?? '')));
}

/** Descarga el texto de una copia (`alt=media`). */
export async function downloadBackup(id) {
  const response = await driveFetch(`${DRIVE_API}/files/${encodeURIComponent(id)}?alt=media`);
  return response.text();
}

/** Elimina una copia de Drive. */
export async function deleteBackup(id) {
  await driveFetch(`${DRIVE_API}/files/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Nombre de archivo de la copia en la nube: `jikan-backup-YYYY-MM-DD-HHmm.json`. */
export function cloudBackupFileName(date = new Date()) {
  const hhmm = `${pad2(date.getHours())}${pad2(date.getMinutes())}`;
  return `jikan-backup-${exportDateKey(date)}-${hhmm}.json`;
}
