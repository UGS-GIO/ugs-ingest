// components/FileUploadSection.tsx
import React from 'react';
import type { DragEvent } from 'react';
import type { FormData, FormErrors } from '../types/uploadTypes';

interface FileUploadSectionProps {
  formData: FormData;
  errors: FormErrors;
  isDragging: boolean;
  isProcessingFolders: boolean;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => Promise<void>;
  onFileOrFolderSelect: () => Promise<void>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
}

export const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  formData,
  errors,
  isDragging,
  isProcessingFolders,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileOrFolderSelect,
  onFileChange,
  onRemoveFile,
}) => {
  // Helper function to group files by directory for better display
  const groupFilesByDirectory = (files: File[]) => {
    const groups: { [key: string]: File[] } = {};
    
    files.forEach(file => {
      const pathParts = file.name.split('/');
      if (pathParts.length > 1) {
        const directory = pathParts[0];
        if (!groups[directory]) groups[directory] = [];
        groups[directory].push(file);
      } else {
        if (!groups['Files']) groups['Files'] = [];
        groups['Files'].push(file);
      }
    });
    
    return groups;
  };

  const fileGroups = groupFilesByDirectory(formData.selectedFiles);

  return (
    <div className="mb-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
        Data Files
      </h3>
      
      <label htmlFor="file-input" className="block text-gray-700 font-semibold mb-2">
        Select Data Files or Folders: <span className="text-red-500">*</span>
      </label>
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center text-gray-500 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[150px] ${
          isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : errors.selectedFiles 
              ? 'border-red-500' 
              : 'border-gray-400'
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          type="file"
          id="file-input"
          multiple
          onChange={onFileChange}
          className="hidden"
          accept="*/*"
        />
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {isProcessingFolders ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <p>Processing folders...</p>
          </div>
        ) : (
          <>
            <p className="mb-2">Drag & drop files or folders here (including .gdb), or</p>
            <button
              type="button"
              onClick={onFileOrFolderSelect}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-base"
            >
              Choose Files or Folder
            </button>
            <p className="text-xs text-gray-500 mt-2">
              ✅ Supports File Geodatabases (.gdb folders)<br/>
              ✅ Shapefiles, CSVs, and other individual files<br/>
              ✅ Multiple selection with Ctrl/Cmd<br/>
              💡 Button will ask whether you want files or folders
            </p>
          </>
        )}
        
        {/* Selected Files Display */}
        {formData.selectedFiles.length > 0 && (
          <div className="mt-4 w-full">
            <div className="text-left">
              <p className="font-bold text-green-800 mb-2">
                Selected Files ({formData.selectedFiles.length}):
              </p>
              <div className="max-h-64 overflow-y-auto space-y-3">
                {Object.entries(fileGroups).map(([groupName, files]) => (
                  <div key={groupName} className="border border-green-200 rounded-md">
                    <div className="bg-green-100 px-3 py-2 border-b border-green-200">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-green-800">
                          {groupName.endsWith('.gdb') ? `📁 ${groupName} (File Geodatabase)` : `📁 ${groupName}`}
                        </span>
                        <span className="text-sm text-green-600">
                          {files.length} file{files.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                      {files.map((file, fileIndex) => {
                        const globalIndex = formData.selectedFiles.indexOf(file);
                        return (
                          <div key={fileIndex} className="flex items-center justify-between p-2 border-b border-green-100 last:border-b-0 hover:bg-green-50">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-green-800 truncate">
                                {file.name.includes('/') ? file.name.split('/').pop() : file.name}
                              </p>
                              <p className="text-xs text-green-600">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onRemoveFile(globalIndex)}
                              className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded"
                              title="Remove file"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-2 border-t border-green-200">
                <p className="text-sm text-green-600">
                  Total Size: {(formData.selectedFiles.reduce((total, file) => total + file.size, 0) / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      {errors.selectedFiles && <p className="text-red-500 text-sm mt-1">{errors.selectedFiles}</p>}
    </div>
  );
};