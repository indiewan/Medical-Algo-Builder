import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// function to replace `setCurrentAlgo({ ...currentAlgo,` with `setCurrentAlgo((prev) => { if (!prev) return prev; return { ...prev,`

let count = 0;
content = content.replace(/setCurrentAlgo\(\{\s*\.\.\.currentAlgo,/g, () => {
  count++;
  return 'setCurrentAlgo((prev) => {\n      if (!prev) return prev;\n      return {\n        ...prev,';
});

// For each of these, we also need to add `});` instead of `});` wait...
// `});` was just closing `setCurrentAlgo({`. Now it needs to close `setCurrentAlgo((prev) => { ... });`.
// Since we opened two blocks `{` and `{` instead of one.
// actually it's easier to use a regex or string replacement that captures the whole thing.

const code = content.split('\n');
let inRewrite = false;
let openBrackets = 0;
for (let i = 0; i < code.length; i++) {
  if (code[i].includes('setCurrentAlgo({')) {
     const nextLine = code[i+1] || '';
     if (nextLine.includes('...currentAlgo,')) {
         code[i] = code[i].replace('setCurrentAlgo({', 'setCurrentAlgo((prev) => { if (!prev) return prev; return {');
         code[i+1] = code[i+1].replace('...currentAlgo,', '...prev,');
         
         // find the closing `});`
         let j = i + 1;
         let brackets = 1; // we opened one `{` in `return {`
         while (j < code.length) {
            if (code[j].includes('});') && code[j].trim() === '});') {
               code[j] = code[j].replace('});', '}; });');
               break;
            }
            j++;
         }
     }
  }
}

fs.writeFileSync('src/App.tsx', code.join('\n'), 'utf-8');
console.log('Fixed currentAlgo updates:', count);
