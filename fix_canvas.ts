import fs from 'fs';
let content = fs.readFileSync('src/components/FlowchartCanvas.tsx', 'utf-8');

// Add zoom state
content = content.replace(
  'const containerRef = useRef<HTMLDivElement>(null);',
  'const containerRef = useRef<HTMLDivElement>(null);\n  const [zoom, setZoom] = useState(1);'
);

// Update event handlers
content = content.replace(
  /setDragOffset\(\{\n\s*x: e\.clientX - rect\.left,\n\s*y: e\.clientY - rect\.top,\n\s*\}\);/,
  'setDragOffset({\n      x: (e.clientX - rect.left) / zoom,\n      y: (e.clientY - rect.top) / zoom,\n    });'
);

content = content.replace(
  /setDragPos\(\{\n\s*x: rect\.left - parentRect\.left,\n\s*y: rect\.top - parentRect\.top,\n\s*\}\);/,
  'setDragPos({\n      x: (rect.left - parentRect.left) / zoom,\n      y: (rect.top - parentRect.top) / zoom,\n    });'
);

content = content.replace(
  /const candidateX = e\.clientX - parentRect\.left - dragOffset\.x;/,
  'const candidateX = (e.clientX - parentRect.left) / zoom - dragOffset.x;'
);

content = content.replace(
  /const candidateY = e\.clientY - parentRect\.top - dragOffset\.y;/,
  'const candidateY = (e.clientY - parentRect.top) / zoom - dragOffset.y;'
);

content = content.replace(
  /const deltaX = resizeCurrentPos\.x - resizeStartPos\.x;/g,
  'const deltaX = (resizeCurrentPos.x - resizeStartPos.x) / zoom;'
);

content = content.replace(
  /const deltaY = resizeCurrentPos\.y - resizeStartPos\.y;/g,
  'const deltaY = (resizeCurrentPos.y - resizeStartPos.y) / zoom;'
);

// update flowchart-canvas-container
content = content.replace(
  /<div id="canvas-scroll-container"([^>]*)>/,
  '<div id="canvas-scroll-container"$1>\n      <div className="absolute top-4 right-4 z-40 flex gap-2 bg-white/90 backdrop-blur shadow-sm p-1.5 rounded-xl border border-slate-200">\n        <button onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer" title="Zoom Out"><Icons.ZoomOut className="w-4 h-4" /></button>\n        <span className="text-xs font-medium w-9 text-center my-auto text-slate-500">{Math.round(zoom * 100)}%</span>\n        <button onClick={() => setZoom(z => Math.min(2, z + 0.2))} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer" title="Zoom In"><Icons.ZoomIn className="w-4 h-4" /></button>\n      </div>\n      <div style={{ width: GRID_COLS * CELL_WIDTH * zoom, height: GRID_ROWS * CELL_HEIGHT * zoom, position: "relative", minWidth: "100%", minHeight: "100%" }}>'
);
content = content.replace(
  /width: `\$\{GRID_COLS \* CELL_WIDTH\}px`,/,
  'width: `${GRID_COLS * CELL_WIDTH}px`,\n          transform: `scale(${zoom})`,\n          transformOrigin: "top left",'
);

content = content.replace(
  '    </div>\n  );\n}',
  '      </div>\n    </div>\n  );\n}'
);

fs.writeFileSync('src/components/FlowchartCanvas.tsx', content, 'utf-8');
