const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, '..');

const files = [
  { f: 'app/(app)/clients/[clientId]/page.tsx', replacements: [
    ['bg-green-600 hover:bg-green-700', 'bg-primary hover:bg-primary/90'],
    ['bg-green-100 text-green-800 border-transparent hover:bg-green-200', 'bg-primary/10 text-primary border-transparent hover:bg-primary/20'],
  ]},
  { f: 'app/(app)/clients-list/page.tsx', replacements: [
    ['bg-green-600 hover:bg-green-700 text-white', 'bg-primary hover:bg-primary/90 text-white'],
  ]},
  { f: 'app/(app)/dashboard/activity/page.tsx', replacements: [
    ['bg-green-500 dark:bg-green-600', 'bg-primary dark:bg-primary/90'],
  ]},
  { f: 'app/(app)/deals/[dealId]/page.tsx', replacements: [
    ['bg-green-600 hover:bg-green-700', 'bg-primary hover:bg-primary/90'],
    ['bg-green-100 text-green-800 border-transparent hover:bg-green-200', 'bg-primary/10 text-primary border-transparent hover:bg-primary/20'],
  ]},
  { f: 'app/(app)/dropped-leads/[droppedId]/page.tsx', replacements: [
    ['bg-green-600 text-white border-transparent hover:bg-green-700', 'bg-primary text-white border-transparent hover:bg-primary/90'],
  ]},
  { f: 'app/(app)/financial-documents/approve/[documentId]/page.tsx', replacements: [
    ['bg-green-600 hover:bg-green-700', 'bg-primary hover:bg-primary/90'],
  ]},
  { f: 'app/(app)/leads/[leadId]/page.tsx', replacements: [
    ['bg-emerald-100 text-emerald-800 border-transparent hover:bg-emerald-200 text-[10px]', 'bg-primary/10 text-primary border-transparent hover:bg-primary/20 text-[10px]'],
  ]},
  { f: 'app/(app)/proposals/batch/page.tsx', replacements: [
    ['text-green-500', 'text-primary'],
  ]},
  { f: 'app/(app)/reports/page.tsx', replacements: [
    ['bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', 'bg-primary/10 text-primary dark:text-primary'],
  ]},
  { f: 'app/(app)/users/page.tsx', replacements: [
    ['text-emerald-500', 'text-primary'],
  ]},
  { f: 'app/(app)/view-expenses/page.tsx', replacements: [
    ['text-green-600', 'text-primary'],
  ]},
];

let totalChanges = 0;
files.forEach(({ f, replacements }) => {
  const filePath = path.join(base, f);
  if (!fs.existsSync(filePath)) { console.log(`SKIP (not found): ${f}`); return; }
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  replacements.forEach(([from, to]) => {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      console.log(`  ✔ ${f}: replaced "${from.substring(0, 50)}..."`);
      changed = true;
      totalChanges++;
    } else {
      console.log(`  ⚠ ${f}: NOT FOUND "${from.substring(0, 50)}..."`);
    }
  });
  if (changed) fs.writeFileSync(filePath, content, 'utf8');
});

console.log(`\nDone! ${totalChanges} replacements made.`);
