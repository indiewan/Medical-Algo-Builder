import fs from 'fs';
let content = fs.readFileSync('src/components/FlowchartCanvas.tsx', 'utf-8');

content = content.replace(
  /isIncidentActive: boolean;/,
  'isIncidentActive: boolean;\n  searchQuery?: string;'
);

content = content.replace(
  /isIncidentActive,/,
  'isIncidentActive,\n  searchQuery,'
);

// We highlight nodes that match the search query (if query is not empty)
// We add a 'opacity-30' class to nodes that DO NOT match, when there IS a search query.
content = content.replace(
  /const timerValue = activeTimers\[node.id\];/,
  `const timerValue = activeTimers[node.id];
          
          let searchDimmed = false;
          let highlightSearch = false;
          if (searchQuery && searchQuery.trim().length > 0) {
             const lowerQuery = searchQuery.toLowerCase();
             const matches = (node.label && node.label.toLowerCase().includes(lowerQuery)) || (node.notes && node.notes.toLowerCase().includes(lowerQuery));
             if (!matches) {
                searchDimmed = true;
             } else {
                highlightSearch = true;
             }
          }`
);

// find where isGrayedOut is defined
content = content.replace(
  /const isGrayedOut = trackingDimOverlay;/,
  'const isGrayedOut = trackingDimOverlay || searchDimmed;'
);

// Maybe add a yellow ring for highlightSearch
// For default panels:
content = content.replace(
  /isSelected \? 'ring-4 ring-blue-500\/50 shadow-md' : 'shadow-sm'/,
  'isSelected ? "ring-4 ring-blue-500/50 shadow-md" : (highlightSearch ? "ring-4 ring-yellow-400 shadow-md" : "shadow-sm")'
);

// For table nodes:
content = content.replace(
  /isSelected \? 'ring-4 ring-blue-500\/50 border-blue-400' : 'border-slate-300'/,
  'isSelected ? "ring-4 ring-blue-500/50 border-blue-400" : (highlightSearch ? "ring-4 ring-yellow-400 border-yellow-400" : "border-slate-300")'
);

// For annotation nodes:
content = content.replace(
  /isSelected \? 'ring-2 ring-blue-500 border-blue-400 shadow-sm' : 'border-slate-300 hover:border-slate-400'/,
  'isSelected ? "ring-2 ring-blue-500 border-blue-400 shadow-sm" : (highlightSearch ? "ring-2 ring-yellow-400 border-yellow-400 shadow-sm" : "border-slate-300 hover:border-slate-400")'
);

// For pill nodes:
content = content.replace(
  /isSelected \? 'ring-4 ring-blue-500\/40 border-blue-400' : 'border-slate-300'/,
  'isSelected ? "ring-4 ring-blue-500/40 border-blue-400" : (highlightSearch ? "ring-4 ring-yellow-400 border-yellow-400" : "border-slate-300")'
);

fs.writeFileSync('src/components/FlowchartCanvas.tsx', content, 'utf-8');
