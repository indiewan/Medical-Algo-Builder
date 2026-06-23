import fs from 'fs';
let content = fs.readFileSync('src/components/FlowchartCanvas.tsx', 'utf-8');

// Add panning to scroll container
content = content.replace(
  /const containerRef = useRef<HTMLDivElement>\(null\);/,
  `const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panningStartPos = useRef({ x: 0, y: 0 });
  const panningScrollStart = useRef({ x: 0, y: 0 });`
);

content = content.replace(
  /<div id="canvas-scroll-container" className="flex-1 overflow-auto/,
  `<div id="canvas-scroll-container" ref={scrollContainerRef} className={\`flex-1 overflow-auto \${isPanning ? "cursor-grabbing" : ""} bg-white rounded-2xl border border-slate-200 shadow-sm relative min-h-[500px]\`}
  onPointerDown={e => {
    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
      e.stopPropagation();
      e.preventDefault();
      setIsPanning(true);
      panningStartPos.current = { x: e.clientX, y: e.clientY };
      panningScrollStart.current = { x: scrollContainerRef.current?.scrollLeft || 0, y: scrollContainerRef.current?.scrollTop || 0 };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }}
  onPointerMove={e => {
    if (isPanning && scrollContainerRef.current) {
      e.stopPropagation();
      e.preventDefault();
      const dx = e.clientX - panningStartPos.current.x;
      const dy = e.clientY - panningStartPos.current.y;
      scrollContainerRef.current.scrollLeft = panningScrollStart.current.x - dx;
      scrollContainerRef.current.scrollTop = panningScrollStart.current.y - dy;
    }
  }}
  onPointerUp={e => {
    if (isPanning) {
      e.stopPropagation();
      e.preventDefault();
      setIsPanning(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }}
  onContextMenu={e => {
    if (e.button === 2) {
       e.preventDefault(); // allow right mouse pan
    }
  }}
  `
);

fs.writeFileSync('src/components/FlowchartCanvas.tsx', content, 'utf-8');
