// Control's owner API, as this app reads it (Control: src/routes/*.ts).

/** An app as the public store shows it (Control: src/store/listing.ts publicView). */
export type Listing = {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  icon: string | null;
  color: string | null;
  priceMonthly: string | null;
  priceYearly: string | null;
  features: string[];
};

/** An app as the owner sees it: its listing, and what Control knows of it (ownerView). */
export type Product = Listing & { licensePrefix: string; imageRepo: string | null; published: boolean; sort: number };

/** The store's own details (Control: storeView). */
export type StoreDetails = { name: string | null; about: string | null; messenger: string | null; mobile: string | null };

export type Alert = 'silent' | 'license_locked' | 'license_ending' | 'backup_old' | 'disk_low' | 'moved' | 'clone_suspected';

export type Installation = {
  id: string;
  product: { id: string; name: string };
  status: 'new' | 'active' | 'ignored';
  label: string | null;
  customer: string | null;
  installationId: string | null;
  movedFrom: string | null;
  movedAt: string | null;
  enrolledAt: string;
  lastSeenAt: string | null;
  version: string | null;
  kind: string | null;
  license: { state: string; plan: string | null; expiresAt: string | null; daysLeft: number | null } | null;
  backup: { lastAt: string | null; count: number; encrypted: boolean } | null;
  disk: { freeBytes: number; totalBytes: number } | null;
  databaseBytes: number | null;
  alerts: Alert[];
};

export type LicenseRequest = {
  id: string;
  installation: { id: string; label: string | null; installationId: string | null; customer: string | null };
  product: { id: string; name: string };
  plan: 'trial' | 'monthly' | 'yearly';
  paymentReference: string | null;
  status: 'pending' | 'approved' | 'delivered' | 'declined';
  note: string | null;
  licenseId: string | null;
  expiresAt: string | null;
  createdAt: string;
  decidedAt: string | null;
  deliveredAt: string | null;
  currentLicense: { state: string; plan: string | null; expiresAt: string | null } | null;
};

/** "I'm interested", from the public store (Control: src/routes/inquiries.ts). */
export type Inquiry = {
  id: string;
  product: { id: string; name: string } | null;
  name: string;
  business: string | null;
  contactKind: 'messenger' | 'mobile' | 'email';
  contact: string;
  message: string | null;
  status: 'new' | 'done';
  createdAt: string;
  handledAt: string | null;
};

export type Passkey = { id: string; name: string; deviceType: string | null; backedUp: boolean; createdAt: string; lastUsedAt: string | null; current: boolean };
