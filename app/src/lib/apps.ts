// How each app looks (from its store listing in Control), and which key format it signs.
import { PRODUCTS, type ProductCode } from './license/core';
import type { Installation, LicenseRequest, Listing, Product } from './control/types';

type Look = { icon: string; tagline: string };

/** An app's icon and line, with plain defaults for an app whose listing isn't written yet. */
export const lookOf = (p: Listing): Look => ({
  icon: p.icon || p.name.slice(0, 1).toUpperCase(),
  tagline: p.tagline || '',
});

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
