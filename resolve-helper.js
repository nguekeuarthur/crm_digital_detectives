const fs = require('fs');

const files = [
  'packages/api/prisma/schema.prisma',
  'packages/api/src/app.ts',
  'packages/api/src/modules/auth/auth.routes.ts',
  'packages/api/src/modules/auth/two-factor.service.ts',
  'packages/api/src/modules/client/client.controller.ts',
  'packages/api/src/modules/client/client.routes.ts',
  'packages/api/src/modules/client/client.service.ts',
  'packages/web/src/app/router/index.tsx',
  'packages/web/src/pages/clients/ui/ClientsPage.tsx',
  'packages/web/src/pages/dashboard/ui/DashboardPage.tsx',
  'packages/web/src/pages/planning/ui/PlanningPage.tsx',
  'packages/web/src/pages/register/ui/RegisterPage.tsx',
  'packages/web/src/widgets/layout/ui/AppLayout.tsx'
];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  let inConflict = false;
  let conflictLines = [];
  
  console.log(`\n\n=== CONFLICTS IN ${file} ===`);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('<<<<<<< HEAD')) {
      inConflict = true;
      conflictLines.push(`Line ${i+1}: ${lines[i]}`);
      continue;
    }
    if (inConflict) {
      conflictLines.push(`Line ${i+1}: ${lines[i]}`);
      if (lines[i].startsWith('>>>>>>>')) {
        inConflict = false;
        console.log(conflictLines.join('\n'));
        console.log('--------------------------------');
        conflictLines = [];
      }
    }
  }
}
