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
  // Build FIRST. This suite used to drive whatever happened to be in .next, so
  // an edited source file could report green without ever being executed —
  // the most dangerous kind of passing test.
  console.log('Building (so the suite tests the current source)…');
  execSync('npx next build', { cwd: ROOT, stdio: 'ignore' });
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
  // v4 composition: the six equal KPI cards became one metric rail (a lead
  // figure plus five hairline-divided cells), and two of the three Recharts
  // widgets became CSS part-to-whole meters, which is why these selectors
  // changed. The assertions test the same intent against the new markup.
  await visit('/command-center', '.x-rail-item');
  check('Command Center loads without JS crashes', pageErrors.length === 0, pageErrors[0] || '');
  const kpis = await page.locator('.x-rail-item').count();
  check('Command Center shows 6 portfolio metrics', kpis === 6, `found ${kpis}`);
  const charts = await page.locator('svg.recharts-surface').count();
  const meters = await page.locator('.x-meter').count();
  check('Command Center charts render', charts >= 1 && meters >= 2, `${charts} chart SVGs, ${meters} meters`);
  check('Executive briefing renders a lead judgement', await page.locator('.x-brief-lead').count() === 1);
  check('Attention register renders', await page.locator('.x-attn tbody tr').count() > 0);

  // Register integrity: the sidebar count comes from `kpi` (canonical rows) and
  // the KPI card from the page's own project list. When the context served the
  // mirrored list as `projects`, cross-department dependency mirrors — read-only
  // shadows of a project that is already counted — inflated the card, so the same
  // screen showed 203 against the sidebar's 200. One project, one count.
  const sidebarCount = await page.locator('text=/^\\d+ projects$/').first().textContent().catch(() => null);
  const kpiTotal = await page.locator('.x-rail-item').first().textContent().catch(() => null);
  const sidebarN = sidebarCount ? parseInt(sidebarCount.replace(/\D/g, ''), 10) : NaN;
  const kpiN = kpiTotal ? parseInt((kpiTotal.match(/\d[\d,]*/) || [''])[0].replace(/,/g, ''), 10) : NaN;
  check(
    'Sidebar and KPI project totals agree (mirrors not double-counted)',
    Number.isFinite(sidebarN) && Number.isFinite(kpiN) && sidebarN === kpiN,
    Number.isFinite(sidebarN) && Number.isFinite(kpiN)
      ? (sidebarN === kpiN ? `both ${kpiN}` : `sidebar ${sidebarN} vs KPI ${kpiN}`)
      : `could not read counts (sidebar=${sidebarCount}, kpi=${kpiTotal})`,
  );

  // A dependency mirror shares its parent's id. Two entries with the same id in
  // one counted list is the double-count, restated as an invariant.
  // The attention register is always rendered in v4 (it is no longer gated
  // behind an active filter), so no click is needed to reach the rows.
  await page.waitForSelector('[data-project-code]', { timeout: 8000 }).catch(() => {});
  const codeAudit = await page.evaluate(() => {
    const codes = [...document.querySelectorAll('[data-project-code]')].map(e => e.getAttribute('data-project-code'));
    const seen = new Set(); const dupes = new Set();
    codes.forEach(c => { if (seen.has(c)) dupes.add(c); seen.add(c); });
    return { total: codes.length, dupes: dupes.size };
  }).catch(() => ({ total: 0, dupes: 0 }));
  // Guard against a vacuous pass: if the selector matches nothing the check is
  // meaningless, so treat "found none" as a failure rather than silent green.
  check(
    'No duplicate project codes in the counted view',
    codeAudit.total > 0 && codeAudit.dupes === 0,
    codeAudit.total === 0
      ? 'no [data-project-code] elements found — check is not instrumented'
      : codeAudit.dupes ? `${codeAudit.dupes} duplicated of ${codeAudit.total}` : `${codeAudit.total} unique`,
  );
  // Department names moved out of a Recharts Y axis into HTML rows, so the
  // truncation risk is now CSS ellipsis rather than SVG label clipping.
  const deptClip = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('[aria-pressed]')]
      .map(b => b.querySelector('span.truncate'))
      .filter(Boolean);
    return { total: rows.length, clipped: rows.filter(el => el.scrollWidth > el.clientWidth + 1).length };
  }).catch(() => ({ total: 0, clipped: 0 }));
  check('Department names not truncated', deptClip.clipped === 0,
    deptClip.clipped ? `${deptClip.clipped} of ${deptClip.total} clipped` : `${deptClip.total} labels full`);
  // v4 renders milestones as relative time ("in 19d" / "today"), so a past
  // entry would surface as a negative day count rather than a stale date.
  const pastMilestones = await page.evaluate(() => {
    const head = [...document.querySelectorAll('h3')].find(h => /upcoming milestones/i.test(h.textContent || ''));
    const list = head?.parentElement?.querySelector('ul');
    if (!list) return -1;
    return [...list.querySelectorAll('li')].filter(li => /-\d+\s*d/.test(li.textContent || '')).length;
  });
  check('Upcoming Milestones has no past dates', pastMilestones === 0, pastMilestones > 0 ? `${pastMilestones} past entries` : '');

  // print/PDF regression: KPI tiles + charts must survive print media
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(500);
  const printState = await page.evaluate(() => ({
    kpiVisible: [...document.querySelectorAll('.x-rail-item')].filter(b => getComputedStyle(b).display !== 'none').length,
    chartBoxes: [...document.querySelectorAll('svg.recharts-surface')].filter(s => { const r = s.getBoundingClientRect(); return r.width > 10 && r.height > 10; }).length,
  }));
  check('PDF export keeps portfolio metrics visible', printState.kpiVisible === 6, `${printState.kpiVisible}/6 visible in print media`);
  check('PDF export keeps charts sized', printState.chartBoxes >= 1, `${printState.chartBoxes} charts with real size`);
  await page.emulateMedia({ media: 'screen' });

  // ---------- Xyro AI assistant (floating mascot + docked panel) ----------
  {
    const launcher = await page.locator('button[title^="Ask Xyro"]').count();
    check('Xyro launcher present in topbar', launcher === 1);
    const floating = await page.locator('button[title="Xyro"]').count();
    check('Floating Xyro mascot present', floating === 1);
    if (launcher) {
      await page.click('button[title^="Ask Xyro"]');
      await page.waitForTimeout(500);
      check('Assistant panel opens with welcome', await page.locator('text=your AI assistant').count() > 0);
      check('Floating mascot hides while panel is open', await page.locator('button[title="Xyro"]').count() === 0);
      await page.fill('input[placeholder*="Ask me"]', 'how do I export a pdf report');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(700);
      check('Assistant answers how-to questions', await page.locator('text=Export PDF').count() > 0);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
    // rocket-minimize: hover the mascot, click the minimize chip, mascot vanishes…
    if (await page.locator('button[title="Xyro"]').count()) {
      await page.hover('button[title="Xyro"]', { force: true });
      await page.click('button[title="Minimize Xyro"]', { force: true });
      await page.waitForTimeout(2300); // spiral rocket animation runs ~1.8s
      check('Minimize rockets Xyro away', await page.locator('button[title="Xyro"]').count() === 0);
      // …and "Ask Xyro" summons him back (opens panel + restores mascot)
      await page.click('button[title^="Ask Xyro"]');
      await page.waitForTimeout(400);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      check('Ask Xyro summons the mascot back', await page.locator('button[title="Xyro"]').count() === 1);
    }
  }

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
  for (const path of ['/dashboard', '/my-work', '/departments', '/analytics', '/risks', '/workforce', '/reports', '/portfolio', '/dependencies']) {
    try {
      await visit(path);
      check(`${path} renders without JS crashes`, pageErrors.length === 0, pageErrors[0] || '');
    } catch (e) {
      check(`${path} renders without JS crashes`, false, e.message.slice(0, 120));
    }
  }

  // ---------- live API smoke (optional) ----------
  // Phase 0 security regression tests: every data-bearing endpoint must
  // REJECT unauthenticated callers. If any of these starts returning data
  // again, the register is exposed to the public internet.
  if (LIVE_API) {
    for (const [name, method, path, body, allowed] of [
      ['GET /api/projects', 'GET', '/api/projects', null],
      ['POST /api/projects', 'POST', '/api/projects', '{"action":"update","project":{"id":"x"}}'],
      ['POST /api/ai-chat', 'POST', '/api/ai-chat', '{"messages":[{"role":"user","content":"hi"}]}'],
      ['POST /api/notify-task', 'POST', '/api/notify-task', '{"to":"a@b.co","taskName":"x"}'],
      ['POST /api/export', 'POST', '/api/export', '{"projects":[],"risks":[],"departments":[]}'],
      ['POST /api/admin/update-user-role', 'POST', '/api/admin/update-user-role', '{"userId":"x","permission":"admin"}'],
      ['GET /api/activity', 'GET', '/api/activity', null],
      ['POST /api/integrations/teams-alerts', 'POST', '/api/integrations/teams-alerts', '{"action":"save","url":"https://x.webhook.office.com/y"}'],
      ['GET /api/admin/data-sanity', 'GET', '/api/admin/data-sanity', null],
      ['POST /api/admin/data-sanity', 'POST', '/api/admin/data-sanity', '{"action":"fix_owners"}'],
      // qa-report: 503 pre-config, 401 once QA_REPORT_SECRET exists — never 2xx without the secret
      ['POST /api/qa-report (no secret)', 'POST', '/api/qa-report', '{"report":"x"}', ['401', '403', '503']],
    ]) {
      try {
        const dataArg = body ? `-X ${method} -H 'Content-Type: application/json' -d '${body}'` : '';
        const code = execSync(`curl -sS -o /dev/null -w "%{http_code}" --max-time 30 --cacert /root/.ccr/ca-bundle.crt ${dataArg} "${LIVE_API}${path}"`, { encoding: 'utf8' }).trim();
        const okCodes = allowed || ['401', '403'];
        check(`Unauthenticated ${name} is rejected`, okCodes.includes(code), `HTTP ${code}`);
      } catch (e) {
        check(`Unauthenticated ${name} is rejected`, false, e.message.slice(0, 120));
      }
    }
  }
} finally {
  await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}


// ---------- department scoping & register-integrity (pure logic) ----------
// These run OUTSIDE the browser on purpose. The browser suite signs in as the
// demo account, which is permission:'admin' — and admins short-circuit every
// department check (`if (isAdmin) return true`). So no browser test can ever
// exercise department scoping, which is exactly how the "can't edit projects in
// my own department" bug reached production.
console.log('\n→ Department scoping (pure logic)');
{
  const outDir = join(ROOT, 'QA_AGENT/.tmp');
  try {
    // dept-key.ts is dependency-free so it compiles and imports standalone.
    execSync(
      `npx tsc ${join(ROOT, 'src/lib/dept-key.ts')} --outDir ${outDir} --module es2020 --target es2020 --moduleResolution bundler`,
      { cwd: ROOT, stdio: 'pipe' },
    );
    const { deptKey, sameDept, deptDisplayName } = await import(join(outDir, 'dept-key.js'));

    // Auth claims carry the admin UI's SHORT names; project rows carry the
    // workbook's LONG names. A user must be able to edit their own department.
    const mustMatch = [
      ['Digital', 'Digital & Data'],
      ['Commercial', 'Commercial Development'],
      ['Advertising', 'Advertising & Marketing'],
      ['Duty Free', 'DutyFree'],
      ['Operations', 'operations'],
      ['CBB', 'BASL'],
      ['Amenities', 'BASL'],
    ];
    for (const [claim, row] of mustMatch) {
      check(`Claim "${claim}" can edit a "${row}" project`, sameDept(claim, row),
        sameDept(claim, row) ? '' : `deptKey mismatch: ${deptKey(claim)} vs ${deptKey(row)}`);
    }

    // ...and must NOT leak into someone else's department.
    const mustDiffer = [
      ['Operations', 'Digital & Data'],
      ['Duty Free', 'Commercial Development'],
      ['Digital', 'Advertising & Marketing'],
    ];
    for (const [claim, row] of mustDiffer) {
      check(`Claim "${claim}" cannot edit a "${row}" project`, !sameDept(claim, row));
    }

    // The display variant must agree with the comparison key, or the UI groups
    // rows under a heading the permission check disagrees with.
    const displayAgrees = ['Digital', 'CBB', 'Advertising', 'Duty Free', 'Commercial']
      .every(d => deptKey(deptDisplayName(d)) === deptKey(d));
    check('Display name and comparison key agree', displayAgrees);
  } catch (e) {
    check('Department scoping checks ran', false, String(e.message || e).slice(0, 160));
  }
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
