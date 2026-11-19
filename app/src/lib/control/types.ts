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
  /** The store form gives a download link at once (the owner's Instant download, and an installer). Public store only. */
  download?: boolean;
};

/** An app as the owner sees it: its listing, and what Control knows of it (ownerView). */
export type Product = Listing & { licensePrefix: string; imageRepo: string | null; published: boolean; sort: number };

/** The store's own details (Control: storeView). */
export type StoreDetails = {
  name: string | null;
  about: string | null;
  messenger: string | null;
  mobile: string | null;
  /** Control sends eligible free trials by itself (the owner's only: ownerStoreView). */
  autoTrial?: boolean;
  /** The store form gives a download link at once. */
  instantDownload?: boolean;
};

export type Alert = 'silent' | 'license_locked' | 'license_ending' | 'backup_old' | 'disk_low' | 'moved' | 'clone_suspected';

export type Installation = {
  id: string;
  product: { id: string; name: string };
  status: 'new' | 'active' | 'ignored';
  label: string | null;
  customer: string | null;
  /** The client account it belongs to (C1), if linked. */
  client: { id: string; name: string } | null;
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
  /** Control decided it by itself: a free trial sent, or refused as already used. */
  auto?: boolean;
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

/** A client account (C1; Control: src/routes/clients.ts). */
export type Client = {
  id: string;
  name: string;
  business: string | null;
  contactKind: 'messenger' | 'mobile' | 'email' | null;
  contact: string | null;
  note: string | null;
  status: 'active' | 'disabled';
  createdAt: string;
  lastSeenAt: string | null;
  installations: number;
  passkeys: number;
  inviteExpiresAt: string | null;
  unreadMessages: number;
  lastMessageAt: string | null;
};

export type ClientDetail = Client & {
  installationList: { id: string; product: { id: string; name: string }; label: string | null; installationId: string | null; lastSeenAt: string | null; status: string }[];
  passkeyList: { id: string; name: string; deviceType: string | null; createdAt: string; lastUsedAt: string | null }[];
};

/** An app's installer, uploaded once by the owner (Control: src/installers/routes.ts). */
export type Installer = { product: string; filename: string; size: number; sha256: string; uploadedAt: string };

/** A private download link for an installer (7 days, a few downloads). */
export type DownloadLink = {
  id: string;
  product: { id: string; name: string };
  clientId: string | null;
  inquiryId: string | null;
  label: string | null;
  createdAt: string;
  expiresAt: string;
  maxDownloads: number;
  downloads: number;
  lastDownloadAt: string | null;
  status: 'active' | 'used' | 'expired' | 'cancelled';
};

/** An installer a client can download from their own page. */
export type MyInstaller = { product: { id: string; name: string }; filename: string; size: number; sha256: string; uploadedAt: string };

/** One message between the owner and a client (C2). */
export type Message = { id: string; from: 'client' | 'owner'; body: string; createdAt: string; readAt: string | null };

/** What a client sees of their own installation (Control: src/clients/routes.ts). */
export type MyInstallation = {
  id: string;
  product: { id: string; name: string };
  label: string | null;
  installationId: string | null;
  lastSeenAt: string | null;
  version: string | null;
  license: { state: string; plan: string | null; expiresAt: string | null; daysLeft: number | null } | null;
  backup: { lastAt: string | null; count: number } | null;
  disk: { freeBytes: number; totalBytes: number } | null;
  alerts: Alert[];
  request: { id: string; status: LicenseRequest['status']; plan: string; createdAt: string } | null;
};

/** A client's own license request, with their key once approved. */
export type MyRequest = {
  id: string;
  installation: { id: string; label: string | null; installationId: string | null };
  product: { id: string; name: string };
  plan: 'trial' | 'monthly' | 'yearly';
  paymentReference: string | null;
  status: LicenseRequest['status'];
  note: string | null;
  licenseId: string | null;
  expiresAt: string | null;
  createdAt: string;
  decidedAt: string | null;
  deliveredAt: string | null;
  licenseKey: string | null;
};
