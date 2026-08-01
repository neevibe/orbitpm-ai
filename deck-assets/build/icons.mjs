// Render a set of Feather (react-icons/fi) glyphs to PNG at chosen colors.
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import sharp from 'sharp';
import * as Fi from 'react-icons/fi';
import { mkdirSync } from 'node:fs';

const OUT = '/home/user/orbitpm-ai/deck-assets/icons';
mkdirSync(OUT, { recursive: true });

// icon name → Feather component
const SET = {
  grid: Fi.FiGrid, briefcase: Fi.FiBriefcase, layout: Fi.FiLayout, columns: Fi.FiColumns,
  bar: Fi.FiBarChart2, git: Fi.FiGitBranch, alert: Fi.FiAlertTriangle, users: Fi.FiUsers,
  pie: Fi.FiPieChart, shield: Fi.FiShield, cpu: Fi.FiCpu, zap: Fi.FiZap, check: Fi.FiCheckCircle,
  trending: Fi.FiTrendingUp, target: Fi.FiTarget, dollar: Fi.FiDollarSign, clock: Fi.FiClock,
  eye: Fi.FiEye, layers: Fi.FiLayers, arrow: Fi.FiArrowRight, calendar: Fi.FiCalendar,
  bell: Fi.FiBell, search: Fi.FiSearch, database: Fi.FiDatabase, message: Fi.FiMessageSquare,
  compass: Fi.FiCompass, flag: Fi.FiFlag, x: Fi.FiX, settings: Fi.FiSettings, star: Fi.FiStar,
  activity: Fi.FiActivity, folder: Fi.FiFolder, sliders: Fi.FiSliders,
};

const COLORS = { white: 'FFFFFF', navy: '0F2350', accent: '2563EB', slate: '64748B', emerald: '059669', amber: 'D97706', red: 'DC2626', violet: '7C3AED', teal: '0891B2' };

async function render(name, Comp, colorName, hex) {
  const svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Comp, { color: `#${hex}`, size: 256, strokeWidth: 2 })
  );
  await sharp(Buffer.from(svg)).resize(256, 256).png().toFile(`${OUT}/${name}-${colorName}.png`);
}

for (const [name, Comp] of Object.entries(SET)) {
  for (const [cname, hex] of Object.entries(COLORS)) {
    await render(name, Comp, cname, hex);
  }
}
console.log('icons done');
