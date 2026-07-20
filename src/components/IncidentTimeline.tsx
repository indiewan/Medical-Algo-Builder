/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Clock, Printer, RotateCcw, Share2, ClipboardList, CheckCircle2 } from 'lucide-react';
import { IncidentSession, LogEntry } from '../types.ts';

interface IncidentTimelineProps {
  session: IncidentSession;
  onRestart: () => void;
  onCopyReport: () => void;
  isCopied: boolean;
}

export default function IncidentTimeline({
  session,
  onRestart,
  onCopyReport,
  isCopied,
}: IncidentTimelineProps) {
  const formatTime = (epochMs: number) => {
    return new Date(epochMs).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const getDurationString = (start: number, end?: number) => {
    const finalEnd = end || Date.now();
    const diffSeconds = Math.floor((finalEnd - start) / 1000);
    const mm = String(Math.floor(diffSeconds / 60)).padStart(2, '0');
    const ss = String(diffSeconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Timestamp', 'Event', 'Duration', 'Notes'],
      ...session.logs.map(log => [
        log.timestamp,
        log.nodeLabel,
        log.elapsedFormatted,
        `"${(log.notes || '').replace(/"/g, '""')}"`
      ])
    ].map(e => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `incident_log_${session.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const systemLogs = session.logs.filter(l => l.isSystemEvent);
  const actionLogs = session.logs.filter(l => !l.isSystemEvent);

  return (
    <div id="incident_report_view" className="bg-slate-50 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Actions header to exclude during web view printing, but show normal controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-xs no-print">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-display">Incident Code Report Completed</h2>
            <p className="text-sm text-slate-500">Review log chronology, edit notes, print to PDF, or export case summary.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              onClick={onRestart}
              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium transition"
              id="report_restart_btn"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Tracker
            </button>
            <button
              onClick={onCopyReport}
              className="flex items-center gap-2 px-4 py-2 text-white bg-slate-900 hover:bg-slate-800 rounded-xl text-sm font-medium transition cursor-pointer"
              id="report_copy_btn"
            >
              {isCopied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  Copy Markdown
                </>
              )}
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium transition cursor-pointer"
            >
              <ClipboardList className="w-4 h-4" />
              Export CSV
            </button>
            {session.snapshotDataUrl && (
              <a
                href={session.snapshotDataUrl}
                download="completed_proforma.png"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition cursor-pointer"
              >
                <ClipboardList className="w-4 h-4" />
                Export Proforma Image
              </a>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition cursor-pointer"
              id="report_print_btn"
            >
              <Printer className="w-4 h-4" />
              Export PDF / Print
            </button>
          </div>
        </div>

        {/* Clinical Case Briefing Layout (Designed specifically for clean styling and printing) */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden p-6 sm:p-10" id="printable_medical_document">
          
          {/* Institution/Document Header */}
          <div className="border-b-2 border-slate-900 pb-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="bg-slate-100 text-slate-800 text-xs font-semibold px-2.5 py-1 rounded-sm uppercase tracking-wider font-mono">
                Official Clinical Summary
              </span>
              <h1 className="text-3xl font-bold text-slate-900 font-display tracking-tight mt-2">
                Clinical Intervention Timeline
              </h1>
              <p className="text-slate-500 mt-1">
                Generated from Digital Medical Algorithm Tracker
              </p>
            </div>
            <div className="text-left md:text-right font-mono text-sm">
              <p className="text-slate-500">Document ID: <span className="text-slate-900 font-semibold">{session.id.slice(0, 13)}</span></p>
              <p className="text-slate-500">Date: <span className="text-slate-900 font-semibold">{new Date(session.startTime).toLocaleDateString()}</span></p>
            </div>
          </div>

          {/* Incident Metadata Cards (Bento Compartments) */}
          <div className="space-y-4 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl shadow-xs">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">Target Protocol</span>
                <span className="block text-sm font-bold text-slate-800 mt-1 font-display">{session.algorithmName}</span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl shadow-xs">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">Start Time (UTC)</span>
                <span className="block text-sm font-medium text-slate-700 mt-1 font-mono">
                  {formatTime(session.startTime)}
                </span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl shadow-xs">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">Stop / Closed Time</span>
                <span className="block text-sm font-medium text-slate-700 mt-1 font-mono">
                  {session.stopTime ? formatTime(session.stopTime) : 'Ongoing'}
                </span>
              </div>
            </div>

            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center justify-between shadow-xs">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest font-display">Total Code Duration</span>
              <div className="flex items-center gap-2 font-mono text-base font-bold text-emerald-900">
                <Clock className="w-4 h-4 text-emerald-600" />
                {getDurationString(session.startTime, session.stopTime)}
              </div>
            </div>
          </div>

          {/* Proforma Image Export */}
          {session.snapshotDataUrl && (
            <div className="mb-12 page-break-after">
               <h3 className="text-lg font-bold text-slate-900 font-display mb-4 pb-2 border-b border-slate-200">Completed Protocol Snapshot</h3>
               <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2">
                 <img src={session.snapshotDataUrl} alt="Completed Protocol" className="w-full h-auto rounded shadow-sm border border-slate-200" />
               </div>
               <p className="text-xs text-slate-500 mt-2 font-mono text-center">Snapshot captured at {new Date().toLocaleTimeString()} upon closing the incident code.</p>
            </div>
          )}

          {/* Timeline Process Flows */}
          <h3 className="text-lg font-bold text-slate-900 font-display mb-6 pb-2 border-b border-slate-200 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-slate-500" />
            Chronological Interventions ({actionLogs.length})
          </h3>

          {actionLogs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-400 font-medium">No actions were recorded during this session.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-4 md:ml-24 space-y-8 pb-4">
              {actionLogs.map((log) => (
                <div key={log.id} className="relative pl-6 md:pl-8 group">
                  {/* Absolute positioning of times of day FOR DESKTOP, placed on the left side */}
                  <div className="hidden md:block absolute -left-28 top-0.5 text-right w-20">
                    <span className="text-xs font-mono font-bold text-slate-400 tracking-tight">
                      {log.timestamp}
                    </span>
                  </div>

                  {/* Bullet indicator with color matching */}
                  <span className={`absolute -left-2.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white border-2 ${log.isAccidental ? 'border-red-400' : 'border-slate-900'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${log.isAccidental ? 'bg-red-400' : 'bg-slate-900'}`} />
                  </span>

                  {/* Log Content Panel */}
                  <div className={`p-4 rounded-xl border transition-colors ${log.isAccidental ? 'bg-red-50/50 border-red-200/60' : 'bg-slate-50 group-hover:bg-slate-100/70 border-slate-200/60'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                      <h4 className={`text-base font-bold font-display leading-tight ${log.isAccidental ? 'text-red-700 line-through' : 'text-slate-900'}`}>
                        {log.nodeLabel}
                      </h4>
                      <div className="flex items-center gap-2">
                        {/* Time of day for Mobile layout inline */}
                        <span className="md:hidden text-xs font-mono font-bold bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded">
                          {log.timestamp}
                        </span>
                        <span className={`text-xs font-mono text-white font-bold px-2.5 py-0.5 rounded-md ${log.isAccidental ? 'bg-red-500' : 'bg-slate-900'}`}>
                          +{log.elapsedFormatted}
                        </span>
                      </div>
                    </div>
                    {/* Log Note / Dialog Query details */}
                    {log.notes && (
                      <div className={`mt-2 text-sm border rounded-lg p-2.5 font-sans leading-relaxed ${log.isAccidental ? 'text-red-800 bg-red-50/80 border-red-200' : 'text-slate-800 bg-white border-slate-200'}`}>
                        <span className={`text-xs font-bold font-mono mr-1 ${log.isAccidental ? 'text-red-500' : 'text-slate-400'}`}>NOTE:</span>
                        {log.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Session System Events (Audit Log) */}
          <div className="mt-12 p-4 bg-slate-50 border border-slate-100 rounded-2xl print-break-inside">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display">Administrative Audit Log</span>
            <div className="mt-3 space-y-2 text-xs font-mono text-slate-500">
              {systemLogs.map((log) => (
                <div key={log.id} className="flex justify-between border-b border-slate-100 pb-1">
                  <span>[SYSTEM] {log.nodeLabel}</span>
                  <span className="font-semibold text-slate-700">{log.timestamp} (+{log.elapsedFormatted})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Clinical Signoff Section (Perfect for print outcome) */}
          <div className="mt-16 pt-10 border-t border-dashed border-slate-300 grid grid-cols-2 gap-8 print-break-inside">
            <div>
              <div className="h-10 border-b border-slate-400 w-full mb-2"></div>
              <p className="text-xs font-bold text-slate-500 uppercase font-display">Attending Clinician (Signature)</p>
            </div>
            <div>
              <div className="h-10 border-b border-slate-400 w-full mb-2"></div>
              <p className="text-xs font-bold text-slate-500 uppercase font-display">Witness or Board Supervisor</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
