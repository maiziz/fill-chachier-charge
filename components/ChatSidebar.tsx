'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, CheckCircle2, Circle } from 'lucide-react';
import { Field } from '../types';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSidebarProps {
  fields: Field[];
  messages: Message[];
  onSendMessage: (message: string) => void;
  isProcessing: boolean;
}

export function ChatSidebar({ fields, messages, onSendMessage, isProcessing }: ChatSidebarProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const filledCount = fields.filter((f) => f.value).length;
  const totalCount = fields.length;
  const progress = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

  return (
    <div className="w-96 bg-white border-l border-stone-200 flex flex-col h-full shadow-lg z-10">
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
                <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-stone-800 prose-pre:text-stone-100">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
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
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer..."
            disabled={isProcessing}
            className="w-full pl-4 pr-12 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-stone-400 hover:text-amber-600 disabled:opacity-50 transition-colors"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
