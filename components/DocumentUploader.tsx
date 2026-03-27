'use client';

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';

interface DocumentUploaderProps {
  onUpload: (file: File) => void;
  isProcessing: boolean;
}

export function DocumentUploader({ onUpload, isProcessing }: DocumentUploaderProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles[0]);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-stone-900">
            Cahier de Charge Automator
          </h1>
          <p className="text-lg text-stone-600">
            Upload your specification document (PDF). We&apos;ll use AI to detect fillable areas and automatically overlay your company data with a realistic handwritten style.
          </p>
        </div>

        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-3xl p-16 transition-all duration-200 ease-in-out cursor-pointer
            ${isDragActive ? 'border-amber-500 bg-amber-50' : 'border-stone-300 hover:border-amber-400 hover:bg-stone-50'}
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-white rounded-full shadow-sm border border-stone-100">
              <UploadCloud className={`w-10 h-10 ${isDragActive ? 'text-amber-500' : 'text-stone-400'}`} />
            </div>
            {isProcessing ? (
              <p className="text-lg font-medium text-stone-600">Processing document...</p>
            ) : isDragActive ? (
              <p className="text-lg font-medium text-amber-600">Drop the PDF here...</p>
            ) : (
              <div className="text-stone-600">
                <p className="text-lg font-medium">Drag & drop your PDF here</p>
                <p className="text-sm mt-1">or click to browse files</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
