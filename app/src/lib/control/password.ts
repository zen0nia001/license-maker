// The owner's password sign-in (a fallback to passkeys; Control: src/auth/password.ts). The password never leaves
// this device: it is stretched here (PBKDF2-SHA256 with Control's salt and iterations) and only the result is sent.
import { b64url, fromB64url } from '../license/core';
import { api, session } from './api';

const ITERATIONS = 600_000;

async function proof(password: string, salt: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromB64url(salt), iterations }, key, 256);
  return b64url(new Uint8Array(bits));
}

/** Signs in with the username and password; true when the password must be changed first (a seeded one). */
export async function passwordSignIn(username: string, password: string): Promise<boolean> {
  const name = username.trim().toLowerCase();
  const { salt, iterations } = await api<{ salt: string; iterations: number }>('POST', '/owner/auth/password/options', { username: name });
  const done = await api<{ token: string; expiresAt: string; mustChangePassword: boolean }>('POST', '/owner/auth/password/login', {
    username: name,
    proof: await proof(password, salt, iterations),
  });
  session.set({ token: done.token, expiresAt: done.expiresAt });
  return done.mustChangePassword;
}

export const PASSWORD_MIN = 10;

/** Sets (or changes) the password, with a new salt; signed in. */
export async function setPassword(password: string, username?: string): Promise<void> {
  if (password.length < PASSWORD_MIN) throw new Error(`Use at least ${PASSWORD_MIN} characters.`);
  const salt = b64url(crypto.getRandomValues(new Uint8Array(16)));
  await api('PUT', '/owner/password', { ...(username ? { username: username.trim().toLowerCase() } : {}), salt, iterations: ITERATIONS, proof: await proof(password, salt, ITERATIONS) });
}

export type PasswordInfo = { set: boolean; username: string | null; mustChange: boolean; updatedAt: string | null };
