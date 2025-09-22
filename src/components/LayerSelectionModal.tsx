// LayerSelectionModal.tsx - Complete implementation with column mapping
import React, { useState } from 'react';
import type { LayerInfo, TableInfo, ColumnInfo } from '../types/uploadTypes';

export interface LayerMapping {
  sourceLayer: string;
  targetTable: string;
  enabled: boolean;
  columnMapping: Record<string, string>;
  sourceColumns: string[];
  geometryType: string;
  featureCount: number;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
}

interface LayerSelectionModalProps {
  isOpen: boolean;
  layers: LayerInfo[];
  availableTables: TableInfo[];
  onConfirm: (layerMappings: LayerMapping[]) => void;
  onCancel: () => void;
  getTargetColumns: (tableFullName: string) => ColumnInfo[];
}

export const LayerSelectionModal: React.FC<LayerSelectionModalProps> = ({
  isOpen,
  layers,
  availableTables,
  onConfirm,
  onCancel,
  getTargetColumns,
}) => {
  const [selectedLayers, setSelectedLayers] = useState<string[]>([]);
  const [layerMappings, setLayerMappings] = useState<Record<string, LayerMapping>>({});
  const [currentStep, setCurrentStep] = useState<'selection' | 'mapping'>('selection');

  if (!isOpen) return null;

  const handleLayerToggle = (layerName: string) => {
    const newSelection = selectedLayers.includes(layerName)
      ? selectedLayers.filter(l => l !== layerName)
      : [...selectedLayers, layerName];
    
    setSelectedLayers(newSelection);
  };

  const handleSelectAll = () => {
    setSelectedLayers(layers.map(l => l.name));
  };

  const handleSelectNone = () => {
    setSelectedLayers([]);
  };

  const generateTargetTableName = (layerName: string, domain: string = 'hazards'): string => {
    const sanitized = layerName.toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    return `${domain}_${sanitized}`;
  };

  const proceedToMapping = () => {
    // Initialize mapping for each selected layer
    const mappings: Record<string, LayerMapping> = {};
    selectedLayers.forEach(layerName => {
      const layer = layers.find(l => l.name === layerName);
      if (layer) {
        mappings[layerName] = {
          sourceLayer: layerName,
          targetTable: generateTargetTableName(layerName),
          columnMapping: {},
          sourceColumns: layer.fields || [],
          geometryType: layer.geometryType || 'Unknown',
          featureCount: layer.featureCount || 0,
          enabled: true,
          processingStatus: 'pending'
        };
      }
    });
    setLayerMappings(mappings);
    setCurrentStep('mapping');
  };

  const handleTableSelection = (layerName: string, targetTable: string) => {
    setLayerMappings(prev => ({
      ...prev,
      [layerName]: {
        ...prev[layerName],
        targetTable,
        columnMapping: {} // Reset column mapping when table changes
      }
    }));
  };

  const handleColumnMapping = (layerName: string, sourceCol: string, targetCol: string) => {
    setLayerMappings(prev => ({
      ...prev,
      [layerName]: {
        ...prev[layerName],
        columnMapping: {
          ...prev[layerName].columnMapping,
          [sourceCol]: targetCol
        }
      }
    }));
  };

  const isLayerMappingComplete = (layerName: string): boolean => {
    const mapping = layerMappings[layerName];
    if (!mapping || !mapping.targetTable) return false;
    
    // Check if all source columns are mapped
    return mapping.sourceColumns.every(col => mapping.columnMapping[col]);
  };

  const isReadyToConfirm = (): boolean => {
    return selectedLayers.every(layerName => 
      layerMappings[layerName]?.enabled && isLayerMappingComplete(layerName)
    );
  };

  const handleConfirm = () => {
    const completedMappings = selectedLayers
      .map(layerName => layerMappings[layerName])
      .filter(mapping => mapping?.enabled);
    
    onConfirm(completedMappings);
  };

  if (currentStep === 'selection') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Select Layers to Process</h2>
          
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-800 font-semibold mb-2">
              📁 {layers.length} Layers Found in Geodatabase
            </p>
            <p className="text-blue-700 text-sm">
              Select multiple layers to process. Each layer will be converted to a separate table.
            </p>
          </div>

          <div className="mb-4 flex gap-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Select All
            </button>
            <button
              onClick={handleSelectNone}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            >
              Select None
            </button>
            <span className="text-sm text-gray-600 self-center ml-2">
              {selectedLayers.length} of {layers.length} selected
            </span>
          </div>
          
          <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
            {layers.map((layer) => (
              <div
                key={layer.name}
                className={`border rounded-lg p-3 cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedLayers.includes(layer.name)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleLayerToggle(layer.name)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      checked={selectedLayers.includes(layer.name)}
                      onChange={() => handleLayerToggle(layer.name)}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-800">{layer.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {layer.featureCount} features • {layer.geometryType}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Target table: {generateTargetTableName(layer.name)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={proceedToMapping}
              disabled={selectedLayers.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Proceed to Column Mapping ({selectedLayers.length})
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Column mapping step
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Configure Column Mappings</h2>
        
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-800 text-sm">
            Configure how columns from each layer should map to your target schema.
          </p>
        </div>

        <div className="space-y-6">
          {selectedLayers.map(layerName => {
            const mapping = layerMappings[layerName];
            const targetColumns = mapping?.targetTable ? getTargetColumns(mapping.targetTable) : [];
            const isComplete = isLayerMappingComplete(layerName);
            
            return (
              <div key={layerName} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {layerName}
                  </h3>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    isComplete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {isComplete ? 'Complete' : 'Incomplete'}
                  </div>
                </div>

                {/* Table Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Table:
                  </label>
                  <select
                    value={mapping?.targetTable || ''}
                    onChange={(e) => handleTableSelection(layerName, e.target.value)}
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

                {/* Column Mapping */}
                {mapping?.targetTable && targetColumns.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Column Mapping:</h4>
                    {mapping.sourceColumns.map(sourceCol => (
                      <div key={sourceCol} className="flex items-center gap-4 text-sm">
                        <div className="flex-1 font-medium text-gray-800">
                          {sourceCol}
                        </div>
                        <div className="text-gray-500">→</div>
                        <div className="flex-1">
                          <select
                            value={mapping.columnMapping[sourceCol] || ''}
                            onChange={(e) => handleColumnMapping(layerName, sourceCol, e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
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
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={() => setCurrentStep('selection')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            ← Back to Layer Selection
          </button>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isReadyToConfirm()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Confirm Mappings ({selectedLayers.filter(l => isLayerMappingComplete(l)).length}/{selectedLayers.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};