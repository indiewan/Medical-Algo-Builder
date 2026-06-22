/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ClipboardCheck, Sparkles, X } from 'lucide-react';

interface PromptModalProps {
  isOpen: boolean;
  question: string;
  presetAnswers: string[];
  placeholder?: string;
  onSubmit: (answer: string) => void;
  onClose: () => void;
}

export default function PromptModal({
  isOpen,
  question,
  presetAnswers,
  placeholder = "Type notes here...",
  onSubmit,
  onClose,
}: PromptModalProps) {
  const [inputValue, setInputValue] = useState('');

  if (!isOpen) return null;

  const handlePresetSelect = (preset: string) => {
    onSubmit(preset);
    setInputValue('');
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(inputValue.trim() || 'Logged without specific notes');
    setInputValue('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in no-print">
      <div 
        id="prompt_modal_container"
        className="w-full max-w-lg overflow-hidden bg-white border shadow-2xl rounded-2xl border-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50 border-slate-100">
          <div className="flex items-center gap-2 text-slate-800">
            <ClipboardCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-display font-semibold text-lg text-slate-900">Clinical Log Note Required</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
            id="prompt_modal_close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <p className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider font-display">Active Prompt</p>
          <h4 className="text-lg font-semibold text-slate-900 mb-6 font-display leading-snug">
            {question || "Please enter additional details for this action:"}
          </h4>

          {/* Preset Buttons Grid */}
          {presetAnswers && presetAnswers.filter(a => a.trim().length > 0).length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Quick Select Options (Tap to Log)</p>
              <div className="flex flex-wrap gap-2">
                {presetAnswers.filter(a => a.trim().length > 0).map((preset, index) => (
                  <button
                    key={`${preset}-${index}`}
                    type="button"
                    onClick={() => handlePresetSelect(preset.trim())}
                    className="flex items-center justify-between text-left px-3 py-2 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 rounded-lg transition-all duration-150 group text-slate-700 text-sm font-medium shadow-sm hover:shadow-md"
                  >
                    <span>{preset.trim()}</span>
                    <Sparkles className="w-3.5 h-3.5 ml-2 text-slate-300 group-hover:text-emerald-500 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Note Form */}
          <form onSubmit={handleCustomSubmit}>
            <div className="mb-4">
              <label htmlFor="custom_note" className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Or Type Custom Entry
              </label>
              <textarea
                id="custom_note"
                rows={3}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-700 text-sm transition-shadow"
                autoFocus
              />
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Confirm & Log
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
