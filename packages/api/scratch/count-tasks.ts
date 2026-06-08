import { execSync } from 'child_process';

const projectId = '3';
const owner = 'nguekeuarthur';
const assignee = 'Wilfried-Evina';

try {
  const output = execSync(`gh project item-list ${projectId} --owner ${owner} --format json --limit 100`).toString();
  const data = JSON.parse(output);
  
  const todoItems = data.items.filter((item: any) => 
    item.status === 'Todo' && 
    item.assignees && 
    item.assignees.includes(assignee)
  );

  const inProgressItems = data.items.filter((item: any) => 
    item.status === 'In Progress' && 
    item.assignees && 
    item.assignees.includes(assignee)
  );
  
  console.log(`TODO: ${todoItems.length}`);
  console.log(`IN_PROGRESS: ${inProgressItems.length}`);
  console.log('--- DÉTAILS ---');
  todoItems.forEach((item: any) => console.log(`- ${item.title}`));
} catch (error) {
  console.error('Erreur:', error);
}
