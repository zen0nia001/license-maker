// Owner sign-in with a passkey on this device (WebAuthn, no library): Control makes the options and checks the
// answer; the ceremony runs here (Control: src/auth/routes.ts).
import { b64url, fromB64url } from '../license/core';
import { api, clientApi, clientSession, session, type Session } from './api';

type Json = Record<string, unknown>;

function creationOptions(o: Json): PublicKeyCredentialCreationOptions {
  const user = o.user as Json;
  return {
    ...(o as unknown as PublicKeyCredentialCreationOptions),
    challenge: fromB64url(o.challenge as string),
    user: { ...(user as unknown as PublicKeyCredentialUserEntity), id: fromB64url(user.id as string) },
    excludeCredentials: ((o.excludeCredentials as Json[] | undefined) ?? []).map((c) => ({ ...(c as unknown as PublicKeyCredentialDescriptor), id: fromB64url(c.id as string) })),
  };
}

function requestOptions(o: Json): PublicKeyCredentialRequestOptions {
  return {
    ...(o as unknown as PublicKeyCredentialRequestOptions),
    challenge: fromB64url(o.challenge as string),
    allowCredentials: ((o.allowCredentials as Json[] | undefined) ?? []).map((c) => ({ ...(c as unknown as PublicKeyCredentialDescriptor), id: fromB64url(c.id as string) })),
  };
}

const bytes = (b: ArrayBuffer) => b64url(new Uint8Array(b));

function credentialJSON(cred: PublicKeyCredential) {
  const r = cred.response;
  const response =
    'attestationObject' in r
      ? {
          clientDataJSON: bytes(r.clientDataJSON),
          attestationObject: bytes((r as AuthenticatorAttestationResponse).attestationObject),
          transports: (r as AuthenticatorAttestationResponse).getTransports?.(),
        }
      : {
          clientDataJSON: bytes(r.clientDataJSON),
          authenticatorData: bytes((r as AuthenticatorAssertionResponse).authenticatorData),
          signature: bytes((r as AuthenticatorAssertionResponse).signature),
          userHandle: (r as AuthenticatorAssertionResponse).userHandle ? bytes((r as AuthenticatorAssertionResponse).userHandle!) : undefined,
        };
  return {
    id: cred.id,
    rawId: bytes(cred.rawId),
    type: cred.type,
    response,
    clientExtensionResults: cred.getClientExtensionResults(),
    authenticatorAttachment: cred.authenticatorAttachment ?? undefined,
  };
}

/** Puts a passkey for Control on this device: the first one with the setup code, more while signed in, or with an
 *  add-device link made on a signed-in device (then this device is signed in too). */
export async function addPasskey(name: string, setupCode?: string, deviceInvite?: string): Promise<void> {
  const { options, challengeToken } = await api<{ options: Json; challengeToken: string }>('POST', '/owner/auth/register/options', { setupCode, deviceInvite });
  const cred = (await navigator.credentials.create({ publicKey: creationOptions(options) })) as PublicKeyCredential | null;
  if (!cred) throw new Error('No passkey was made.');
  const done = await api<{ token?: string; expiresAt?: string }>('POST', '/owner/auth/register/verify', { setupCode, deviceInvite, challengeToken, name, response: credentialJSON(cred) });
  if (done.token && done.expiresAt) session.set({ token: done.token, expiresAt: done.expiresAt });
}

export async function signIn(): Promise<void> {
  const { options, challengeToken } = await api<{ options: Json; challengeToken: string }>('POST', '/owner/auth/login/options', {});
  const cred = (await navigator.credentials.get({ publicKey: requestOptions(options) })) as PublicKeyCredential | null;
  if (!cred) throw new Error('No passkey was used.');
  session.set(await api<Session>('POST', '/owner/auth/login/verify', { challengeToken, response: credentialJSON(cred) }));
}

// ---------- clients (C1): their own passkeys, from a one-time invite link ----------

export type InviteInfo = { client: { name: string; business: string | null }; expiresAt: string };

/** Who an invite link is for (it writes nothing). */
export const readInvite = (invite: string) => clientApi<InviteInfo>('POST', '/client/auth/invite', { invite });

type ClientSignedIn = Session & { client: { name: string; business: string | null } };

/** Sets up the client's passkey on this device with their invite, and signs them in. */
export async function joinWithInvite(invite: string, name: string): Promise<void> {
  const { options, challengeToken } = await clientApi<{ options: Json; challengeToken: string }>('POST', '/client/auth/register/options', { invite });
  const cred = (await navigator.credentials.create({ publicKey: creationOptions(options) })) as PublicKeyCredential | null;
  if (!cred) throw new Error('No passkey was made.');
  const done = await clientApi<ClientSignedIn>('POST', '/client/auth/register/verify', { invite, challengeToken, name, response: credentialJSON(cred) });
  clientSession.set({ token: done.token, expiresAt: done.expiresAt, name: done.client.name });
}

export async function clientSignIn(): Promise<void> {
  const { options, challengeToken } = await clientApi<{ options: Json; challengeToken: string }>('POST', '/client/auth/login/options', {});
  const cred = (await navigator.credentials.get({ publicKey: requestOptions(options) })) as PublicKeyCredential | null;
  if (!cred) throw new Error('No passkey was used.');
  const done = await clientApi<ClientSignedIn>('POST', '/client/auth/login/verify', { challengeToken, response: credentialJSON(cred) });
  clientSession.set({ token: done.token, expiresAt: done.expiresAt, name: done.client.name });
}

export async function clientSignOut(): Promise<void> {
  try {
    await clientApi('POST', '/client/auth/logout');
  } catch {
    /* signed out here anyway */
  }
  clientSession.clear();
}

/** A cancelled passkey prompt reads "cancelled", anything else as it is. */
/** The browser refused to make a passkey because this device (or the account it syncs with, e.g. Google Password
 *  Manager) already holds one for this account: nothing to set up, just sign in. */
export const alreadyHasPasskey = (e: unknown) => (e as Error)?.name === 'InvalidStateError';

export const passkeyError = (e: unknown, what: string) =>
  (e as Error).name === 'NotAllowedError'
    ? `${what} was cancelled.`
    : alreadyHasPasskey(e)
      ? 'This device already has your passkey (it may have come with your Google or Apple account): just sign in with it.'
      : (e as Error).message;
