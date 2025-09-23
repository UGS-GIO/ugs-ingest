import React from 'react';
import type { SchemaValidationState, LayerTableMapping } from '../types/uploadTypes';

interface EnhancedActionButtonsProps {
  loadType: string;
  schemaValidationState: SchemaValidationState;
  isValidatingSchema: boolean;
  isSubmitting: boolean;
  isProcessingFolders: boolean;
  selectedFilesCount: number;
  selectedLayersCount: number;
  layerTableMappings: LayerTableMapping[];
  domain: string;
  uploadMessage: string;
  onSchemaValidation: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const EnhancedActionButtons: React.FC<EnhancedActionButtonsProps> = ({
  loadType,
  schemaValidationState,
  isValidatingSchema,
  isSubmitting,
  isProcessingFolders,
  selectedFilesCount,
  selectedLayersCount,
  layerTableMappings,
  domain,
  uploadMessage,
  onSchemaValidation,
  onSubmit,
}) => {
  // Determine the current workflow state and what actions are available
  const getWorkflowState = () => {
    if (loadType === 'full' || loadType === '') {
      return {
        showSchemaValidation: false,
        schemaButtonText: '',
        schemaButtonDisabled: true,
        uploadDisabled: isSubmitting || isProcessingFolders || selectedFilesCount === 0 || !domain || !loadType,
        workflowMessage: loadType === 'full' ? 'Full load - no schema validation required.' : 'Select a load type to continue.'
      };
    }

    const completedMappings = layerTableMappings.filter(m => m.isComplete).length;
    const totalMappings = layerTableMappings.length;

    switch (schemaValidationState) {
      case 'not_started':
        return {
          showSchemaValidation: true,
          schemaButtonText: '🔍 Analyze Files & Validate Schema',
          schemaButtonDisabled: isValidatingSchema || selectedFilesCount === 0 || !domain || !loadType,
          uploadDisabled: true,
          workflowMessage: 'Click to analyze your files and begin schema validation.'
        };

      case 'validating':
        return {
          showSchemaValidation: true,
          schemaButtonText: 'Analyzing Files...',
          schemaButtonDisabled: true,
          uploadDisabled: true,
          workflowMessage: 'Analyzing file structure and extracting schema information.'
        };

      case 'layer_selection':
        return {
          showSchemaValidation: false,
          schemaButtonText: '',
          schemaButtonDisabled: true,
          uploadDisabled: true,
          workflowMessage: 'Multiple layers found. Please select which layers to process in the modal above.'
        };

      case 'table_mapping':
        return {
          showSchemaValidation: false,
          schemaButtonText: '',
          schemaButtonDisabled: true,
          uploadDisabled: true,
          workflowMessage: `Map each of the ${selectedLayersCount} selected layers to a target database table.`
        };

      case 'column_mapping':
        return {
          showSchemaValidation: false,
          schemaButtonText: '',
          schemaButtonDisabled: true,
          uploadDisabled: true,
          workflowMessage: `Configure column mappings for each layer-table pair (${completedMappings}/${totalMappings} complete).`
        };

      case 'completed':
        return {
          showSchemaValidation: false,
          schemaButtonText: '',
          schemaButtonDisabled: true,
          uploadDisabled: isSubmitting || isProcessingFolders,
          workflowMessage: `✅ Schema validation complete! ${totalMappings} layer-table mappings configured. Ready to upload.`
        };

      default:
        return {
          showSchemaValidation: true,
          schemaButtonText: '🔍 Validate Schema',
          schemaButtonDisabled: true,
          uploadDisabled: true,
          workflowMessage: 'Unknown validation state.'
        };
    }
  };

  const workflowState = getWorkflowState();

  return (
    <div className="flex flex-col gap-4 mt-8">
      {/* Workflow Status Message */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-blue-800 text-sm font-medium mb-1">
          📋 Workflow Status
        </p>
        <p className="text-blue-700 text-sm">
          {workflowState.workflowMessage}
        </p>
        
        {/* Progress indicators for multi-layer workflows */}
        {schemaValidationState !== 'not_started' && schemaValidationState !== 'validating' && layerTableMappings.length > 1 && (
          <div className="mt-3 space-y-2">
            {/* Layer Selection Progress */}
            {selectedLayersCount > 0 && (
              <div className="flex items-center text-xs text-blue-600">
                <span className="mr-2">📊</span>
                <span>{selectedLayersCount} layers selected for processing</span>
              </div>
            )}
            
            {/* Table Mapping Progress */}
            {layerTableMappings.some(m => m.targetTable) && (
              <div className="flex items-center text-xs text-blue-600">
                <span className="mr-2">🎯</span>
                <span>{layerTableMappings.filter(m => m.targetTable).length}/{layerTableMappings.length} layers mapped to tables</span>
              </div>
            )}
            
            {/* Column Mapping Progress */}
            {layerTableMappings.some(m => m.isComplete) && (
              <div className="flex items-center text-xs text-blue-600">
                <span className="mr-2">🔗</span>
                <span>{layerTableMappings.filter(m => m.isComplete).length}/{layerTableMappings.length} column mappings complete</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Schema Validation Button - Only show when needed */}
      {workflowState.showSchemaValidation && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onSchemaValidation}
            disabled={workflowState.schemaButtonDisabled}
            className="px-6 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 text-base font-semibold"
          >
            {isValidatingSchema ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Analyzing Files...
              </div>
            ) : (
              workflowState.schemaButtonText
            )}
          </button>
          
          <div className="text-sm text-gray-600">
            {schemaValidationState === 'not_started' 
              ? 'Schema validation required for non-full load types' 
              : 'Follow the workflow steps to complete validation'
            }
          </div>
        </div>
      )}

      {/* Upload Button */}
      <div className="flex items-center justify-between">
        <button
          type="submit"
          onClick={onSubmit}
          disabled={workflowState.uploadDisabled}
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
            <>
              🚀 Create & Upload Dataset
              {layerTableMappings.length > 1 && (
                <span className="ml-2 text-sm opacity-90">
                  ({layerTableMappings.length} layers)
                </span>
              )}
            </>
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
      {loadType !== 'full' && loadType !== '' && schemaValidationState !== 'completed' && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-800 text-sm font-medium mb-2">
            ⚠️ Multi-Layer Schema Validation Required
          </p>
          <div className="text-yellow-700 text-xs space-y-1">
            <p>For {loadType} load type, you must complete these steps:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Analyze files to discover available layers</li>
              <li>Select which layers to process</li>
              <li>Map each layer to a target database table</li>
              <li>Configure column mappings for each layer-table pair</li>
            </ul>
          </div>
        </div>
      )}

      {/* Multi-Layer Upload Info */}
      {schemaValidationState === 'completed' && layerTableMappings.length > 1 && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800 text-sm font-medium mb-2">
            🗂️ Multi-Layer Upload Ready
          </p>
          <div className="text-green-700 text-xs space-y-1">
            <p>Your upload will process {layerTableMappings.length} layers:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              {layerTableMappings.map(mapping => (
                <li key={mapping.layerName}>
                  <strong>{mapping.layerName}</strong> → {mapping.targetTable}
                </li>
              ))}
            </ul>
            <p className="mt-2 font-medium">Each layer will be processed as a separate table during ingestion.</p>
          </div>
        </div>
      )}
    </div>
  );
};
      