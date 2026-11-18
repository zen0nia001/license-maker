// Notifications on this device: Control sends a content-free Web Push when a client asks for a license; the
// service worker (sw-template.js) shows a fixed notice. Control: src/push/push.ts, src/routes/push.ts.
import { fromB64url } from '../license/core';
import { api } from './api';

export type PushState = { supported: boolean; on: boolean; hint: string | null };

async function current() {
  const reg = await navigator.serviceWorker?.getRegistration();
  return { reg, sub: reg?.pushManager ? await reg.pushManager.getSubscription() : null };
}

export async function pushState(): Promise<PushState> {
  try {
    const { reg, sub } = await current();
    if (!reg?.pushManager || !('Notification' in window)) {
      const iphone = /iPhone|iPad/.test(navigator.userAgent) && !(navigator as Navigator & { standalone?: boolean }).standalone;
      return { supported: false, on: false, hint: iphone ? 'On iPhone, open this app from the Home Screen first (Share → Add to Home Screen).' : 'This browser can\'t show notifications here.' };
    }
    return { supported: true, on: !!sub, hint: null };
  } catch {
    return { supported: false, on: false, hint: "This browser can't show notifications here." };
  }
}

export async function turnPushOn(): Promise<void> {
  const { reg } = await current();
  if (!reg?.pushManager) throw new Error("This browser can't show notifications here.");
  if ((await Notification.requestPermission()) !== 'granted') throw new Error("Notifications are blocked for this app. Allow them in the browser's settings.");
  const { publicKey } = await api<{ publicKey: string }>('GET', '/owner/push');
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64url(publicKey) });
  await api('POST', '/owner/push/subscriptions', sub.toJSON());
}

export async function turnPushOff(): Promise<void> {
  const { sub } = await current();
  if (!sub) return;
  await api('DELETE', '/owner/push/subscriptions', { endpoint: sub.endpoint });
  await sub.unsubscribe();
}
