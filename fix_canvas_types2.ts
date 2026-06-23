import fs from 'fs';
let content = fs.readFileSync('src/components/FlowchartCanvas.tsx', 'utf-8');

content = content.replace(
  /Array\.from\(newSelected\) as string\[\]\[newSelected\.size \- 1\]/g,
  '(Array.from(newSelected) as string[])[newSelected.size - 1]'
);

content = content.replace(
  /Array\.from\(newSelectedIds\) as string\[\]\[newSelectedIds\.size \- 1\]/g,
  '(Array.from(newSelectedIds) as string[])[newSelectedIds.size - 1]'
);

fs.writeFileSync('src/components/FlowchartCanvas.tsx', content, 'utf-8');
