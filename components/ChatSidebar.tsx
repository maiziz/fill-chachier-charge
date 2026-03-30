'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Mic, Image as ImageIcon, Square, X, Paperclip, FileText, Settings2, ListTodo, MessageSquare } from 'lucide-react';
import { Field, ChatMessage } from '../types';
import ReactMarkdown from 'react-markdown';

interface ChatSidebarProps {
  fields: Field[];
  messages: ChatMessage[];
  onSendMessage: (message: string, attachment?: ChatMessage['attachment']) => void;
  isProcessing: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
  onUpdateField: (id: string, updates: Partial<Field>) => void;
}

export function ChatSidebar({ fields, messages, onSendMessage, isProcessing, selectedModel, onModelChange, onUpdateField }: ChatSidebarProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'fields'>('chat');
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [attachment, setAttachment] = useState<ChatMessage['attachment'] | null>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || attachment) && !isProcessing) {
      onSendMessage(input.trim(), attachment || undefined);
      setInput('');
      setAttachment(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const data = base64data.split(',')[1];
          setAttachment({
            mimeType: 'audio/webm',
            data,
            url: URL.createObjectURL(audioBlob),
          });
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const supportedTypes = [
        'application/pdf',
        'text/plain',
        'text/csv',
        'application/vnd.ms-excel',
        'text/html',
        'text/xml',
        'application/rtf',
        'text/rtf',
        'application/json',
        'text/markdown'
      ];
      
      const isImage = file.type.startsWith('image/');
      const isAudio = file.type.startsWith('audio/');
      const isVideo = file.type.startsWith('video/');
      const isCsvExtension = file.name.toLowerCase().endsWith('.csv');
      
      if (!isImage && !isAudio && !isVideo && !isCsvExtension && !supportedTypes.includes(file.type)) {
        alert(`Unsupported file type: ${file.type || 'unknown'}. Please upload a PDF, image, audio, or plain text file.`);
        // Clear the input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const data = base64data.split(',')[1];
        setAttachment({
          mimeType: isCsvExtension ? 'text/csv' : (file.type || 'application/octet-stream'),
          data,
          url: URL.createObjectURL(file),
          name: file.name,
        });
      };
    }
  };

  const models = [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' },
    { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite' },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' }
  ];

  const filledCount = fields.filter((f) => f.value).length;
  const totalCount = fields.length;
  const progress = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

  return (
    <div className="w-96 bg-white border-l border-stone-200 flex flex-col h-full shadow-lg z-10">
      <div className="p-4 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
        <div className="flex bg-stone-200/50 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'chat' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <MessageSquare size={16} />
            Chat
          </button>
          <button
            onClick={() => setActiveTab('fields')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'fields' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <ListTodo size={16} />
            Fields
          </button>
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="p-2 text-stone-500 hover:bg-stone-200 rounded-md transition-colors"
            title="Select AI Model"
          >
            <Settings2 size={18} />
          </button>
          {showModelSelector && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden z-50">
              {models.map(model => (
                <button
                  key={model.id}
                  onClick={() => {
                    onModelChange(model.id);
                    setShowModelSelector(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-stone-50 transition-colors ${selectedModel === model.id ? 'bg-amber-50 text-amber-700 font-medium' : 'text-stone-700'}`}
                >
                  {model.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="p-6 border-b border-stone-100 bg-stone-50/50">
        <h2 className="text-lg font-semibold text-stone-800 mb-2">Progress Tracker</h2>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-stone-500">
            {filledCount} of {totalCount} fields filled
          </span>
          <span className="text-sm font-bold text-amber-600">{progress}%</span>
        </div>
        <div className="w-full bg-stone-200 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-amber-500 h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {activeTab === 'chat' ? (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.length === 0 ? (
              <div className="text-center text-stone-400 mt-10">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>I&apos;ll analyze the document and ask you for the required information.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === 'user' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div
                    className={`px-4 py-3 rounded-2xl max-w-[80%] text-sm ${
                      msg.role === 'user'
                        ? 'bg-amber-500 text-white rounded-tr-sm'
                        : 'bg-stone-100 text-stone-800 rounded-tl-sm'
                    }`}
                  >
                    {msg.attachment && msg.attachment.url && (
                      <div className="mb-2">
                        {msg.attachment.mimeType.startsWith('image/') ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={msg.attachment.url} alt="Attachment" className="max-w-full rounded-lg" />
                        ) : msg.attachment.mimeType.startsWith('audio/') ? (
                          <audio src={msg.attachment.url} controls className="max-w-full h-8" />
                        ) : (
                          <div className="flex items-center gap-2 bg-stone-200/50 p-2 rounded-md border border-stone-200">
                            <FileText size={16} className="text-stone-500" />
                            <span className="text-xs truncate max-w-[150px] text-stone-700 font-medium">{msg.attachment.name || 'Document'}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {msg.content && (
                      <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-stone-800 prose-pre:text-stone-100">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {isProcessing && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center shrink-0">
                  <Bot size={16} />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-stone-100 text-stone-800 rounded-tl-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-stone-100 bg-white">
            {attachment && attachment.url && (
              <div className="mb-3 relative inline-block">
                {attachment.mimeType.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={attachment.url} alt="Preview" className="h-16 rounded-md border border-stone-200" />
                ) : attachment.mimeType.startsWith('audio/') ? (
                  <audio src={attachment.url} controls className="h-8" />
                ) : (
                  <div className="flex items-center gap-2 bg-stone-100 p-2 rounded-md border border-stone-200 pr-8">
                    <FileText size={16} className="text-stone-500" />
                    <span className="text-xs truncate max-w-[150px] text-stone-700 font-medium">{attachment.name || 'Document'}</span>
                  </div>
                )}
                <button
                  onClick={() => setAttachment(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
              <input
                type="file"
                accept="image/*,application/pdf,text/plain,.csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-stone-400 hover:text-amber-600 transition-colors"
                title="Upload File"
              >
                <Paperclip size={20} />
              </button>
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-2 transition-colors ${isRecording ? 'text-red-500 animate-pulse' : 'text-stone-400 hover:text-amber-600'}`}
                title={isRecording ? "Stop Recording" : "Record Voice"}
              >
                {isRecording ? <Square size={20} /> : <Mic size={20} />}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your answer..."
                disabled={isProcessing}
                className="flex-1 pl-4 pr-12 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={(!input.trim() && !attachment) || isProcessing}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-stone-400 hover:text-amber-600 disabled:opacity-50 transition-colors"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50">
          {fields.length === 0 ? (
            <p className="text-center text-stone-500 mt-10 text-sm">No fields detected yet.</p>
          ) : (
            fields.map((field) => (
              <div key={field.id} className="bg-white p-3 rounded-lg border border-stone-200 shadow-sm flex flex-col gap-2">
                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">{field.label}</label>
                <textarea
                  value={field.value || ''}
                  onChange={(e) => onUpdateField(field.id, { value: e.target.value })}
                  placeholder="Empty"
                  className="w-full bg-stone-50 border border-stone-200 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y min-h-[40px]"
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
