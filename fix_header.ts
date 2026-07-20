import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Header modifications
const headerInsertion = `
        {/* Search filter */}
        <div className="relative flex items-center mr-1 md:mr-2 no-print">
          <Icons.Search className="w-4 h-4 text-slate-400 absolute left-2.5" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-7 py-1.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-28 md:w-48 transition-all bg-slate-50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200"
            >
              <Icons.X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Undo/Redo */}
        {isEditMode && !isSharedResource && (
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 gap-0.5 mr-1 md:mr-2 no-print">
            <button
              onClick={handleUndo}
              disabled={past.length === 0}
              className={\`p-1.5 rounded-lg flex items-center justify-center transition-colors \${past.length > 0 ? 'hover:bg-slate-200 text-slate-700' : 'text-slate-400 cursor-not-allowed'}\`}
              title="Undo"
            >
              <Icons.Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={future.length === 0}
              className={\`p-1.5 rounded-lg flex items-center justify-center transition-colors \${future.length > 0 ? 'hover:bg-slate-200 text-slate-700' : 'text-slate-400 cursor-not-allowed'}\`}
              title="Redo"
            >
              <Icons.Redo2 className="w-4 h-4" />
            </button>
          </div>
        )}
`;

content = content.replace(
  /\{\/\* Start \/ Stop tracking clinical incident modules \*\/\}/,
  headerInsertion + '\n        {/* Start / Stop tracking clinical incident modules */}'
);

// We need to pass searchQuery to FlowchartCanvas
content = content.replace(
  /isIncidentActive=\{isIncidentActive\}/,
  'isIncidentActive={isIncidentActive}\n            searchQuery={searchQuery}'
);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
