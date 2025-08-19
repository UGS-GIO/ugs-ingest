// components/ManualColumnModal.tsx
import React from 'react';

interface ManualColumnModalProps {
  isOpen: boolean;
  columnInput: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const ManualColumnModal: React.FC<ManualColumnModalProps> = ({
  isOpen,
  columnInput,
  onInputChange,
  onSubmit,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Manual Column Entry</h2>
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-800 font-semibold mb-2">
            📁 File Geodatabase Detected
          </p>
          <p className="text-yellow-700 text-sm">
            File geodatabases (.gdb) are a proprietary Esri format. Column names cannot be automatically extracted in the browser.
          </p>
        </div>
        
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-blue-800 font-semibold mb-2">How to get your column names:</p>
          <ol className="text-blue-700 text-sm list-decimal list-inside space-y-1">
            <li>Open your .gdb in <strong>ArcGIS Pro</strong> or <strong>QGIS</strong></li>
            <li>Right-click the layer → <strong>Open Attribute Table</strong></li>
            <li>Copy the field names from the table headers</li>
            <li>Paste them below, separated by commas</li>
          </ol>
        </div>
        
        <div className="mb-4">
          <label htmlFor="columnInput" className="block text-gray-700 font-semibold mb-2">
            Column Names:
          </label>
          <textarea
            id="columnInput"
            value={columnInput}
            onChange={(e) => onInputChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            placeholder="OBJECTID, Shape, unit_name, age, description, lithology, map_unit_polygon_id"
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter column names separated by commas. Common GIS fields include: OBJECTID, Shape, FID, geometry
          </p>
        </div>
        
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-gray-700 text-sm font-semibold mb-1">💡 Alternative Options:</p>
          <ul className="text-gray-600 text-xs space-y-1">
            <li>• Export your data to <strong>CSV</strong> or <strong>Shapefile</strong> from ArcGIS first</li>
            <li>• Include a <strong>metadata.json</strong> file with column definitions</li>
            <li>• Use <strong>GDAL/OGR</strong> tools to convert to an open format</li>
          </ul>
        </div>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!columnInput.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Continue with Mapping
          </button>
        </div>
      </div>
    </div>
  );
};