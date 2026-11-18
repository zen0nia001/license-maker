// How each app looks on the home grid, and which key format it signs. Store listings (description, icon, price)
// move into Control in S2; until then the look lives here.
import { PRODUCTS, type ProductCode } from './license/core';
import type { Installation, LicenseRequest, Product } from './control/types';

type Look = { icon: string; color: string; tagline: string };

const LOOKS: Record<string, Look> = {
  pos: { icon: '🧾', color: '#2563eb', tagline: 'Point of sale for shops' },
  spx: { icon: '🛵', color: '#ee4d2d', tagline: 'Records for SPX delivery hubs' },
};

export const lookOf = (p: Product): Look => LOOKS[p.id] ?? { icon: p.name.slice(0, 1).toUpperCase(), color: '#64748b', tagline: '' };

/** The key format this app's licenses use, when this app can sign it (POS1 → POS). */
export const codeOf = (p: Product): ProductCode | null =>
  (Object.keys(PRODUCTS) as ProductCode[]).find((k) => PRODUCTS[k] === p.licensePrefix) ?? null;

export type AppStats = {
  installs: Installation[];
  /** Installations that need a look (alerts, or new and not accepted yet). */
  attention: Installation[];
  waiting: LicenseRequest[];
  newestVersion: string | null;
};

const versionKey = (v: string) => v.split('.').map((n) => n.padStart(6, '0')).join('.');

export function statsOf(p: Product, installations: Installation[], requests: LicenseRequest[]): AppStats {
  const installs = installations.filter((i) => i.product.id === p.id && i.status !== 'ignored');
  const releases = installs.map((i) => i.version).filter((v): v is string => !!v && /^\d+\.\d+\.\d+$/.test(v));
  return {
    installs,
    attention: installs.filter((i) => i.alerts.length > 0 || i.status === 'new'),
    waiting: requests.filter((r) => r.product.id === p.id && r.status === 'pending'),
    newestVersion: releases.sort((a, b) => versionKey(b).localeCompare(versionKey(a)))[0] ?? null,
  };
}
