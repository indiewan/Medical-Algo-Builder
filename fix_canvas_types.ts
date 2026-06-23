import fs from 'fs';
let content = fs.readFileSync('src/components/FlowchartCanvas.tsx', 'utf-8');

// Replace onUpdateNodeCoordinates
content = content.replace(
  /onUpdateNodeCoordinates: \(id: string, x: number, y: number\) => void;/,
  'onUpdateNodeCoordinates: (updates: {id: string, x: number, y: number}[] | string, x?: number, y?: number) => void;'
);

// Replace Array.from(newSelected)
content = content.replace(
  /Array\.from\(newSelected\)/g,
  'Array.from(newSelected) as string[]'
);

content = content.replace(
  /Array\.from\(newSelectedIds\)/g,
  'Array.from(newSelectedIds) as string[]'
);


fs.writeFileSync('src/components/FlowchartCanvas.tsx', content, 'utf-8');
