import React, { useState } from 'react';
import * as Icons from 'lucide-react';

interface VitalsTrackerProps {
  onLogVitals: (vitalsString: string) => void;
}

export function VitalsTracker({ onLogVitals }: VitalsTrackerProps) {
  const [hr, setHr] = useState('');
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');
  const [spo2, setSpo2] = useState('');
  const [rr, setRr] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const parts = [];
    if (hr) parts.push(`HR: ${hr}`);
    if (bpSys || bpDia) parts.push(`BP: ${bpSys || '?'}/${bpDia || '?'}`);
    if (spo2) parts.push(`SpO2: ${spo2}%`);
    if (rr) parts.push(`RR: ${rr}`);

    if (parts.length > 0) {
      onLogVitals(`Vitals - ${parts.join(', ')}`);
      setHr('');
      setBpSys('');
      setBpDia('');
      setSpo2('');
      setRr('');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:border-slate-300 transition-colors">
      <div className="flex items-center gap-1.5 mb-3">
        <Icons.Activity className="w-4 h-4 text-rose-500" />
        <h4 className="text-[11px] uppercase tracking-wider font-bold text-slate-700">Quick Vitals Entry</h4>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">HR</label>
            <input 
              type="number" 
              value={hr} 
              onChange={e => setHr(e.target.value)} 
              placeholder="bpm" 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500" 
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">SpO2</label>
            <input 
              type="number" 
              value={spo2} 
              onChange={e => setSpo2(e.target.value)} 
              placeholder="%" 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500" 
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">BP (Sys/Dia)</label>
            <div className="flex items-center gap-1">
              <input 
                type="number" 
                value={bpSys} 
                onChange={e => setBpSys(e.target.value)} 
                placeholder="Sys" 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 text-center" 
              />
              <span className="text-slate-400 font-bold">/</span>
              <input 
                type="number" 
                value={bpDia} 
                onChange={e => setBpDia(e.target.value)} 
                placeholder="Dia" 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 text-center" 
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">RR</label>
            <input 
              type="number" 
              value={rr} 
              onChange={e => setRr(e.target.value)} 
              placeholder="rpm" 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500" 
            />
          </div>
        </div>
        <button 
          type="submit" 
          disabled={!hr && !bpSys && !bpDia && !spo2 && !rr}
          className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 disabled:opacity-50 disabled:hover:bg-rose-50 border border-rose-200 rounded-lg py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
        >
          <Icons.CheckCircle2 className="w-3.5 h-3.5" />
          Confirm & Log Vitals
        </button>
      </form>
    </div>
  );
}
