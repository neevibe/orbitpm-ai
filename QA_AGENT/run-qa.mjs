#!/usr/bin/env node
/**
 * OrbitPM AI — automated feature QA.
 *
 * Drives the app in headless Chromium (demo mode — no real credentials) and
 * verifies every major feature renders and behaves. Designed for the daily QA
 * agent, but runnable by anyone:
 *
 *   npm run build && node QA_AGENT/run-qa.mjs
 *
 * Env:
 *   QA_BASE_URL   — test an already-running app (default: starts `npm run start`)
 *   QA_CHROMIUM   — chromium binary (default /opt/pw-browsers/chromium, the
 *                   preinstalled browser in Claude Code cloud sessions)
 *   QA_LIVE_API   — set to a deployed origin (e.g. https://xyrenis-ai.vercel.app)
 *                   to also smoke-test the live API over HTTP
 *
 * Output: console summary + QA_AGENT/reports/qa-<date>.md, exit 1 on failures.
 */
import { chromium } from 'playwright-core';
import { spawn, execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROMIUM = process.env.QA_CHROMIUM || '/opt/pw-browsers/chromium';
const LIVE_API = process.env.QA_LIVE_API || '';

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '  ✅' : '  ❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

// ---------- boot the app (unless QA_BASE_URL points at a running one) ----------
let server = null;
let base = process.env.QA_BASE_URL || '';
if (!base) {
  base = 'http://localhost:3000';
  console.log('Starting production server (npm run start)…');
  server = spawn('npm', ['run', 'start'], { cwd: ROOT, stdio: 'ignore', detached: true });
  let up = false;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const res = await fetch(`${base}/login`);
      if (res.ok) { up = true; break; }
    } catch { /* not up yet */ }
  }
  if (!up) { console.error('Server did not come up on :3000'); process.exit(1); }
}
console.log(`Testing against ${base}\n`);

const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
// Demo mode: real UI, masked data, no credentials needed.
await ctx.addInitScript(() => sessionStorage.setItem('xyrenis_demo', 'true'));
const page = await ctx.newPage();

const pageErrors = [];
page.on('pageerror', err => pageErrors.push(err.message));

const visit = async (path, waitFor = 'main, .x-page, body') => {
  pageErrors.length = 0;
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector(waitFor, { timeout: 15000 });
  await page.waitForTimeout(800);
};

try {
  // ---------- auth surfaces (fresh context WITHOUT demo flag) ----------
  {
    const anonCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const anon = await anonCtx.newPage();
    await anon.goto(`${base}/login`, { waitUntil: 'networkidle' });
    check('Login page renders sign-in form', await anon.locator('text=Welcome back').count() > 0);
    await anon.click('text=Forgot password?');
    check('Forgot-password form reachable', await anon.locator('text=Send Reset Link').count() > 0);
    await anon.goto(`${base}/change-password`, { waitUntil: 'networkidle' });
    await anon.waitForTimeout(2500);
    const guidance = await anon.locator('text=Reset link expired or invalid').count();
    check('/change-password without session shows expired-link guidance', guidance > 0);
    await anonCtx.close();
  }

  // ---------- command center ----------
  await visit('/command-center', 'button.x-metric');
  check('Command Center loads without JS crashes', pageErrors.length === 0, pageErrors[0] || '');
  const kpis = await page.locator('button.x-metric').count();
  check('Command Center shows 6 KPI cards', kpis === 6, `found ${kpis}`);
  const charts = await page.locator('svg.recharts-surface').count();
  check('Command Center charts render', charts >= 2, `found ${charts} chart SVGs`);
  const truncated = await page.locator('svg .recharts-yAxis text', { hasText: '…' }).count();
  check('Department names not truncated', truncated === 0, truncated ? `${truncated} truncated labels` : '');
  const pastMilestones = await page.evaluate(() => {
    const card = [...document.querySelectorAll('h3')].find(h => h.textContent.includes('Upcoming Milestones'))?.closest('.x-card');
    if (!card) return -1;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return [...card.querySelectorAll('span.font-mono')].filter(s => {
      const d = new Date(s.textContent.replace(/(\d+) (\w+) (\d+)/, '$1 $2 20$3'));
      return !isNaN(d) && d < today;
    }).length;
  });
  check('Upcoming Milestones has no past dates', pastMilestones === 0, pastMilestones > 0 ? `${pastMilestones} past entries` : '');

  // print/PDF regression: KPI tiles + charts must survive print media
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(500);
  const printState = await page.evaluate(() => ({
    kpiVisible: [...document.querySelectorAll('button.x-metric')].filter(b => getComputedStyle(b).display !== 'none').length,
    chartBoxes: [...document.querySelectorAll('svg.recharts-surface')].filter(s => { const r = s.getBoundingClientRect(); return r.width > 10 && r.height > 10; }).length,
  }));
  check('PDF export keeps KPI cards visible', printState.kpiVisible === 6, `${printState.kpiVisible}/6 visible in print media`);
  check('PDF export keeps charts sized', printState.chartBoxes >= 2, `${printState.chartBoxes} charts with real size`);
  await page.emulateMedia({ media: 'screen' });

  // ---------- projects ----------
  await visit('/projects');
  check('Projects page loads without JS crashes', pageErrors.length === 0, pageErrors[0] || '');
  const rows = await page.locator('table tbody tr, [class*="group"]').count();
  check('Projects list shows project rows', rows > 0, `${rows} rows`);

  // project detail: no placeholder task list
  const firstRow = page.locator('tbody tr').first();
  if (await firstRow.count()) {
    await firstRow.click();
    await page.waitForTimeout(1500);
    if (page.url().includes('/projects/')) {
      const tasksTab = page.locator('button', { hasText: 'Tasks (List)' });
      if (await tasksTab.count()) {
        await tasksTab.click();
        await page.waitForTimeout(500);
        const fakeTask = await page.locator('text=Solution Architecture Design & Approval').count();
        check('Project detail has no placeholder task list', fakeTask === 0);
        check('Add Task button present', await page.locator('button', { hasText: 'Add Task' }).count() > 0);
      } else {
        check('Project detail tabs render', false, 'Tasks tab not found');
      }
    } else {
      check('Project row navigates to detail', false, `stayed on ${page.url()}`);
    }
  }

  // ---------- remaining feature pages just need to render crash-free ----------
  for (const path of ['/dashboard', '/departments', '/analytics', '/risks', '/workforce', '/reports', '/portfolio', '/dependencies']) {
    try {
      await visit(path);
      check(`${path} renders without JS crashes`, pageErrors.length === 0, pageErrors[0] || '');
    } catch (e) {
      check(`${path} renders without JS crashes`, false, e.message.slice(0, 120));
    }
  }

  // ---------- live API smoke (optional) ----------
  if (LIVE_API) {
    try {
      const out = execSync(`curl -sS --max-time 30 --cacert /root/.ccr/ca-bundle.crt "${LIVE_API}/api/projects" | head -c 200000`, { encoding: 'utf8' });
      const j = JSON.parse(out);
      check('Live API /api/projects returns projects', Array.isArray(j.projects) && j.projects.length > 0, `${j.projects?.length ?? 0} projects`);
    } catch (e) {
      check('Live API /api/projects returns projects', false, e.message.slice(0, 120));
    }
    try {
      const code = execSync(`curl -sS -o /dev/null -w "%{http_code}" --max-time 30 --cacert /root/.ccr/ca-bundle.crt -X POST -H 'Content-Type: application/json' -d '{"to":"not-an-email","taskName":"x"}' "${LIVE_API}/api/notify-task"`, { encoding: 'utf8' }).trim();
      check('Live API /api/notify-task validates email', code === '400', `HTTP ${code}`);
    } catch (e) {
      check('Live API /api/notify-task validates email', false, e.message.slice(0, 120));
    }
  }
} finally {
  await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

// ---------- report ----------
const passed = results.filter(r => r.ok).length;
const failed = results.length - passed;
const date = new Date().toISOString().slice(0, 10);
const md = [
  `# QA Report — ${date}`,
  '',
  `**${passed}/${results.length} checks passed**${failed ? ` — ⚠️ ${failed} FAILED` : ' — all green ✅'}`,
  '',
  ...results.map(r => `- ${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`),
  '',
].join('\n');
mkdirSync(join(ROOT, 'QA_AGENT/reports'), { recursive: true });
writeFileSync(join(ROOT, `QA_AGENT/reports/qa-${date}.md`), md);
console.log(`\n${passed}/${results.length} passed${failed ? ` — ${failed} FAILED` : ''}. Report: QA_AGENT/reports/qa-${date}.md`);
process.exit(failed ? 1 : 0);
