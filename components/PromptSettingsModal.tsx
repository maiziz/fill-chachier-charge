import React, { useState } from 'react';
import { X, Wand2, Save, FileText } from 'lucide-react';
import { enhancePromptWithAI } from '../lib/ai';

interface PromptSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrompt: string;
  onSave: (prompt: string) => void;
}

const TEMPLATES = [
  {
    name: "Cahier de Charge (Default)",
    prompt: `You are an AI assistant helping a user fill out a specification document (Cahier de Charge).
Here are the fields that need to be filled:
{{FIELDS}}

Your goal is to collect the missing information to fill these fields.
CRITICAL INSTRUCTION: If the user provides a document (like a PDF, scanned document, image, or text file) or a large block of text, you MUST thoroughly analyze it to extract information for ALL possible empty fields. Do not stop after finding just one or two fields. Extract as much information as possible to save the user time.
You MUST call the 'updateFields' function with all the extracted values. If there are many fields to update, you can include them all in a single 'updateFields' call, or you can call it multiple times if needed.
If you need more information, ask the user for missing information. Be polite and professional.
If the user provides information in chat, you MUST call the 'updateFields' function to save it.
If all fields are filled, tell the user they can now export the document.`
  },
  {
    name: "Invoice Processing",
    prompt: `You are an AI assistant specialized in extracting data from invoices.
Here are the fields that need to be filled:
{{FIELDS}}

Your goal is to extract all relevant information from the provided invoice documents.
CRITICAL INSTRUCTION: Analyze the invoice thoroughly. Extract vendor details, amounts, dates, line items, and any other requested fields.
You MUST call the 'updateFields' function with all extracted values.
If any required fields are missing from the invoice, politely ask the user to provide them.
If the user provides information in chat, you MUST call the 'updateFields' function to save it.`
  },
  {
    name: "Resume Extraction",
    prompt: `You are an AI assistant specialized in parsing resumes and CVs.
Here are the fields that need to be filled:
{{FIELDS}}

Your goal is to extract candidate information from the provided resume documents.
CRITICAL INSTRUCTION: Analyze the resume thoroughly. Extract candidate name, contact info, experience, skills, and education.
You MUST call the 'updateFields' function with all extracted values.
If any required fields are missing, politely ask the user to provide them.
If the user provides information in chat, you MUST call the 'updateFields' function to save it.`
  }
];

export function PromptSettingsModal({ isOpen, onClose, currentPrompt, onSave }: PromptSettingsModalProps) {
  const [promptText, setPromptText] = useState(currentPrompt);
  const [isEnhancing, setIsEnhancing] = useState(false);

  if (!isOpen) return null;

  const handleEnhance = async () => {
    setIsEnhancing(true);
    try {
      const enhanced = await enhancePromptWithAI(promptText);
      setPromptText(enhanced);
    } catch (error) {
      console.error('Failed to enhance prompt:', error);
      alert('Failed to enhance prompt. Please try again.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSave = () => {
    onSave(promptText);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 sm:p-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-full max-h-[85vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-stone-50">
          <h2 className="text-lg font-semibold text-stone-800 flex items-center gap-2">
            <FileText size={18} className="text-amber-600" />
            System Prompt Settings
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Templates Sidebar */}
          <div className="w-full md:w-64 border-r border-stone-200 bg-stone-50 p-4 overflow-y-auto shrink-0">
            <h3 className="text-sm font-semibold text-stone-600 uppercase tracking-wider mb-3">Templates</h3>
            <div className="space-y-2">
              {TEMPLATES.map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => setPromptText(template.prompt)}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-stone-200 transition-colors text-stone-700"
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Editor Area */}
          <div className="flex-1 p-4 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-stone-500">
                Edit the system instructions for the AI. Use <code className="bg-stone-100 px-1 rounded text-amber-600">{"{{FIELDS}}"}</code> to inject the current fields.
              </p>
              <button
                onClick={handleEnhance}
                disabled={isEnhancing}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Wand2 size={14} />
                {isEnhancing ? 'Enhancing...' : 'AI Enhance'}
              </button>
            </div>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="flex-1 w-full bg-stone-900 text-stone-100 font-mono text-sm p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              spellCheck={false}
            />
          </div>
        </div>
        
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-stone-600 hover:bg-stone-200 rounded-lg font-medium transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors">
            <Save size={18} />
            Save Prompt
          </button>
        </div>
      </div>
    </div>
  );
}
