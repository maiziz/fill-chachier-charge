'use client';

import React, { useState, useRef } from 'react';
import { DocumentUploader } from '../components/DocumentUploader';
import { DocumentViewer } from '../components/DocumentViewer';
import { ChatSidebar } from '../components/ChatSidebar';
import { convertPdfToImages } from '../lib/pdf-utils';
import { analyzeDocumentPages, chatWithAI } from '../lib/ai';
import { Field } from '../types';
import { FileText, Download, PenTool, Type } from 'lucide-react';
import jsPDF from 'jspdf';

export default function Home() {
  const [pages, setPages] = useState<string[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [isHandwritten, setIsHandwritten] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<{ id: string; role: 'user' | 'assistant'; content: string }[]>([]);

  const handleUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      // 1. Convert PDF to images
      const images = await convertPdfToImages(file);
      setPages(images);

      // 2. Analyze pages with AI
      const detectedFields = await analyzeDocumentPages(images);
      setFields(detectedFields);

      // 3. Start chat
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: "I've analyzed the document. Let's fill it out together. What is your company name?",
        },
      ]);
    } catch (error) {
      console.error('Error processing document:', error);
      alert('Failed to process document. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    const newUserMsg = { id: Date.now().toString(), role: 'user' as const, content };
    const newMessages = [...messages, newUserMsg];
    setMessages(newMessages);
    setIsProcessing(true);

    try {
      const { reply, updatedFields } = await chatWithAI(newMessages, fields);
      
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
          const input = el.querySelector('input');
          if (input) input.style.display = 'none';
        });
        
        // Hide drag handles
        const dragHandles = element.querySelectorAll('.drag-handle');
        dragHandles.forEach((el) => {
          (el as HTMLElement).style.display = 'none';
        });

        const imgData = await toJpeg(element, {
          quality: 0.95,
          pixelRatio: 2,
        });

        // Restore empty field highlights
        emptyFields.forEach((el) => {
          (el as HTMLElement).style.border = '';
          (el as HTMLElement).style.background = '';
          const input = el.querySelector('input');
          if (input) input.style.display = '';
        });
        
        // Restore drag handles
        dragHandles.forEach((el) => {
          (el as HTMLElement).style.display = '';
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

  if (pages.length === 0) {
    return (
      <main className="min-h-screen bg-stone-50">
        <DocumentUploader onUpload={handleUpload} isProcessing={isProcessing} />
      </main>
    );
  }

  return (
    <main className="h-screen flex flex-col bg-stone-50 overflow-hidden">
      {/* Top Bar */}
      <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <FileText className="text-amber-600" />
          <h1 className="font-semibold text-stone-800">Cahier de Charge Automator</h1>
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
        <DocumentViewer pages={pages} fields={fields} isHandwritten={isHandwritten} onUpdateField={handleUpdateField} />
        <ChatSidebar
          fields={fields}
          messages={messages}
          onSendMessage={handleSendMessage}
          isProcessing={isProcessing}
        />
      </div>
    </main>
  );
}
