import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  /const \[currentAlgo, setCurrentAlgo\] = useState<MedicalAlgorithm>\(MEDICAL_TEMPLATES\[0\]\);/,
  `const [currentAlgo, setCurrentAlgo] = useState<MedicalAlgorithm>(MEDICAL_TEMPLATES[0]);
  const [past, setPast] = useState<MedicalAlgorithm[]>([]);
  const [future, setFuture] = useState<MedicalAlgorithm[]>([]);

  const updateAlgoWithHistory = (updateFn: MedicalAlgorithm | ((prev: MedicalAlgorithm) => MedicalAlgorithm)) => {
    setCurrentAlgo((prev) => {
      const nextAlgo = typeof updateFn === 'function' ? updateFn(prev) : updateFn;
      // Simple debounce/throttle could be done, but we assume most actions are atomic
      setPast((p) => [...p, prev]);
      setFuture([]);
      return nextAlgo;
    });
  };

  const handleUndo = () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast(past.slice(0, past.length - 1));
    setFuture([currentAlgo, ...future]);
    setCurrentAlgo(previous);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture(future.slice(1));
    setPast([...past, currentAlgo]);
    setCurrentAlgo(next);
  };`
);

content = content.replace(/setCurrentAlgo/g, 'updateAlgoWithHistory');
content = content.replace(/const \[currentAlgo, updateAlgoWithHistory\]/, 'const [currentAlgo, setCurrentAlgo]');
content = content.replace(/updateAlgoWithHistory\(previous\);/, 'setCurrentAlgo(previous);');
content = content.replace(/updateAlgoWithHistory\(next\);/, 'setCurrentAlgo(next);');
content = content.replace(/updateAlgoWithHistory\(decodedAlgo\);/, 'setCurrentAlgo(decodedAlgo);');
// Fix load template as well
content = content.replace(/updateAlgoWithHistory\(JSON.parse\(JSON.stringify\(algo\)\)\);/, 'setCurrentAlgo(JSON.parse(JSON.stringify(algo)));\n    setPast([]);\n    setFuture([]);');

content = content.replace(
  /const \[selectedNodeId, setSelectedNodeId\] = useState<string \| null>\(null\);/,
  `const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');`
);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
