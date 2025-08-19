// components/LayerSelectionModal.tsx
import React from 'react';
import type { LayerInfo } from '../types/uploadTypes';

interface LayerSelectionModalProps {
  isOpen: boolean;
  layers: LayerInfo[];
  selectedLayer: string;
  onLayerSelect: (layerName: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const LayerSelectionModal: React.FC<LayerSelectionModalProps> = ({
  isOpen,
  layers,
  selectedLayer,
  onLayerSelect,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Select Source Layer</h2>
        
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-blue-800 font-semibold mb-2">
            📁 Multiple Layers Found in Geodatabase
          </p>
          <p className="text-blue-700 text-sm">
            Your file geodatabase contains {layers.length} layers. Please select which layer you want to import and map to the target schema.
          </p>
        </div>
        
        <div className="grid gap-4">
          {layers.map((layer) => (
            <div
              key={layer.name}
              className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedLayer === layer.name
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-300'
              }`}
              onClick={() => onLayerSelect(layer.name)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      name="sourceLayer"
                      value={layer.name}
                      checked={selectedLayer === layer.name}
                      onChange={() => onLayerSelect(layer.name)}
                      className="text-blue-600"
                    />
                    <h3 className="text-lg font-semibold text-gray-800">
                      {layer.name}
                    </h3>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      {layer.geometryType}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Features:</span> {layer.featureCount}
                    </div>
                    <div>
                      <span className="font-medium">Fields:</span> {layer.fields.length}
                    </div>
                  </div>
                  
                  {/* Show first few field names as preview */}
                  <div className="mt-2">
                    <span className="text-sm font-medium text-gray-700">Field Preview: </span>
                    <span className="text-sm text-gray-600">
                      {layer.fields.slice(0, 5).join(', ')}
                      {layer.fields.length > 5 && ` ... (+${layer.fields.length - 5} more)`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Selection Summary */}
        {selectedLayer && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800 font-medium">
              ✅ Selected: {selectedLayer}
            </p>
            <p className="text-green-700 text-sm mt-1">
              This layer has {layers.find(l => l.name === selectedLayer)?.fields.length} fields that will be available for column mapping.
            </p>
          </div>
        )}
        
        {/* Modal Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!selectedLayer}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Continue with Selected Layer
          </button>
        </div>
      </div>
    </div>
  );
};