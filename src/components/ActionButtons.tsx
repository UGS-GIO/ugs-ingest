// components/ActionButtons.tsx
import React from 'react';
import type { SchemaValidationState } from '../types/uploadTypes';

interface ActionButtonsProps {
  loadType: string;
  schemaValidationState: SchemaValidationState;
  isValidatingSchema: boolean;
  isSubmitting: boolean;
  isProcessingFolders: boolean;
  selectedFilesCount: number;
  domain: string;
  uploadMessage: string;
  onSchemaValidation: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  loadType,
  schemaValidationState,
  isValidatingSchema,
  isSubmitting,
  isProcessingFolders,
  selectedFilesCount,
  domain,
  uploadMessage,
  onSchemaValidation,
  onSubmit,
}) => {
  const isSchemaValidationRequired = loadType !== 'full' && loadType !== '';
  const isSchemaValidationDisabled = isValidatingSchema || selectedFilesCount === 0 || !domain || !loadType;
  const isUploadDisabled = isSubmitting || isProcessingFolders || (isSchemaValidationRequired && schemaValidationState !== 'completed');

  return (
    <div className="flex flex-col gap-4 mt-8">
      {/* Schema Validation Button - Only show for non-full load types */}
      {isSchemaValidationRequired && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onSchemaValidation}
            disabled={isSchemaValidationDisabled}
            className="px-6 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 text-base font-semibold"
          >
            {isValidatingSchema ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Validating Schema...
              </div>
            ) : (
              '🔍 Validate Schema & Map Columns'
            )}
          </button>
          
          {schemaValidationState !== 'not_started' && (
            <div className="text-sm text-gray-600">
              Schema validation required for {loadType} load type
            </div>
          )}
        </div>
      )}

      {/* Upload Button */}
      <div className="flex items-center justify-between">
        <button
          type="submit"
          onClick={onSubmit}
          disabled={isUploadDisabled}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 text-base font-semibold"
        >
          {isSubmitting ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {uploadMessage.includes('Creating') ? 'Creating Zip...' : 
               uploadMessage.includes('Uploading') ? 'Uploading...' : 
               'Processing...'}
            </div>
          ) : (
            '🚀 Create & Upload Dataset'
          )}
        </button>
        
        {/* Upload Status Message */}
        {uploadMessage && (
          <div className={`ml-4 p-3 rounded-md font-medium max-w-md ${
            uploadMessage.includes('error') || uploadMessage.includes('failed') || uploadMessage.includes('❌')
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : uploadMessage.includes('✅')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {uploadMessage}
          </div>
        )}
      </div>

      {/* Upload Requirements Info */}
      {isSchemaValidationRequired && schemaValidationState !== 'completed' && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-800 text-sm font-medium">
            ⚠️ Schema validation required before upload
          </p>
          <p className="text-yellow-700 text-xs mt-1">
            Please validate the schema and complete column mapping before uploading.
          </p>
        </div>
      )}
    </div>
  );
};