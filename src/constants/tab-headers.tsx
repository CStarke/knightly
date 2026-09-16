import type { ReactNode } from 'react';

import { KnightlyHeaderRight } from '@/components/knightly-header-right';

export type TabHeaderInfo = {
  title: string;
  subtitle: string;
  right?: ReactNode;
};

export function getTabHeader(tabNameOrPath: string): TabHeaderInfo {
  const normalized = tabNameOrPath
    .replace(/^\/(\(tabs\)|tabs)?\/?/, '')
    .replace(/\/+$/, '')
    .toLowerCase();

  switch (normalized) {
    case 'dining':
      return {
        title: 'Dining',
        subtitle: 'Campus dining & balances',
      };
    case 'safety':
      return {
        title: 'Campus Safety',
        subtitle: '24/7 assistance & alerts',
      };
    case 'directory':
      return {
        title: 'Directory',
        subtitle: 'Search campus contacts',
      };
    case 'knightly':
    case 'index':
    case '':
    default:
      return {
        title: 'Knightly',
        subtitle: 'Campus community & feed',
        right: <KnightlyHeaderRight />,
      };
  }
}
