import fs from 'fs';

let content = fs.readFileSync('src/components/FlowchartCanvas.tsx', 'utf-8');

const replacement = `                onClick={(e) => {
                  e.stopPropagation();
                  if (isEditMode) {
                    if (isLinkTarget) {
                      onCompleteLink(node.id);
                    } else {
                      onSelectNode(node.id);
                    }
                  }
                }}`;

content = content.replaceAll(
`                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(node.id);
                }}`,
  replacement
);

fs.writeFileSync('src/components/FlowchartCanvas.tsx', content, 'utf-8');
console.log('Fixed onClicks in FlowchartCanvas');
