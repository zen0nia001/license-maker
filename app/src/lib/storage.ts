// This device's saved data. The NAMES are License Maker's (licenseMaker.*): GitHub Pages serves this app from the
// same address, so a phone that already has its locked key, payment details and key history keeps them.
import type { LockedBox, Plan, ProductCode } from './license/core';

export const KEYS = {
  lockedKey: 'licenseMaker.key',
  issued: 'licenseMaker.issued',
  pay: 'licenseMaker.pay',
  contact: 'licenseMaker.contact',
} as const;

export const store = {
  get<T>(k: string): T | null {
    try {
      const v = localStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  },
  set(k: string, v: unknown): boolean {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch {
      return false;
    }
  },
  del(k: string) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* nothing saved */
    }
  },
};

/** A key made on this device ("Made on this device"), newest first. */
export type IssuedKey = {
  product: ProductCode;
  plan: Plan | null;
  customer: string;
  iid: string;
  lastDay: string;
  lid: string;
  license: string;
  at: string;
};

export type { LockedBox };
