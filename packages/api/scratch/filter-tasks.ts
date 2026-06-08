import { execSync } from 'child_process';

const projectId = '3';
const owner = 'nguekeuarthur';
const assignee = 'Wilfried-Evina';

try {
  const output = execSync(`gh project item-list ${projectId} --owner ${owner} --format json`).toString();
  const data = JSON.parse(output);
  
  const todoItems = data.items.filter((item: any) => 
    item.status === 'Todo' && 
    item.assignees && 
    item.assignees.includes(assignee)
  );
  
  console.log('--- TÂCHES TODO POUR WILFRIED-EVINA ---');
  todoItems.forEach((item: any) => {
    console.log(`[#${item.content.number}] ${item.title}`);
  });
} catch (error) {
  console.error('Erreur:', error);
}
