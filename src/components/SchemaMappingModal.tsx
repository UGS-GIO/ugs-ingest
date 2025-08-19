// components/SchemaMappingModal.tsx
import React from 'react';
import type { TableInfo, ColumnInfo } from '../types/uploadTypes';

interface SchemaMappingModalProps {
  isOpen: boolean;
  selectedSourceLayer?: string;
  sourceColumns: string[];
  selectedTable: string;
  availableTables: TableInfo[];
  targetColumns: ColumnInfo[];
  columnMapping: {[key: string]: string};
  onTableSelect: (tableFullName: string) => void;
  onColumnMap: (sourceCol: string, targetCol: string) => void;
  onComplete: () => void;
  onCancel: () => void;
  isComplete: boolean;
}

export const SchemaMappingModal: React.FC<SchemaMappingModalProps> = ({
  isOpen,
  selectedSourceLayer,
  sourceColumns,
  selectedTable,
  availableTables,
  targetColumns,
  columnMapping,
  onTableSelect,
  onColumnMap,
  onComplete,
  onCancel,
  isComplete,
}) => {
  if (!isOpen) return null;

  const unmappedColumns = sourceColumns.filter(col => !columnMapping[col]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Schema Validation & Column Mapping</h2>
        
        {/* Show selected layer info if applicable */}
        {selectedSourceLayer && (
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-800 font-semibold mb-1">
              📊 Source Layer: {selectedSourceLayer}
            </p>
            <p className="text-blue-700 text-sm">
              Mapping {sourceColumns.length} columns from the selected geodatabase layer to target table schema.
            </p>
          </div>
        )}

        {/* Table Selection */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">
            Select Target Table:
          </label>
          <select
            value={selectedTable}
            onChange={(e) => onTableSelect(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a target table...</option>
            {availableTables.map(table => (
              <option key={table.fullName} value={table.fullName}>
                {table.displayName}
              </option>
            ))}
          </select>
        </div>

        {selectedTable && targetColumns.length > 0 && (
          <>
            {/* Column Mapping Interface */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Source Columns */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Your File Columns ({sourceColumns.length})
                  {selectedSourceLayer && (
                    <span className="text-sm text-gray-600 ml-2">from {selectedSourceLayer}</span>
                  )}
                </h3>
                <div className="border border-gray-300 rounded-md p-4 bg-gray-50 max-h-64 overflow-y-auto">
                  {sourceColumns.map(column => (
                    <div key={column} className="mb-2">
                      <div className={`p-2 rounded border ${
                        columnMapping[column] 
                          ? 'bg-green-100 border-green-300' 
                          : 'bg-yellow-100 border-yellow-300'
                      }`}>
                        <span className="font-medium">{column}</span>
                        {columnMapping[column] && (
                          <span className="text-sm text-green-600 ml-2">
                            → {columnMapping[column]}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target Columns */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Target Table Columns ({targetColumns.length})
                </h3>
                <div className="border border-gray-300 rounded-md p-4 bg-gray-50 max-h-64 overflow-y-auto">
                  {targetColumns.map(column => (
                    <div key={column.name} className="mb-2">
                      <div className="p-2 rounded border border-gray-200 bg-white">
                        <span className="font-medium">{column.name}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({column.dataType})
                        </span>
                        {!column.isNullable && (
                          <span className="text-xs text-red-500 ml-2">Required</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Manual Mapping Interface */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Column Mapping</h3>
              {sourceColumns.map(sourceCol => (
                <div key={sourceCol} className="mb-3 p-3 border border-gray-200 rounded-md">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <span className="font-medium text-gray-800">{sourceCol}</span>
                    </div>
                    <div className="text-gray-500">→</div>
                    <div className="flex-1">
                      <select
                        value={columnMapping[sourceCol] || ''}
                        onChange={(e) => onColumnMap(sourceCol, e.target.value)}
                        className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">Select target column...</option>
                        {targetColumns.map(targetCol => (
                          <option key={targetCol.name} value={targetCol.name}>
                            {targetCol.name} ({targetCol.dataType})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Validation Status */}
            <div className="mb-6">
              {unmappedColumns.length > 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-yellow-800 font-medium">
                    ⚠️ Unmapped columns ({unmappedColumns.length}):
                  </p>
                  <p className="text-yellow-700 text-sm mt-1">
                    {unmappedColumns.join(', ')}
                  </p>
                  <p className="text-yellow-600 text-xs mt-2">
                    All source columns must be mapped before proceeding.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-800 font-medium">
                    ✅ All columns mapped successfully!
                  </p>
                  <p className="text-green-600 text-sm mt-1">
                    Schema validation is complete. You can now close this dialog and proceed with upload.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Modal Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          {isComplete && (
            <button
              onClick={onComplete}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Complete Validation
            </button>
          )}
        </div>
      </div>
    </div>
  );
};