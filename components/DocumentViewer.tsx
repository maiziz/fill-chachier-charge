'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Field } from '../types';
import { Rnd } from 'react-rnd';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Plus, Minus, Copy, PlusSquare, RotateCcw, RotateCw, Trash2 } from 'lucide-react';

interface DocumentViewerProps {
  pages: string[];
  fields: Field[];
  isHandwritten: boolean;
  globalFont: string;
  defaultFontSize: number;
  onUpdateField: (id: string, updates: Partial<Field>) => void;
  onCloneField: (id: string) => void;
  onAddField: (pageIndex: number) => void;
  onDeleteField: (id: string) => void;
}

export function DocumentViewer({ pages, fields, isHandwritten, globalFont, defaultFontSize, onUpdateField, onCloneField, onAddField, onDeleteField }: DocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageDimensions, setImageDimensions] = useState<{ [key: number]: { width: number; height: number } }>({});
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

  const handleImageLoad = (index: number, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions(prev => ({
      ...prev,
      [index]: { width: img.clientWidth, height: img.clientHeight }
    }));
  };

  return (
    <div className="flex-1 overflow-y-auto bg-stone-200 p-8 flex flex-col items-center space-y-8" ref={containerRef} onClick={(e) => {
      if (e.target === containerRef.current) setActiveFieldId(null);
    }}>
      {pages.map((page, index) => {
        const pageFields = fields.filter((f) => f.pageIndex === index);
        const dimensions = imageDimensions[index] || { width: 800, height: 1131 };

        return (
          <div
            key={index}
            id={`pdf-page-${index}`}
            className="relative bg-white shadow-xl rounded-sm overflow-hidden group/page"
            style={{ width: '800px', minHeight: '1131px' }} // A4 aspect ratio approx
          >
            <button
              onClick={() => onAddField(index)}
              className="absolute top-4 right-4 z-30 bg-white/90 hover:bg-white p-2 rounded-md shadow-md text-stone-600 opacity-0 group-hover/page:opacity-100 transition-opacity flex items-center gap-2 border border-stone-200"
              title="Add manual text field"
            >
              <PlusSquare size={16} className="text-amber-600" />
              <span className="text-xs font-medium">Add Field</span>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={page}
              alt={`Page ${index + 1}`}
              className="w-full h-auto block"
              style={{ pointerEvents: 'none' }}
              onLoad={(e) => handleImageLoad(index, e)}
            />

            {pageFields.map((field) => {
              const top = (field.boundingBox.ymin / 1000) * dimensions.height;
              const left = (field.boundingBox.xmin / 1000) * dimensions.width;
              const width = ((field.boundingBox.xmax - field.boundingBox.xmin) / 1000) * dimensions.width;
              const height = ((field.boundingBox.ymax - field.boundingBox.ymin) / 1000) * dimensions.height;

              const hasValue = !!field.value;
              const isArabic = field.value ? /[\u0600-\u06FF]/.test(field.value) : false;
              const isActive = activeFieldId === field.id;

              return (
                <Rnd
                  key={field.id}
                  className={`absolute flex items-end pb-1 px-1 overflow-visible group z-10
                    ${!hasValue ? 'border border-dashed border-amber-400 bg-amber-400/10' : 'hover:border hover:border-dashed hover:border-blue-400 hover:bg-blue-400/10'}
                    ${isActive ? 'active-ring ring-2 ring-blue-500 z-20' : ''}
                  `}
                  bounds="parent"
                  position={{ x: left, y: top }}
                  size={{ width, height }}
                  dragHandleClassName="drag-handle"
                  onDragStop={(e, d) => {
                    const newXmin = (d.x / dimensions.width) * 1000;
                    const newYmin = (d.y / dimensions.height) * 1000;
                    const newXmax = newXmin + (width / dimensions.width) * 1000;
                    const newYmax = newYmin + (height / dimensions.height) * 1000;
                    onUpdateField(field.id, {
                      boundingBox: { xmin: newXmin, ymin: newYmin, xmax: newXmax, ymax: newYmax }
                    });
                  }}
                  onResizeStop={(e, direction, ref, delta, position) => {
                    const newWidth = ref.offsetWidth;
                    const newHeight = ref.offsetHeight;
                    const newXmin = (position.x / dimensions.width) * 1000;
                    const newYmin = (position.y / dimensions.height) * 1000;
                    const newXmax = newXmin + (newWidth / dimensions.width) * 1000;
                    const newYmax = newYmin + (newHeight / dimensions.height) * 1000;
                    onUpdateField(field.id, {
                      boundingBox: { xmin: newXmin, ymin: newYmin, xmax: newXmax, ymax: newYmax }
                    });
                  }}
                  title={field.label}
                  onClick={() => setActiveFieldId(field.id)}
                >
                  {/* Drag Handle */}
                  <div className="drag-handle absolute top-0 left-0 w-4 h-4 bg-blue-500/50 cursor-move opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-br-sm" title="Drag to move" />
                  
                  {/* Floating Toolbar */}
                  {isActive && (
                    <div className="floating-toolbar absolute -top-12 left-0 bg-white shadow-lg rounded-md border border-stone-200 flex items-center p-1 gap-1 z-50 whitespace-nowrap">
                      <select
                        value={field.styles?.fontFamily || globalFont || (isHandwritten ? (isArabic ? 'var(--font-handwriting-arabic)' : 'var(--font-handwriting-latin)') : 'var(--font-sans)')}
                        onChange={(e) => onUpdateField(field.id, { styles: { ...field.styles, fontFamily: e.target.value }})}
                        className="text-xs border rounded px-1 py-1 bg-stone-50 hover:bg-stone-100 outline-none"
                      >
                        <optgroup label="Handwritten">
                          <option value="var(--font-handwriting-latin)">Caveat</option>
                          <option value="var(--font-dancing-script)">Dancing Script</option>
                          <option value="var(--font-indie-flower)">Indie Flower</option>
                          <option value="var(--font-handwriting-arabic)">Aref Ruqaa (Arabic)</option>
                        </optgroup>
                        <optgroup label="Typed">
                          <option value="var(--font-sans)">Inter</option>
                          <option value="var(--font-roboto-mono)">Roboto Mono</option>
                          <option value="monospace">Monospace</option>
                          <option value="serif">Serif</option>
                        </optgroup>
                      </select>
                      <div className="w-px h-4 bg-stone-300 mx-1" />
                      <button onClick={() => onUpdateField(field.id, { styles: { ...field.styles, fontWeight: field.styles?.fontWeight === 'bold' ? 'normal' : 'bold' }})} className={`p-1 rounded hover:bg-stone-100 ${field.styles?.fontWeight === 'bold' ? 'bg-stone-200' : ''}`}><Bold size={14} /></button>
                      <button onClick={() => onUpdateField(field.id, { styles: { ...field.styles, fontStyle: field.styles?.fontStyle === 'italic' ? 'normal' : 'italic' }})} className={`p-1 rounded hover:bg-stone-100 ${field.styles?.fontStyle === 'italic' ? 'bg-stone-200' : ''}`}><Italic size={14} /></button>
                      <button onClick={() => onUpdateField(field.id, { styles: { ...field.styles, textDecoration: field.styles?.textDecoration === 'underline' ? 'none' : 'underline' }})} className={`p-1 rounded hover:bg-stone-100 ${field.styles?.textDecoration === 'underline' ? 'bg-stone-200' : ''}`}><Underline size={14} /></button>
                      <div className="w-px h-4 bg-stone-300 mx-1" />
                      <button onClick={() => onUpdateField(field.id, { styles: { ...field.styles, textAlign: 'left' }})} className={`p-1 rounded hover:bg-stone-100 ${field.styles?.textAlign === 'left' || !field.styles?.textAlign ? 'bg-stone-200' : ''}`}><AlignLeft size={14} /></button>
                      <button onClick={() => onUpdateField(field.id, { styles: { ...field.styles, textAlign: 'center' }})} className={`p-1 rounded hover:bg-stone-100 ${field.styles?.textAlign === 'center' ? 'bg-stone-200' : ''}`}><AlignCenter size={14} /></button>
                      <button onClick={() => onUpdateField(field.id, { styles: { ...field.styles, textAlign: 'right' }})} className={`p-1 rounded hover:bg-stone-100 ${field.styles?.textAlign === 'right' ? 'bg-stone-200' : ''}`}><AlignRight size={14} /></button>
                      <div className="w-px h-4 bg-stone-300 mx-1" />
                      <button onClick={() => onUpdateField(field.id, { styles: { ...field.styles, fontSize: (field.styles?.fontSize || defaultFontSize) - 2 }})} className="p-1 rounded hover:bg-stone-100"><Minus size={14} /></button>
                      <span className="text-xs font-medium w-4 text-center">{field.styles?.fontSize || defaultFontSize}</span>
                      <button onClick={() => onUpdateField(field.id, { styles: { ...field.styles, fontSize: (field.styles?.fontSize || defaultFontSize) + 2 }})} className="p-1 rounded hover:bg-stone-100"><Plus size={14} /></button>
                      <div className="w-px h-4 bg-stone-300 mx-1" />
                      <button onClick={() => {
                        const currentRotation = parseInt(field.styles?.transform?.replace(/[^0-9-]/g, '') || '0');
                        onUpdateField(field.id, { styles: { ...field.styles, transform: `rotate(${currentRotation - 1}deg)` }});
                      }} className="p-1 rounded hover:bg-stone-100" title="Rotate Left"><RotateCcw size={14} /></button>
                      <button onClick={() => {
                        const currentRotation = parseInt(field.styles?.transform?.replace(/[^0-9-]/g, '') || '0');
                        onUpdateField(field.id, { styles: { ...field.styles, transform: `rotate(${currentRotation + 1}deg)` }});
                      }} className="p-1 rounded hover:bg-stone-100" title="Rotate Right"><RotateCw size={14} /></button>
                      <div className="w-px h-4 bg-stone-300 mx-1" />
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-stone-500 font-medium">W:</span>
                        <input type="number" value={Math.round(width)} onChange={(e) => {
                          const newWidth = parseInt(e.target.value) || 10;
                          const newXmax = (field.boundingBox.xmin / 1000) * dimensions.width + newWidth;
                          onUpdateField(field.id, { boundingBox: { ...field.boundingBox, xmax: (newXmax / dimensions.width) * 1000 } });
                        }} className="w-12 text-xs border rounded px-1 py-0.5 outline-none" />
                        <span className="text-[10px] text-stone-500 font-medium ml-1">H:</span>
                        <input type="number" value={Math.round(height)} onChange={(e) => {
                          const newHeight = parseInt(e.target.value) || 10;
                          const newYmax = (field.boundingBox.ymin / 1000) * dimensions.height + newHeight;
                          onUpdateField(field.id, { boundingBox: { ...field.boundingBox, ymax: (newYmax / dimensions.height) * 1000 } });
                        }} className="w-12 text-xs border rounded px-1 py-0.5 outline-none" />
                      </div>
                      <div className="w-px h-4 bg-stone-300 mx-1" />
                      <button onClick={() => onCloneField(field.id)} className="p-1 rounded hover:bg-stone-100 text-blue-600" title="Clone Field"><Copy size={14} /></button>
                      <button onClick={() => onDeleteField(field.id)} className="p-1 rounded hover:bg-stone-100 text-red-600" title="Delete Field"><Trash2 size={14} /></button>
                    </div>
                  )}

                  {hasValue ? (
                    <textarea
                      value={field.value || ''}
                      onChange={(e) => onUpdateField(field.id, { value: e.target.value })}
                      onFocus={() => setActiveFieldId(field.id)}
                      className={`
                        w-full h-full bg-transparent border-none outline-none text-blue-900 leading-tight resize-none overflow-hidden
                        ${!(field.styles?.fontFamily || globalFont) ? (isHandwritten ? (isArabic ? 'font-handwriting-arabic' : 'font-handwriting-latin') : 'font-sans') : ''}
                      `}
                      style={{
                        fontSize: field.styles?.fontSize ? `${field.styles.fontSize}px` : `${defaultFontSize}px`,
                        textAlign: field.styles?.textAlign || 'left',
                        textDecoration: field.styles?.textDecoration || 'none',
                        fontWeight: field.styles?.fontWeight || 'normal',
                        fontStyle: field.styles?.fontStyle || 'normal',
                        transform: field.styles?.transform || 'none',
                        fontFamily: field.styles?.fontFamily || globalFont || undefined,
                      }}
                      dir={isArabic ? 'rtl' : 'ltr'}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col justify-end">
                      <textarea
                        placeholder={field.label}
                        onChange={(e) => onUpdateField(field.id, { value: e.target.value })}
                        onFocus={() => setActiveFieldId(field.id)}
                        className="w-full h-full bg-transparent border-none outline-none text-[10px] text-amber-600 font-medium resize-none overflow-hidden placeholder:text-amber-600/70"
                      />
                    </div>
                  )}
                </Rnd>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
