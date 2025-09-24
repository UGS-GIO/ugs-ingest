import React, { useState, useEffect } from 'react';
import { useIAPUser } from '../hooks/useIAPUsers';

// Local type definitions
type SchemaValidationState = 'not_started' | 'validating' | 'layer_selection' | 'table_mapping' | 'column_mapping' | 'completed';

interface FormData {
  projectName: string;
  datasetName: string;
  authorName: string;
  publicationType: string;
  description: string;
  selectedFiles: File[];
  domain: string;
  customDomain: string;
  dataTopic: string;
  scale: string;
  quadName: string;
  pubId: string;
  loadType: string;
}

interface FormErrors {
  projectName?: string;
  datasetName?: string;
  authorName?: string;
  publicationType?: string;
  description?: string;
  selectedFiles?: string;
  domain?: string;
  customDomain?: string;
  dataTopic?: string;
  scale?: string;
  quadName?: string;
  pubId?: string;
  loadType?: string;
}

interface TableInfo {
  schema: string;
  name: string;
  fullName: string;
  displayName: string;
}

interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue: string | null;
  position: number;
}

interface LayerInfo {
  name: string;
  fields: string[];
  featureCount: string | number;
  geometryType: string;
}

interface GDALAnalysisResult {
  layers: LayerInfo[];
  selectedLayer?: LayerInfo;
  gdbFolderName?: string;
  totalLayers: number;
  analysisTimestamp: string;
}

interface LayerTableMapping {
  sourceLayer: string;
  layerName: string;
  layerFields: string[];
  targetTable: string;
  columnMapping: { [key: string]: string };
  isComplete: boolean;
  enabled: boolean;
}

// Options for dropdowns
const publicationTypeOptions = [
  { value: '', label: 'Select Publication Type' },
  { value: 'Special Study', label: 'Special Study' },
  { value: 'Digital Map', label: 'Digital Map' },
  { value: 'Open File', label: 'Open File Report' },
  { value: 'report', label: 'Technical Report' },
  { value: 'dataset', label: 'Dataset' },
  { value: 'other', label: 'Other' },
];

const domainOptions = [
  { value: '', label: 'Select Domain' },
  { value: 'hazards', label: 'Hazards', schema: 'hazards' },
  { value: 'groundwater', label: 'Groundwater', schema: 'gwportal' },
  { value: 'wetlands', label: 'Wetlands', schema: 'wetlands' },
  { value: 'geologic_maps', label: 'Geologic Maps', schema: 'mapping' },
  { value: 'energy_minerals', label: 'Energy & Minerals', schema: 'emp' },
  { value: 'ccus', label: 'CCUS', schema: 'ccus' },
  { value: 'boreholes', label: 'Boreholes', schema: 'boreholes' },
  { value: 'geochron', label: 'Geochronology', schema: 'geochron' },
  { value: 'custom', label: 'Other (specify)' },
];

const loadTypeOptions = [
  { value: '', label: 'Select Load Type' },
  { value: 'full', label: 'Full' },
  { value: 'update', label: 'Update' },
  { value: 'append', label: 'Append' },
  { value: 'incremental', label: 'Incremental' },
];

// Utility functions
const getSchemaFromDomain = (domain: string): string => {
  const domainOption = domainOptions.find(option => option.value === domain);
  return domainOption?.schema || 'mapping';
};

const isMultiLayerValidationComplete = (mappings: LayerTableMapping[]): boolean => {
  const enabled = mappings.filter(m => m.enabled);
  return enabled.length > 0 && enabled.every(m => m.isComplete);
};

const getEnabledLayerCount = (mappings: LayerTableMapping[]): number => {
  return mappings.filter(m => m.enabled).length;
};

const getCompletedMappingCount = (mappings: LayerTableMapping[]): number => {
  return mappings.filter(m => m.enabled && m.isComplete).length;
};

const UploadForm: React.FC = () => {
  const { email, authenticated, loading, error } = useIAPUser();

  const [formData, setFormData] = useState<FormData>({
    projectName: '',
    datasetName: '',
    authorName: email || '',
    publicationType: '',
    description: '',
    selectedFiles: [],
    domain: '',
    customDomain: '',
    dataTopic: '',
    scale: '',
    quadName: '',
    pubId: '',
    loadType: '',
  });

  const [schemaValidationState, setSchemaValidationState] = useState<SchemaValidationState>('not_started');
  const [layerTableMappings, setLayerTableMappings] = useState<LayerTableMapping[]>([]);
  const [availableTables, setAvailableTables] = useState<TableInfo[]>([]);
  const [showManualColumnInput, setShowManualColumnInput] = useState<boolean>(false);
  const [manualColumnInput, setManualColumnInput] = useState<string>('');
  const [gdalAnalysisResult, setGdalAnalysisResult] = useState<GDALAnalysisResult | null>(null);

  const [selectedTable, setSelectedTable] = useState<string>('');
  const [sourceColumns, setSourceColumns] = useState<string[]>([]);
  const [targetColumns, setTargetColumns] = useState<ColumnInfo[]>([]);
  const [columnMapping, setColumnMapping] = useState<{[key: string]: string}>({});
  const [sourceLayerInfo, setSourceLayerInfo] = useState<LayerInfo[]>([]);
  const [selectedSourceLayer, setSelectedSourceLayer] = useState<string>('');

  const [errors, setErrors] = useState<FormErrors>({});
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isValidatingSchema, setIsValidatingSchema] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [generatedFilename, setGeneratedFilename] = useState<string>('');
  const [isProcessingFolders, setIsProcessingFolders] = useState<boolean>(false);

  const getPostgrestUrl = (domain: string): string => {
    if (domain === 'groundwater') {
      return 'https://ugs-koop-umfdxaxiyq-wm.a.run.app';
    }
    return 'https://postgrest-seamlessgeolmap-734948684426.us-central1.run.app';
  };

  useEffect(() => {
    if (email && !formData.authorName) {
      setFormData((prevData) => ({
        ...prevData,
        authorName: email,
      }));
    }
  }, [email, formData.authorName]);

  useEffect(() => {
    const generateFilename = () => {
      const {
        domain,
        customDomain,
        dataTopic,
        scale,
        quadName,
        pubId,
        loadType,
        selectedFiles
      } = formData;

      const effectiveDomain = domain === 'custom' ? customDomain : domain;

      if (effectiveDomain && dataTopic && loadType && selectedFiles.length > 0) {
        const today = new Date();
        const dateStr = today.getFullYear().toString() +
                       (today.getMonth() + 1).toString().padStart(2, '0') +
                       today.getDate().toString().padStart(2, '0');

        const parts = [
          effectiveDomain,
          dataTopic,
          scale,
          quadName,
          pubId,
          loadType,
          dateStr
        ].filter(part => part && part.trim() !== '');

        const filename = parts.join('_') + '.zip';
        setGeneratedFilename(filename);
      } else {
        setGeneratedFilename('');
      }
    };

    generateFilename();
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prevErrors) => ({ ...prevErrors, [name]: undefined }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFormData((prevData) => ({
        ...prevData,
        selectedFiles: [...prevData.selectedFiles, ...newFiles],
      }));
      if (errors.selectedFiles) {
        setErrors((prevErrors) => ({ ...prevErrors, selectedFiles: undefined }));
      }
      setSchemaValidationState('not_started');
      setLayerTableMappings([]);
      setGdalAnalysisResult(null);
      e.target.value = '';
    }
  };

  const removeFile = (indexToRemove: number) => {
    setFormData((prevData) => ({
      ...prevData,
      selectedFiles: prevData.selectedFiles.filter((_, index) => index !== indexToRemove),
    }));
    setSchemaValidationState('not_started');
    setLayerTableMappings([]);
    setGdalAnalysisResult(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    try {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const newFiles = Array.from(e.dataTransfer.files);
        setFormData((prevData) => ({
          ...prevData,
          selectedFiles: [...prevData.selectedFiles, ...newFiles],
        }));
        if (errors.selectedFiles) {
          setErrors((prevErrors) => ({ ...prevErrors, selectedFiles: undefined }));
        }
        setSchemaValidationState('not_started');
        setLayerTableMappings([]);
        setGdalAnalysisResult(null);
      }
      e.dataTransfer.clearData();
    } catch (error) {
      console.error('Error processing dropped items:', error);
      setUploadMessage('Error processing dropped files. Please try again.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadMessage('Upload functionality would be implemented here once all components are working');
  };

  if (loading) {
    return React.createElement('div', 
      { className: "max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-lg" },
      React.createElement('div', 
        { className: "text-center" },
        React.createElement('div', { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" }),
        React.createElement('p', { className: "text-gray-600" }, "Loading user information...")
      )
    );
  }

  if (error) {
    return React.createElement('div', 
      { className: "max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-lg" },
      React.createElement('div', 
        { className: "text-center" },
        React.createElement('h2', { className: "text-2xl font-bold text-red-600 mb-4" }, "Authentication Error"),
        React.createElement('p', { className: "text-gray-600 mb-4" }, "Unable to verify your authentication status."),
        React.createElement('p', { className: "text-sm text-red-500" }, error),
        React.createElement('button', 
          { 
            onClick: () => window.location.reload(),
            className: "mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          }, 
          "Retry"
        )
      )
    );
  }

  if (!authenticated) {
    return React.createElement('div', 
      { className: "max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-lg" },
      React.createElement('div', 
        { className: "text-center" },
        React.createElement('h2', { className: "text-2xl font-bold text-red-600 mb-4" }, "Access Denied"),
        React.createElement('p', { className: "text-gray-600 mb-4" }, "You are not authorized to access this application."),
        React.createElement('p', { className: "text-sm text-gray-500" }, "Please contact your administrator if you believe this is an error.")
      )
    );
  }

  return React.createElement('div', 
    { className: "max-w-6xl mx-auto p-8 bg-white rounded-lg shadow-lg" },
    
    // User info header
    React.createElement('div', 
      { className: "mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200" },
      React.createElement('div', 
        { className: "flex items-center justify-between" },
        React.createElement('div', 
          null,
          React.createElement('p', 
            { className: "text-sm text-blue-800" },
            "Logged in as: ",
            React.createElement('strong', null, email)
          ),
          React.createElement('p', 
            { className: "text-xs text-blue-600 mt-1" },
            "Utah Department of Natural Resources - UGS"
          )
        ),
        React.createElement('div', 
          { className: "w-3 h-3 bg-green-500 rounded-full", title: "Authenticated" }
        )
      )
    ),

    // Domain-specific PostgREST URL indicator
    formData.domain ? React.createElement('div', 
      { className: "mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200" },
      React.createElement('p', 
        { className: "text-xs text-gray-700" },
        React.createElement('strong', null, "PostgREST Service:"),
        " ",
        getPostgrestUrl(formData.domain),
        formData.domain === 'groundwater' ? React.createElement('span', 
          { className: "ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded" },
          "Using Groundwater-specific service"
        ) : null
      )
    ) : null,

    // Generated filename preview
    generatedFilename ? React.createElement('div', 
      { className: "mb-6 p-4 bg-green-50 rounded-lg border border-green-200" },
      React.createElement('p', 
        { className: "text-sm text-green-800 font-semibold" },
        "Generated Zip Filename:"
      ),
      React.createElement('p', 
        { className: "text-green-700 font-mono text-lg mt-1" },
        generatedFilename
      ),
      layerTableMappings.length > 1 ? React.createElement('p', 
        { className: "text-xs text-green-600 mt-1" },
        `Multi-layer geodatabase with ${getEnabledLayerCount(layerTableMappings)} enabled layers`
      ) : null
    ) : null,

    // Main form
    React.createElement('form', 
      { onSubmit: handleSubmit },
      React.createElement('h2', 
        { className: "text-3xl font-bold text-blue-600 mb-6 text-center" },
        "Upload Dataset"
      ),

      // Basic form fields
      React.createElement('div', 
        { className: "space-y-6" },
        
        // Project Name
        React.createElement('div', 
          null,
          React.createElement('label', 
            { htmlFor: "projectName", className: "block text-gray-700 font-semibold mb-2" },
            "Project Name: ",
            React.createElement('span', { className: "text-red-500" }, "*")
          ),
          React.createElement('input', {
            type: "text",
            id: "projectName",
            name: "projectName",
            value: formData.projectName,
            onChange: handleChange,
            className: "w-full px-3 py-2 border border-gray-300 rounded-md",
            placeholder: "Enter project name"
          }),
          errors.projectName ? React.createElement('p', 
            { className: "text-red-500 text-sm mt-1" },
            errors.projectName
          ) : null
        ),

        // Dataset Name
        React.createElement('div', 
          null,
          React.createElement('label', 
            { htmlFor: "datasetName", className: "block text-gray-700 font-semibold mb-2" },
            "Dataset Name: ",
            React.createElement('span', { className: "text-red-500" }, "*")
          ),
          React.createElement('input', {
            type: "text",
            id: "datasetName",
            name: "datasetName",
            value: formData.datasetName,
            onChange: handleChange,
            className: "w-full px-3 py-2 border border-gray-300 rounded-md",
            placeholder: "Enter dataset name"
          }),
          errors.datasetName ? React.createElement('p', 
            { className: "text-red-500 text-sm mt-1" },
            errors.datasetName
          ) : null
        ),

        // Author Name
        React.createElement('div', 
          null,
          React.createElement('label', 
            { htmlFor: "authorName", className: "block text-gray-700 font-semibold mb-2" },
            "Author Name: ",
            React.createElement('span', { className: "text-red-500" }, "*")
          ),
          React.createElement('input', {
            type: "text",
            id: "authorName",
            name: "authorName",
            value: formData.authorName,
            onChange: handleChange,
            className: "w-full px-3 py-2 border border-gray-300 rounded-md",
            placeholder: "Author name"
          })
        ),

        // Publication Type
        React.createElement('div', 
          null,
          React.createElement('label', 
            { htmlFor: "publicationType", className: "block text-gray-700 font-semibold mb-2" },
            "Publication Type: ",
            React.createElement('span', { className: "text-red-500" }, "*")
          ),
          React.createElement('select', {
            id: "publicationType",
            name: "publicationType",
            value: formData.publicationType,
            onChange: handleChange,
            className: "w-full px-3 py-2 border border-gray-300 rounded-md"
          }, publicationTypeOptions.map((option) => 
            React.createElement('option', 
              { key: option.value, value: option.value },
              option.label
            )
          ))
        ),

        // Domain
        React.createElement('div', 
          null,
          React.createElement('label', 
            { htmlFor: "domain", className: "block text-gray-700 font-semibold mb-2" },
            "Domain: ",
            React.createElement('span', { className: "text-red-500" }, "*")
          ),
          React.createElement('select', {
            id: "domain",
            name: "domain",
            value: formData.domain,
            onChange: handleChange,
            className: "w-full px-3 py-2 border border-gray-300 rounded-md"
          }, domainOptions.map((option) => 
            React.createElement('option', 
              { key: option.value, value: option.value },
              option.label
            )
          ))
        ),

        // Custom Domain (conditional)
        formData.domain === 'custom' ? React.createElement('div', 
          null,
          React.createElement('label', 
            { htmlFor: "customDomain", className: "block text-gray-700 font-semibold mb-2" },
            "Custom Domain: ",
            React.createElement('span', { className: "text-red-500" }, "*")
          ),
          React.createElement('input', {
            type: "text",
            id: "customDomain",
            name: "customDomain",
            value: formData.customDomain,
            onChange: handleChange,
            className: "w-full px-3 py-2 border border-gray-300 rounded-md",
            placeholder: "Enter custom domain name"
          })
        ) : null,

        // Data Topic
        React.createElement('div', 
          null,
          React.createElement('label', 
            { htmlFor: "dataTopic", className: "block text-gray-700 font-semibold mb-2" },
            "Data Topic: ",
            React.createElement('span', { className: "text-red-500" }, "*")
          ),
          React.createElement('input', {
            type: "text",
            id: "dataTopic",
            name: "dataTopic",
            value: formData.dataTopic,
            onChange: handleChange,
            className: "w-full px-3 py-2 border border-gray-300 rounded-md",
            placeholder: "e.g., geolunits, alluvial_fan, wetland_inventory"
          })
        ),

        // Load Type
        React.createElement('div', 
          null,
          React.createElement('label', 
            { htmlFor: "loadType", className: "block text-gray-700 font-semibold mb-2" },
            "Load Type: ",
            React.createElement('span', { className: "text-red-500" }, "*")
          ),
          React.createElement('select', {
            id: "loadType",
            name: "loadType",
            value: formData.loadType,
            onChange: handleChange,
            className: "w-full px-3 py-2 border border-gray-300 rounded-md"
          }, loadTypeOptions.map((option) => 
            React.createElement('option', 
              { key: option.value, value: option.value },
              option.label
            )
          ))
        ),

        // File Upload Section
        React.createElement('div', 
          null,
          React.createElement('label', 
            { htmlFor: "file-input", className: "block text-gray-700 font-semibold mb-2" },
            "Select Data Files: ",
            React.createElement('span', { className: "text-red-500" }, "*")
          ),
          React.createElement('div', {
            className: `border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-400'
            }`,
            onDragOver: handleDragOver,
            onDragLeave: handleDragLeave,
            onDrop: handleDrop
          },
            React.createElement('input', {
              type: "file",
              id: "file-input",
              multiple: true,
              onChange: handleFileChange,
              className: "hidden"
            }),
            React.createElement('p', 
              { className: "mb-2" },
              "Drag & drop files here, or"
            ),
            React.createElement('button', {
              type: "button",
              onClick: () => document.getElementById('file-input')?.click(),
              className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            }, "Choose Files")
          ),

          // Display selected files
          formData.selectedFiles.length > 0 ? React.createElement('div', 
            { className: "mt-4" },
            React.createElement('p', 
              { className: "font-bold text-green-800 mb-2" },
              `Selected Files (${formData.selectedFiles.length}):`
            ),
            React.createElement('div', 
              { className: "max-h-64 overflow-y-auto space-y-1" },
              formData.selectedFiles.map((file, index) => 
                React.createElement('div', 
                  { key: index, className: "flex items-center justify-between p-2 bg-green-50 rounded" },
                  React.createElement('div', 
                    null,
                    React.createElement('p', 
                      { className: "text-sm text-green-800" },
                      file.name
                    ),
                    React.createElement('p', 
                      { className: "text-xs text-green-600" },
                      `${(file.size / 1024 / 1024).toFixed(2)} MB`
                    )
                  ),
                  React.createElement('button', {
                    type: "button",
                    onClick: () => removeFile(index),
                    className: "text-red-500 hover:text-red-700"
                  }, "Remove")
                )
              )
            )
          ) : null
        ),

        // Upload Message
        uploadMessage ? React.createElement('div', {
          className: `p-3 rounded-md ${
            uploadMessage.includes('error') || uploadMessage.includes('failed')
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : uploadMessage.includes('success')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`
        }, uploadMessage) : null,

        // Submit Button
        React.createElement('button', {
          type: "submit",
          disabled: isSubmitting || formData.selectedFiles.length === 0,
          className: "w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        }, isSubmitting ? 'Uploading...' : 'Upload Dataset')
      )
    ),

    // Info section
    React.createElement('div', 
      { className: "mt-6 p-4 bg-gray-50 rounded-md border border-gray-200" },
      React.createElement('p', 
        { className: "text-xs text-gray-600" },
        React.createElement('strong', null, "Note:"),
        " This is a simplified version of the upload form. The complete multi-layer functionality will be available once all component dependencies are resolved."
      )
    )
  );
};

export default UploadForm;