export interface ClinicianSession {
  access_token: string;
  role: string;
  display_name: string;
  user_id: string;
}

const CLINICIAN_SESSION_KEY = 'swasthyavaani_clinician_session';

export function storeClinicianSession(
  session: ClinicianSession,
  remember: boolean,
): void {
  sessionStorage.removeItem(CLINICIAN_SESSION_KEY);
  localStorage.removeItem(CLINICIAN_SESSION_KEY);
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(CLINICIAN_SESSION_KEY, JSON.stringify(session));
}

export function getClinicianSession(): ClinicianSession | null {
  const serialized =
    sessionStorage.getItem(CLINICIAN_SESSION_KEY) ??
    localStorage.getItem(CLINICIAN_SESSION_KEY);
  if (!serialized) return null;

  try {
    const session = JSON.parse(serialized) as Partial<ClinicianSession>;
    if (
      typeof session.access_token !== 'string' ||
      typeof session.role !== 'string' ||
      typeof session.display_name !== 'string' ||
      typeof session.user_id !== 'string'
    ) {
      return null;
    }
    return session as ClinicianSession;
  } catch {
    return null;
  }
}

export function getClinicianAccessToken(): string | null {
  return getClinicianSession()?.access_token ?? null;
}

export function clearClinicianSession(): void {
  sessionStorage.removeItem(CLINICIAN_SESSION_KEY);
  localStorage.removeItem(CLINICIAN_SESSION_KEY);
}

export function authorizedClinicianFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getClinicianAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
