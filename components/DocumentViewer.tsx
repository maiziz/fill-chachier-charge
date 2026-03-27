'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Field } from '../types';
import { Rnd } from 'react-rnd';

interface DocumentViewerProps {
  pages: string[];
  fields: Field[];
  isHandwritten: boolean;
  onUpdateField: (id: string, updates: Partial<Field>) => void;
}

export function DocumentViewer({ pages, fields, isHandwritten, onUpdateField }: DocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageDimensions, setImageDimensions] = useState<{ [key: number]: { width: number; height: number } }>({});

  const handleImageLoad = (index: number, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions(prev => ({
      ...prev,
      [index]: { width: img.clientWidth, height: img.clientHeight }
    }));
  };

  return (
    <div className="flex-1 overflow-y-auto bg-stone-200 p-8 flex flex-col items-center space-y-8" ref={containerRef}>
      {pages.map((page, index) => {
        const pageFields = fields.filter((f) => f.pageIndex === index);
        const dimensions = imageDimensions[index] || { width: 800, height: 1131 };

        return (
          <div
            key={index}
            id={`pdf-page-${index}`}
            className="relative bg-white shadow-xl rounded-sm overflow-hidden"
            style={{ width: '800px', minHeight: '1131px' }} // A4 aspect ratio approx
          >
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

              return (
                <Rnd
                  key={field.id}
                  className={`absolute flex items-end pb-1 px-1 overflow-hidden group
                    ${!hasValue ? 'border border-dashed border-amber-400 bg-amber-400/10' : 'hover:border hover:border-dashed hover:border-blue-400 hover:bg-blue-400/10'}
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
                >
                  {/* Drag Handle */}
                  <div className="drag-handle absolute top-0 left-0 w-4 h-4 bg-blue-500/50 cursor-move opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-br-sm" title="Drag to move" />
                  
                  {hasValue ? (
                    <input
                      type="text"
                      value={field.value || ''}
                      onChange={(e) => onUpdateField(field.id, { value: e.target.value })}
                      className={`
                        w-full bg-transparent border-none outline-none text-blue-900 leading-none truncate
                        ${isHandwritten ? (isArabic ? 'font-handwriting-arabic text-2xl -rotate-1 origin-bottom-left' : 'font-handwriting-latin text-2xl -rotate-1 origin-bottom-left') : 'font-sans text-sm'}
                      `}
                      dir={isArabic ? 'rtl' : 'ltr'}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col justify-end">
                      <input
                        type="text"
                        placeholder={field.label}
                        onChange={(e) => onUpdateField(field.id, { value: e.target.value })}
                        className="w-full bg-transparent border-none outline-none text-[10px] text-amber-600 font-medium truncate placeholder:text-amber-600/70"
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
