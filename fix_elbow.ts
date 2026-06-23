import fs from 'fs';
let content = fs.readFileSync('src/components/FlowchartCanvas.tsx', 'utf-8');

const elbowFunction = `
  const generateOrthogonalPath = (start: {x: number, y: number}, end: {x: number, y: number}, isHorizontal: boolean) => {
    const r = 16;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    
    if (Math.abs(dx) < r * 2 || Math.abs(dy) < r * 2) {
      if (isHorizontal) {
        return \`M \${start.x} \${start.y} L \${start.x + dx/2} \${start.y} L \${start.x + dx/2} \${end.y} L \${end.x} \${end.y}\`;
      } else {
        return \`M \${start.x} \${start.y} L \${start.x} \${start.y + dy/2} L \${end.x} \${start.y + dy/2} L \${end.x} \${end.y}\`;
      }
    }

    const dirX = Math.sign(dx);
    const dirY = Math.sign(dy);

    if (isHorizontal) {
      const midX = start.x + dx / 2;
      return \`M \${start.x} \${start.y} L \${midX - r*dirX} \${start.y} Q \${midX} \${start.y} \${midX} \${start.y + r*dirY} L \${midX} \${end.y - r*dirY} Q \${midX} \${end.y} \${midX + r*dirX} \${end.y} L \${end.x} \${end.y}\`;
    } else {
      const midY = start.y + dy / 2;
      return \`M \${start.x} \${start.y} L \${start.x} \${midY - r*dirY} Q \${start.x} \${midY} \${start.x + r*dirX} \${midY} L \${end.x - r*dirX} \${midY} Q \${end.x} \${midY} \${end.x} \${midY + r*dirY} L \${end.x} \${end.y}\`;
    }
  };
`;

content = content.replace(
  /const calculateConnectionLine = \(fromNode: FlowNode, toNode: FlowNode\) => \{/,
  elbowFunction + '\n  const calculateConnectionLine = (fromNode: FlowNode, toNode: FlowNode) => {'
);


content = content.replace(
  /let pathD = '';\n\s*if \(isHorizontal\) \{\n\s*const midX = start\.x \+ \(end\.x - start\.x\) \/ 2;\n\s*pathD = `M \$\{start\.x\} \$\{start\.y\} L \$\{midX\} \$\{start\.y\} L \$\{midX\} \$\{end\.y\} L \$\{end\.x\} \$\{end\.y\}`;\n\s*\} else \{\n\s*const midY = start\.y \+ \(end\.y - start\.y\) \/ 2;\n\s*pathD = `M \$\{start\.x\} \$\{start\.y\} L \$\{start\.x\} \$\{midY\} L \$\{end\.x\} \$\{midY\} L \$\{end\.x\} \$\{end\.y\}`;\n\s*\}/,
  'let pathD = generateOrthogonalPath(start, end, isHorizontal);'
);

fs.writeFileSync('src/components/FlowchartCanvas.tsx', content, 'utf-8');
