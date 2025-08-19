// components/SchemaValidationStatus.tsx
import React from 'react';
import type { SchemaValidationState } from '../types/uploadTypes';

interface SchemaValidationStatusProps {
  loadType: string;
  schemaValidationState: SchemaValidationState;
  selectedSourceLayer?: string;
  selectedTable?: string;
}

export const SchemaValidationStatus: React.FC<SchemaValidationStatusProps> = ({
  loadType,
  schemaValidationState,
  selectedSourceLayer,
  selectedTable,
}) => {
  if (loadType === 'full' || loadType === '') {
    return null;
  }

  const getStatusBadge = () => {
    switch (schemaValidationState) {
      case 'not_started':
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
            ⏳ Not Started
          </span>
        );
      case 'validating':
        return (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
            🔄 Validating...
          </span>
        );
      case 'layer_selection':
        return (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-full">
            📋 Layer Selection Required
          </span>
        );
      case 'mapping':
        return (
          <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm rounded-full">
            🔗 Column Mapping in Progress
          </span>
        );
      case 'completed':
        return (
          <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
            ✅ Validation Complete
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mb-6 p-4 rounded-lg border">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-800">Schema Validation Status:</h4>
          <div className="mt-2">
            {getStatusBadge()}
          </div>
          {selectedSourceLayer && (
            <p className="text-xs text-gray-600 mt-1">
              Selected Layer: {selectedSourceLayer}
            </p>
          )}
          {selectedTable && (
            <p className="text-xs text-gray-600 mt-1">
              Target Table: {selectedTable}
            </p>
          )}
        </div>
        {schemaValidationState === 'completed' && (
          <div className="text-green-600">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};