'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Settings2, FolderOpen, Trash2, Clock } from 'lucide-react';
import { Project } from '../types';
import { getAllProjects, deleteProject } from '../lib/storage';

interface DocumentUploaderProps {
  onUpload: (file: File) => void;
  isProcessing: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
  onLoadProject: (project: Project) => void;
}

export function DocumentUploader({ onUpload, isProcessing, selectedModel, onModelChange, onLoadProject }: DocumentUploaderProps) {
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    getAllProjects().then(saved => setProjects(saved)).catch(e => console.error('Failed to load projects', e));
  }, []);

  const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      await deleteProject(id);
      getAllProjects().then(saved => setProjects(saved)).catch(e => console.error('Failed to load projects', e));
    }
  };

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

  const models = [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' },
    { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite' },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 relative">
      <div className="absolute top-6 right-6">
        <div className="relative">
          <button 
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-lg shadow-sm transition-colors"
            title="Select AI Model"
          >
            <Settings2 size={18} />
            <span className="text-sm font-medium">
              {models.find(m => m.id === selectedModel)?.name || 'Select Model'}
            </span>
          </button>
          {showModelSelector && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-stone-200 rounded-lg shadow-xl overflow-hidden z-50">
              {models.map(model => (
                <button
                  key={model.id}
                  onClick={() => {
                    onModelChange(model.id);
                    setShowModelSelector(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-stone-50 transition-colors ${selectedModel === model.id ? 'bg-amber-50 text-amber-700 font-medium' : 'text-stone-700'}`}
                >
                  {model.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

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

      {projects.length > 0 && (
        <div className="max-w-2xl w-full mt-12">
          <h2 className="text-xl font-semibold text-stone-800 mb-4 flex items-center gap-2">
            <FolderOpen size={20} className="text-amber-600" />
            Recent Projects
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {projects.map(project => (
              <div 
                key={project.id}
                onClick={() => onLoadProject(project)}
                className="bg-white border border-stone-200 rounded-xl p-4 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group flex flex-col"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-stone-800 truncate pr-4">{project.name}</h3>
                  <button 
                    onClick={(e) => handleDeleteProject(e, project.id)}
                    className="text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Project"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-auto flex items-center gap-4 text-xs text-stone-500">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                  <span>{project.pages.length} pages</span>
                  <span>{project.fields.filter(f => f.value).length}/{project.fields.length} filled</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
