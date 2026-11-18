export const ago = (iso: string | null | undefined): string => {
  if (!iso) return 'never';
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 36) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
};

export const day = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export const gb = (bytes: number | null | undefined) => (bytes == null ? '—' : `${(bytes / 1024 ** 3).toFixed(1)} GB`);
export const mb = (bytes: number | null | undefined) => (bytes == null ? '—' : `${(bytes / 1024 ** 2).toFixed(0)} MB`);

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
