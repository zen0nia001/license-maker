// Control Center's own line icons: drawn for this app on a 24 px grid, one stroke weight, round ends.
import React from 'react';

type Shape = React.ReactElement;
const p = (d: string): Shape => <path d={d} />;
const c = (cx: number, cy: number, r: number): Shape => <circle cx={cx} cy={cy} r={r} />;
const r = (x: number, y: number, w: number, h: number, rx: number): Shape => <rect x={x} y={y} width={w} height={h} rx={rx} />;

const ICONS = {
  home: [p('M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19z')],
  dashboard: [p('M5 20v-8'), p('M10 20V5'), p('M15 20v-6'), p('M20 20V9')],
  clients: [c(9, 8.5, 3.2), p('M3.5 19.5a5.5 5.5 0 0 1 11 0'), c(17, 9.5, 2.4), p('M15.8 14.4a4.5 4.5 0 0 1 4.9 5.1')],
  apps: [r(4, 4, 6.5, 6.5, 2), r(13.5, 4, 6.5, 6.5, 3.25), r(4, 13.5, 6.5, 6.5, 3.25), r(13.5, 13.5, 6.5, 6.5, 2)],
  inbox: [p('M4 13.5 6.6 6h10.8l2.6 7.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z'), p('M4 13.5h4.4l1.4 2.3h4.4l1.4-2.3H20')],
  store: [p('M4.5 9 6 4.5h12L19.5 9'), p('M4.5 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0'), p('M5.5 11.5V20h13v-8.5'), p('M10 20v-4.5h4V20')],
  key: [c(8, 15.5, 3.8), p('M10.8 12.7 19 4.5'), p('M15.5 8l2.2 2.2'), p('M13.3 10.2l1.8 1.8')],
  shield: [p('M12 3.5 18.5 6v5.6c0 4-2.7 7.3-6.5 8.9-3.8-1.6-6.5-4.9-6.5-8.9V6z'), p('M9.2 12.2l2 2 3.8-4')],
  settings: [p('M4 7.5h8.5'), p('M17.5 7.5H20'), c(15, 7.5, 2.4), p('M4 16.5h2.5'), p('M11.5 16.5H20'), c(9, 16.5, 2.4)],
  locked: [r(5, 10.5, 14, 9.5, 2.5), p('M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5'), p('M12 14.5v2')],
  unlocked: [r(5, 10.5, 14, 9.5, 2.5), p('M8.5 10.5V8a3.5 3.5 0 0 1 6.6-1.6'), p('M12 14.5v2')],
  menu: [p('M4 7h16'), p('M4 12h16'), p('M4 17h10')],
  open: [p('M8 16 16 8'), p('M9.5 8H16v6.5')],
  plus: [p('M12 5.5v13'), p('M5.5 12h13')],
  left: [p('M14.5 6 8.5 12l6 6')],
  right: [p('M9.5 6l6 6-6 6')],
  close: [p('M6.5 6.5l11 11'), p('M17.5 6.5l-11 11')],
  check: [c(12, 12, 8.5), p('M8.3 12.4l2.5 2.5 5-5.3')],
  alert: [c(12, 12, 8.5), p('M12 7.8v5'), p('M12 16.2v.01')],
  search: [c(11, 11, 6), p('M15.5 15.5 20 20')],
  rail: [r(4, 5, 16, 14, 3), p('M9.5 5v14')],
  user: [c(12, 9, 3.6), p('M5.5 20a6.5 6.5 0 0 1 13 0')],
  spark: [p('M12 3.5l1.9 5.2 5.1 1.9-5.1 1.9-1.9 5.2-1.9-5.2-5.1-1.9 5.1-1.9z'), p('M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z')],
} satisfies Record<string, Shape[]>;

export type IconName = keyof typeof ICONS;

export const Icon: React.FC<{ name: IconName; size?: number; className?: string; title?: string }> = ({ name, size = 20, className, title }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" className={className} style={{ flex: 'none' }}
    fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}
  >
    {title && <title>{title}</title>}
    {ICONS[name].map((shape, i) => React.cloneElement(shape, { key: i }))}
  </svg>
);

/** The mark's shapes (24 px grid, filled): a shop's awning over two app tiles, "apps for your shop". The app icons
 *  (public/icon-*.png) are drawn from the same shapes. */
export const MARK_PATHS = [
  'M5 3.5h14a1 1 0 0 1 .9.57L21 8a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0l1.1-3.93A1 1 0 0 1 5 3.5z',
  'M5.85 12.5h3.3a1.6 1.6 0 0 1 1.6 1.6v4.3a1.6 1.6 0 0 1-1.6 1.6h-3.3a1.6 1.6 0 0 1-1.6-1.6v-4.3a1.6 1.6 0 0 1 1.6-1.6z',
  'M14.85 12.5h3.3a1.6 1.6 0 0 1 1.6 1.6v4.3a1.6 1.6 0 0 1-1.6 1.6h-3.3a1.6 1.6 0 0 1-1.6-1.6v-4.3a1.6 1.6 0 0 1 1.6-1.6z',
];

/** The mark on its tile (ink on light, light on dark). */
export const Logo: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <span className="logo" style={{ width: size, height: size, borderRadius: size * 0.3 }} aria-hidden="true">
    <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 24 24" fill="currentColor" style={{ flex: 'none' }}>
      {MARK_PATHS.map((d) => <path key={d} d={d} />)}
    </svg>
  </span>
);
