'use client';

import React, { useState, useRef, useEffect } from 'react';
import { DocumentUploader } from '../components/DocumentUploader';
import { DocumentViewer } from '../components/DocumentViewer';
import { ChatSidebar } from '../components/ChatSidebar';
import { convertPdfToImages } from '../lib/pdf-utils';
import { analyzeDocumentPages, chatWithAI, analyzeSinglePage } from '../lib/ai';
import { Field, ChatMessage, Project } from '../types';
import { FileText, Download, PenTool, Type, Database, X, ChevronLeft } from 'lucide-react';
import { saveProject } from '../lib/storage';

export default function Home() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [pages, setPages] = useState<string[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [isHandwritten, setIsHandwritten] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showJsonLayer, setShowJsonLayer] = useState(false);
  const [jsonContent, setJsonContent] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash-preview');

  // Auto-save project
  useEffect(() => {
    if (projectId && pages.length > 0) {
      const timer = setTimeout(() => {
        saveProject({
          id: projectId,
          name: projectName,
          updatedAt: Date.now(),
          pages,
          fields,
          messages
        }).catch(err => console.error('Failed to auto-save project', err));
      }, 1000); // debounce save
      return () => clearTimeout(timer);
    }
  }, [projectId, projectName, pages, fields, messages]);

  const handleLoadProject = (project: Project) => {
    setProjectId(project.id);
    setProjectName(project.name);
    setPages(project.pages);
    setFields(project.fields);
    setMessages(project.messages);
  };

  const handleBackToProjects = () => {
    setProjectId(null);
    setProjectName('');
    setPages([]);
    setFields([]);
    setMessages([]);
  };

  const handleAddField = (pageIndex: number) => {
    const newField: Field = {
      id: `manual-${Date.now()}`,
      label: 'Manual Field',
      type: 'text',
      pageIndex,
      boundingBox: {
        ymin: 100,
        xmin: 100,
        ymax: 150,
        xmax: 300,
      },
      value: '',
    };
    setFields(prev => [...prev, newField]);
  };

  const handleUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      // 1. Convert PDF to images
      const images = await convertPdfToImages(file);
      setPages(images);

      // Initialize project
      setProjectId(Date.now().toString());
      setProjectName(file.name);

      // 2. Start chat immediately
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: "I'm analyzing the document page by page. Let's start filling it out together. What is your company name?",
        },
      ]);

      // 3. Analyze pages incrementally in the background
      (async () => {
        for (let i = 0; i < images.length; i++) {
          try {
            const detectedFields = await analyzeSinglePage(images[i], i, selectedModel);
            setFields((prev) => [...prev, ...detectedFields]);
          } catch (e) {
            console.error(`Failed to analyze page ${i}`, e);
          }
        }
        setIsProcessing(false);
      })();
    } catch (error) {
      console.error('Error processing document:', error);
      alert('Failed to process document. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async (content: string, attachment?: ChatMessage['attachment']) => {
    const newUserMsg: ChatMessage = { id: Date.now().toString(), role: 'user' as const, content, attachment };
    const newMessages = [...messages, newUserMsg];
    setMessages(newMessages);
    setIsProcessing(true);

    try {
      const { reply, updatedFields } = await chatWithAI(newMessages, fields, selectedModel);
      
      if (updatedFields.length > 0) {
        setFields((prevFields) => {
          const newFields = [...prevFields];
          updatedFields.forEach((update) => {
            const fieldIndex = newFields.findIndex((f) => f.id === update.id);
            if (fieldIndex !== -1) {
              newFields[fieldIndex] = { ...newFields[fieldIndex], value: update.value };
            }
          });
          return newFields;
        });
      }

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: reply },
      ]);
    } catch (error) {
      console.error('Error chatting with AI:', error);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportPDF = async () => {
    if (pages.length === 0) return;
    
    setIsProcessing(true);
    try {
      const { toJpeg } = await import('html-to-image');
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i++) {
        const element = document.getElementById(`pdf-page-${i}`);
        if (!element) continue;

        // Hide empty field highlights before capturing
        const emptyFields = element.querySelectorAll('.border-dashed');
        emptyFields.forEach((el) => {
          (el as HTMLElement).style.border = 'none';
          (el as HTMLElement).style.background = 'transparent';
          const input = el.querySelector('textarea');
          if (input) input.style.display = 'none';
        });
        
        // Hide drag handles
        const dragHandles = element.querySelectorAll('.drag-handle');
        dragHandles.forEach((el) => {
          (el as HTMLElement).style.display = 'none';
        });

        // Hide floating toolbar and active ring
        const floatingToolbars = element.querySelectorAll('.floating-toolbar');
        floatingToolbars.forEach((el) => {
          (el as HTMLElement).style.display = 'none';
        });
        const activeRings = element.querySelectorAll('.active-ring');
        activeRings.forEach((el) => {
          (el as HTMLElement).classList.remove('ring-2', 'ring-blue-500');
        });

        const imgData = await toJpeg(element, {
          quality: 0.95,
          pixelRatio: 2,
        });

        // Restore empty field highlights
        emptyFields.forEach((el) => {
          (el as HTMLElement).style.border = '';
          (el as HTMLElement).style.background = '';
          const input = el.querySelector('textarea');
          if (input) input.style.display = '';
        });
        
        // Restore drag handles
        dragHandles.forEach((el) => {
          (el as HTMLElement).style.display = '';
        });

        // Restore floating toolbar and active ring
        floatingToolbars.forEach((el) => {
          (el as HTMLElement).style.display = '';
        });
        activeRings.forEach((el) => {
          (el as HTMLElement).classList.add('ring-2', 'ring-blue-500');
        });

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
      }

      pdf.save('filled-cahier-de-charge.pdf');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateField = (id: string, updates: Partial<Field>) => {
    setFields((prevFields) =>
      prevFields.map((field) =>
        field.id === id ? { ...field, ...updates } : field
      )
    );
  };

  const handleCloneField = (id: string) => {
    setFields((prev) => {
      const fieldToClone = prev.find(f => f.id === id);
      if (!fieldToClone) return prev;
      const newField: Field = {
        ...fieldToClone,
        id: Date.now().toString(),
        boundingBox: {
          ...fieldToClone.boundingBox,
          ymin: fieldToClone.boundingBox.ymin + 50,
          ymax: fieldToClone.boundingBox.ymax + 50,
        }
      };
      return [...prev, newField];
    });
  };

  const openJsonLayer = () => {
    setJsonContent(JSON.stringify(fields, null, 2));
    setShowJsonLayer(true);
  };

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      if (Array.isArray(parsed)) {
        setFields(parsed);
        setShowJsonLayer(false);
      } else {
        alert("JSON must be an array of fields.");
      }
    } catch (e) {
      alert("Invalid JSON format. Please check for syntax errors.");
    }
  };

  if (pages.length === 0) {
    return (
      <main className="min-h-screen bg-stone-50">
        <DocumentUploader 
          onUpload={handleUpload} 
          isProcessing={isProcessing} 
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          onLoadProject={handleLoadProject}
        />
      </main>
    );
  }

  return (
    <main className="h-screen flex flex-col bg-stone-50 overflow-hidden">
      {/* Top Bar */}
      <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToProjects}
            className="p-2 -ml-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors"
            title="Back to Projects"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2 text-amber-700">
            <FileText size={24} />
            <h1 className="font-semibold text-stone-800 truncate max-w-[200px] sm:max-w-xs">{projectName || 'Cahier de Charge Automator'}</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-stone-100 p-1 rounded-lg">
            <button
              onClick={() => setIsHandwritten(false)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                !isHandwritten ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <Type size={16} />
              Typed
            </button>
            <button
              onClick={() => setIsHandwritten(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isHandwritten ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <PenTool size={16} />
              Handwritten
            </button>
          </div>
          
          <button
            onClick={openJsonLayer}
            className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Database size={18} />
            JSON Data
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isProcessing}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Download size={18} />
            Export PDF
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <DocumentViewer pages={pages} fields={fields} isHandwritten={isHandwritten} onUpdateField={handleUpdateField} onCloneField={handleCloneField} onAddField={handleAddField} />
        <ChatSidebar
          fields={fields}
          messages={messages}
          onSendMessage={handleSendMessage}
          isProcessing={isProcessing}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </div>

      {/* JSON Layer Modal */}
      {showJsonLayer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-stone-50">
              <h2 className="text-lg font-semibold text-stone-800 flex items-center gap-2">
                <Database size={18} className="text-amber-600" />
                JSON Data Layer
              </h2>
              <button onClick={() => setShowJsonLayer(false)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-hidden flex flex-col">
              <p className="text-sm text-stone-500 mb-2">Edit the JSON map below to bulk update fields, values, and styling parameters.</p>
              <textarea
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                className="flex-1 w-full bg-stone-900 text-stone-100 font-mono text-sm p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                spellCheck={false}
              />
            </div>
            <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-end gap-3">
              <button onClick={() => setShowJsonLayer(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-200 rounded-lg font-medium transition-colors">
                Cancel
              </button>
              <button onClick={handleApplyJson} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors">
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
