import React from 'react';
import { lookOf } from '../lib/apps';
import type { Listing } from '../lib/control/types';

/** An app's icon tile: its emoji (or first letter) on its colour. */
export const AppIcon: React.FC<{ app: Listing; size?: number }> = ({ app, size = 56 }) => {
  const look = lookOf(app);
  return (
    <div className="app-icon" style={{ background: look.color, width: size, height: size, fontSize: size * 0.54, borderRadius: size / 4, flex: 'none' }} aria-hidden="true">
      {look.icon}
    </div>
  );
};
