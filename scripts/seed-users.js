/**
 * Bulk-create / update all BIAL employees in Supabase Auth — now reads the
 * Employee List spreadsheet directly so each user gets their DEPARTMENT.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/seed-users.js
 *   SUPABASE_SERVICE_ROLE_KEY=<key> EMPLOYEE_FILE="/path/to/Employee List.xlsx" node scripts/seed-users.js
 *
 * Spreadsheet must have columns (case-insensitive, flexible names):
 *   - EMPLOYEECODE / "Employee Code" / "Emp Code" / ID
 *   - EMPLOYEENAME / "Employee Name" / Name
 *   - DEPARTMENT  / Dept            (CCO members become super admins)
 *
 * Access model applied:
 *   - Department "CCO"      -> role "cco"   (super admin: add/edit ALL departments)
 *   - Everyone else         -> role "user"  (add/edit ONLY their own department; read all)
 *   - Neeraj Prakash        -> admin, custom email + password, no forced change
 *   - All others            -> password = Employee Code, must_change_password = true
 */

const path = require('path');
const os = require('os');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rfvhvpeqvuwrjcszyhbb.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMPLOYEE_FILE = process.env.EMPLOYEE_FILE || path.join(os.homedir(), 'Downloads', 'Employee List.xlsx');
const EMAIL_DOMAIN = 'xyrenis.com';

// Normalise the spreadsheet's department labels to the canonical names used on
// projects (so department-scoped permissions actually match). Keys are lowercased
// + stripped of non-alphanumerics for robust matching.
const CANONICAL_DEPARTMENTS = [
  'Operations', 'Digital & Data', 'Retail & Commerce', 'Commercial Development',
  'Strategic Support', 'Advertising & Marketing', 'Amenities & Hospitality',
];
const DEPARTMENT_MAP = {
  digital: 'Digital & Data',
  digitaldata: 'Digital & Data',
  operations: 'Operations',
  dutyfree: 'Retail & Commerce',
  commercialdevelopment: 'Commercial Development',
  basl: 'Strategic Support',
  advertismentmarketing: 'Advertising & Marketing',
  advertisingmarketing: 'Advertising & Marketing',
  ccb: 'Amenities & Hospitality',
  cbb: 'Amenities & Hospitality',
  cbblounge: 'Amenities & Hospitality',
  cco: 'CCO', // super-admin marker (not a project department)
};
function normaliseDept(raw) {
  if (!raw) return '';
  const key = String(raw).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (DEPARTMENT_MAP[key]) return DEPARTMENT_MAP[key];
  // already canonical?
  const exact = CANONICAL_DEPARTMENTS.find(d => d.toLowerCase().replace(/[^a-z0-9]/g, '') === key);
  return exact || String(raw).trim();
}

// Neeraj — explicit admin, custom email + password, not forced to change.
const ADMIN_CODE = '102754';
const ADMIN = {
  email: 'neeraj.p@xyrenis.com',
  password: 'Dataleader@123',
  role: 'admin',
  must_change_password: false,
};

if (!SERVICE_ROLE_KEY) {
  console.error('❌  Set SUPABASE_SERVICE_ROLE_KEY first:');
  console.error('    SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/seed-users.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/* ---------- read + normalise the spreadsheet ---------- */
function pick(row, keys) {
  const lowerMap = {};
  Object.keys(row).forEach(k => (lowerMap[k.toLowerCase().replace(/[^a-z]/g, '')] = row[k]));
  for (const k of keys) {
    const v = lowerMap[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function loadEmployees() {
  let wb;
  try {
    wb = XLSX.readFile(EMPLOYEE_FILE);
  } catch {
    console.error(`❌  Could not read employee file at:\n    ${EMPLOYEE_FILE}`);
    console.error(`    Pass EMPLOYEE_FILE="/full/path/Employee List.xlsx" to override.`);
    process.exit(1);
  }
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);
  const employees = rows
    .map(r => ({
      code: pick(r, ['employeecode', 'empcode', 'code', 'id', 'employeeid']),
      name: pick(r, ['employeename', 'empname', 'name', 'fullname']),
      department: normaliseDept(pick(r, ['department', 'dept', 'departmentname'])),
    }))
    .filter(e => e.code && e.name);
  return employees;
}

/* ---------- upsert one user ---------- */
async function upsertUser(email, password, metadata) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const existing = list?.users?.find(u => u.email === email);
      if (existing) {
        await supabase.auth.admin.updateUserById(existing.id, { password, user_metadata: metadata });
        return 'updated';
      }
    }
    return `error: ${error.message}`;
  }
  return 'created';
}

/* ---------- main ---------- */
async function main() {
  const employees = loadEmployees();
  if (!employees.length) {
    console.error('❌  No employees parsed. Check the column headers in the spreadsheet.');
    process.exit(1);
  }

  const depts = [...new Set(employees.map(e => e.department).filter(Boolean))];
  console.log(`\n🚀  Seeding ${employees.length} users from:\n    ${EMPLOYEE_FILE}`);
  console.log(`    Departments found: ${depts.join(', ') || '(none — check the column!)'}\n`);

  let ok = 0, fail = 0;
  const missingDept = [];

  for (const emp of employees) {
    const isAdmin = String(emp.code) === ADMIN_CODE;
    const isCCO = emp.department.trim().toLowerCase() === 'cco';

    const email = isAdmin ? ADMIN.email : `${emp.code}@${EMAIL_DOMAIN}`;
    const password = isAdmin ? ADMIN.password : String(emp.code);
    const role = isAdmin ? ADMIN.role : isCCO ? 'cco' : 'user';
    const mustChange = isAdmin ? ADMIN.must_change_password : true;

    if (!emp.department) missingDept.push(emp.code);

    const tag = role === 'admin' ? 'ADMIN' : role === 'cco' ? 'CCO  ' : 'user ';
    process.stdout.write(`  [${tag}] ${String(emp.code).padEnd(7)} ${emp.name.padEnd(32)} ${(emp.department || '—').padEnd(22)} `);

    const result = await upsertUser(email, password, {
      employee_code: String(emp.code),
      full_name: emp.name,
      department: emp.department || null,
      role,
      must_change_password: mustChange,
    });

    if (result.startsWith('error')) { console.log(`❌ ${result}`); fail++; }
    else { console.log(`✅ ${result}`); ok++; }
    await new Promise(r => setTimeout(r, 120));
  }

  console.log(`\n✅  Done — ${ok} succeeded, ${fail} failed.`);
  if (missingDept.length) {
    console.log(`⚠️   ${missingDept.length} rows had NO department (they'll be view-only everywhere): ${missingDept.join(', ')}`);
  }
  console.log('\nAccess model:');
  console.log('  Admin / CCO → super admin: add & edit projects in ALL departments');
  console.log('  Everyone else → add & edit ONLY their own department, read all others');
  console.log('  Login: Email (Employee ID @bialairport.com) / password = Employee ID (change on first login)\n');
}

main().catch(err => { console.error(err); process.exit(1); });
