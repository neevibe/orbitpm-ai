const fs = require('fs');
const path = require('path');

const jsonPath = path.resolve(__dirname, '../src/lib/bial-data.json');
let content = fs.readFileSync(jsonPath, 'utf8');

// List of replacements: [target regex/string, replacement]
const replacements = [
  // Departments
  [/CBB & Lounge/g, 'Amenities & Hospitality'],
  [/Duty Free/g, 'Retail & Commerce'],
  [/BASL/g, 'Strategic Support'],
  [/BACL/g, 'Corporate Division'],

  // Entities & Brands
  [/BIAL/g, 'Xyrenis'],
  [/Bial/g, 'Xyrenis'],
  [/bial/g, 'xyrenis'],
  [/bial\.aero/g, 'xyrenis.com'],
  [/BLR/g, 'XYR'],
  [/KIAF/g, 'XYR'],

  // Specific Airport Projects / Terms to Corporate equivalents
  [/Airport Navigation/g, 'Campus Navigation'],
  [/Terminal 2 Immigration/g, 'HQ Security'],
  [/Terminal 2 Art Pavilion/g, 'HQ Lobby Gallery'],
  [/dep gates/g, 'departments'],
  [/Ordering at gates/g, 'Ordering at Desk'],
  [/Intl SHA Gate Z/g, 'Building B Main Floor'],
  [/T2 South/g, 'West Wing'],
  [/T1 Mezzanine/g, 'East Wing Mezzanine'],
  [/transfer pax/gi, 'migrated users'],
  [/total pax/gi, 'total users'],
  [/per dpax/gi, 'per user'],
  [/\(total pax\)/gi, '(total users)'],
  [/\bdpax\b/gi, 'active users'],
  [/\bpax\b/gi, 'users'],
  [/Lounge Survey/g, 'Amenities Survey'],
  [/Lounge Access/g, 'VIP Access']
];

console.log('Sanitizing bial-data.json in orbitpm-ai...');
let updatedContent = content;
for (const [pattern, replacement] of replacements) {
  updatedContent = updatedContent.replace(pattern, replacement);
}

fs.writeFileSync(jsonPath, updatedContent, 'utf8');
console.log('Sanitized bial-data.json successfully!');
