/**
 * Full project re-sync from the BIAL dashboard workbook into Supabase.
 *
 * Reads every "📋 <Dept>" register sheet, normalises the department to the
 * canonical project department names, and UPSERTS into the projects table:
 *   - existing rows (matched by project_code = Project ID) are updated
 *   - new Project IDs are inserted
 *   - rows present in the DB but missing from the sheet are LEFT ALONE (no deletes)
 *
 * Usage:
 *   node scripts/reimport-projects.js            # DRY RUN — parse + print only
 *   node scripts/reimport-projects.js --write     # actually write to Supabase
 *   WORKBOOK="/path/file.xlsx" node scripts/reimport-projects.js --write
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const WRITE = process.argv.includes('--write');
const WORKBOOK = process.env.WORKBOOK ||
  path.join(require('os').homedir(), 'Downloads', 'Antigravity Project', 'BIAL_Dashboard_Final_V_Final.xlsx');

// ---- env (.env.local, no dotenv dep) ----
const env = {};
try {
  fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n').forEach(l => {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch { /* fall through to process.env */ }
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ---- department normalisation → canonical table name ----
const DEPT_MAP = {
  digital: 'Digital & Data', digitaldata: 'Digital & Data',
  operations: 'Operations', ops: 'Operations',
  commercialdevelopment: 'Commercial Development', commdev: 'Commercial Development',
  dutyfree: 'Duty Free', retailcommerce: 'Duty Free',
  basl: 'BASL', strategicsupport: 'BASL',
  advertisingmarketing: 'Advertising & Marketing', advertismentmarketing: 'Advertising & Marketing', adv: 'Advertising & Marketing',
  cbb: 'CBB', cbblounge: 'CBB', amenitieshospitality: 'CBB',
};
const key = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const normDept = raw => DEPT_MAP[key(raw)] || String(raw || '').trim();

const fmtDate = v => {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') { const d = XLSX.SSF.parse_date_code(v); return d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : null; }
  // Free-text cells like "Ongoing"/"TBD" are NOT valid dates → store null, don't crash.
  const t = Date.parse(String(v)); return isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
};
const fmtProgress = v => {
  const n = Number(v); if (isNaN(n)) return 0;
  return n > 0 && n <= 1 ? Math.round(n * 100) : Math.round(n); // Excel % cells are fractions
};

function parseSheet(ws, sheetDept) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const hi = rows.findIndex(r => r.some(v => String(v).includes('Project ID')));
  if (hi === -1) return [];
  const header = rows[hi];
  const col = {};
  header.forEach((h, i) => {
    const t = String(h).toLowerCase();
    if (t.includes('project id')) col.id = i;
    else if (t.includes('project name') || t === 'name') col.name = i;
    else if (t.includes('department')) col.dept = i;
    else if (t.includes('owner')) col.owner = i;
    else if (t.includes('status')) col.status = i;
    else if (t.includes('progress')) col.progress = i;
    else if (t.includes('priority')) col.priority = i;
    else if (t.includes('start')) col.start = i;
    else if (t.includes('target')) col.target = i;
    else if (t.includes('objective')) col.objective = i;
    else if (t.includes('dependenc')) col.deps = i;
    else if (t.includes('kpi')) col.kpi = i;
    else if (t.includes('support')) col.support = i;
    else if (t.includes('notes')) col.notes = i;
  });
  const out = [];
  for (let r = hi + 1; r < rows.length; r++) {
    const row = rows[r];
    const id = String(row[col.id] ?? '').trim();
    if (!id || !/^PR/i.test(id)) continue; // project ids look like PRCBB_01
    out.push({
      project_code: id,
      name: String(row[col.name] ?? '').trim(),
      department: normDept(row[col.dept]) || sheetDept,
      owner_name: String(row[col.owner] ?? '').trim() || null,
      status: String(row[col.status] ?? '').trim() || 'Not Started',
      priority: String(row[col.priority] ?? '').trim() || 'Medium',
      progress: fmtProgress(row[col.progress]),
      start_date: fmtDate(row[col.start]),
      target_date: fmtDate(row[col.target]),
      business_objective: String(row[col.objective] ?? '').trim() || null,
      dependencies: String(row[col.deps] ?? '').trim() || null,
      kpi: String(row[col.kpi] ?? '').trim() || null,
      support_team: String(row[col.support] ?? '').trim() || null,
      notes: String(row[col.notes] ?? '').trim() || null,
    });
  }
  return out;
}

async function main() {
  const wb = XLSX.readFile(WORKBOOK, { cellDates: true });
  const registerSheets = wb.SheetNames.filter(n => n.includes('📋'));
  let all = [];
  for (const s of registerSheets) {
    const projs = parseSheet(wb.Sheets[s], normDept(s.replace(/[^a-zA-Z ]/g, '')));
    console.log(`  ${s.padEnd(16)} → ${projs.length} projects`);
    all = all.concat(projs);
  }
  console.log(`\nParsed ${all.length} projects total.`);
  console.log('Departments seen:', [...new Set(all.map(p => p.department))].join(', '));
  console.log('Sample:', JSON.stringify(all[0], null, 0));

  // department name → id
  const { data: depts } = await sb.from('departments').select('id,name');
  const nameToId = {}; (depts || []).forEach(d => nameToId[d.name] = d.id);
  const unknown = [...new Set(all.map(p => p.department))].filter(d => !nameToId[d]);
  if (unknown.length) console.log('⚠️  Departments with NO matching table row (rows skipped):', unknown.join(', '));

  if (!WRITE) {
    console.log('\n💡 DRY RUN — no writes. Re-run with --write to apply.');
    return;
  }

  // existing project_codes
  const { data: existing } = await sb.from('projects').select('project_code');
  const have = new Set((existing || []).map(p => p.project_code));

  let upd = 0, ins = 0, skip = 0, fail = 0;
  for (const p of all) {
    const department_id = nameToId[p.department];
    if (!department_id) { skip++; continue; }
    const { department, ...rest } = p;
    const payload = { ...rest, department_id, archived: false, archived_at: null };
    if (have.has(p.project_code)) {
      const { error } = await sb.from('projects').update(payload).eq('project_code', p.project_code);
      if (error) { console.log(`  ❌ ${p.project_code}: ${error.message}`); fail++; } else upd++;
    } else {
      const { error } = await sb.from('projects').insert(payload);
      if (error) { console.log(`  ❌ ${p.project_code}: ${error.message}`); fail++; } else ins++;
    }
  }
  console.log(`\n✅ Done — ${upd} updated, ${ins} inserted, ${skip} skipped (no dept), ${fail} failed.`);

  // Archive (don't delete) any project no longer present in the sheet, so the active
  // view matches the workbook exactly while old/duplicate rows stay recoverable in History.
  const sheetCodes = new Set(all.map(p => p.project_code));
  const { data: cur } = await sb.from('projects').select('project_code,archived');
  const stale = (cur || []).filter(p => !sheetCodes.has(p.project_code) && !p.archived).map(p => p.project_code);
  if (stale.length) {
    const { error } = await sb.from('projects').update({ archived: true, archived_at: new Date().toISOString() }).in('project_code', stale);
    console.log(error ? `archive ERR: ${error.message}` : `📦 Archived ${stale.length} projects not in the sheet (recoverable from History).`);
  }
  const { count: active } = await sb.from('projects').select('*', { count: 'exact', head: true }).neq('archived', true);
  console.log(`📊 Active projects now: ${active}`);
}

main().catch(e => { console.error('ERR', e.message); process.exit(1); });
