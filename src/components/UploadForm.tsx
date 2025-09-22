// types/uploadTypes.ts - Enhanced types for multi-layer geodatabase processing

// Schema validation state enum - includes all possible states
export type SchemaValidationState = 
  | 'not_started'
  | 'validating' 
  | 'layer_selection'
  | 'pending' 
  | 'analyzing' 
  | 'mapping' 
  | 'completed';

// GDAL Analysis Result interface
export interface GDALAnalysisResult {
  layers: LayerInfo[];
  totalLayers: number;
  gdbFolderName?: string;
  selectedLayer?: LayerInfo;
  analysisTimestamp: string;
}

// File System API types for directory/file handling
export interface FileSystemDirectoryHandle {
  kind: 'directory';
  name: string;
  entries(): AsyncIterable<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>;
  getDirectoryHandle(name: string): Promise<FileSystemDirectoryHandle>;
  getFileHandle(name: string): Promise<FileSystemFileHandle>;
}

export interface FileSystemFileHandle {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
}

export interface FileSystemDirectoryEntry {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
}

// Utility function to get schema from domain
export const getSchemaFromDomain = (domain: string): string => {
  const schemaMap: Record<string, string> = {
    'hazards': 'hazards',
    'wetlands': 'wetlands', 
    'geology': 'geology',
    'groundwater': 'groundwater',
    'energy': 'energy'
  };
  return schemaMap[domain] || 'raw';
};

export interface LayerInfo {
  name: string;
  fields: string[];
  featureCount: number;
  geometryType: string;
}

export interface TableInfo {
  fullName: string;
  displayName: string;
  schema: string;
  tableName: string;
  name: string; // Add this for backward compatibility
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey?: boolean;
  isGeometry?: boolean;
}

// Enhanced metadata structure for multi-layer geodatabase processing
export interface MultiLayerSchemaValidation {
  validationState: 'pending' | 'analyzing' | 'mapping' | 'completed';
  validationCompleted: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gdalAnalysis: any; // Your existing GDAL analysis result
  mappingTimestamp: string;
  
  // NEW: Support multiple layer mappings
  selectedLayers: LayerMapping[];
  
  // SUMMARY: Add summary info for easy access
  totalLayersSelected: number;
  totalLayersAvailable: number;
  targetTables: string[];
}

export interface LayerMapping {
  sourceLayer: string;           // e.g., "Quaternary_Faults"
  targetTable: string;          // e.g., "hazards_quaternary_faults" 
  enabled: boolean;             // Allow users to enable/disable layers
  columnMapping: Record<string, string>; // Source col -> Target col
  sourceColumns: string[];      // Available source columns
  geometryType: string;         // Point, LineString, Polygon, etc.
  featureCount: number;         // Number of features in this layer
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;        // If processing failed
}

// Upload form data structure
export interface UploadFormData {
  projectName: string;
  datasetName: string;
  authorName: string;
  publicationType: string;
  description: string;
  domain: string;
  customDomain?: string;
  dataTopic: string;
  scale?: string;
  quadName?: string;
  pubId?: string;
  loadType: 'full' | 'update';
  selectedFiles: File[];
}

// Default form data initializer
export const createDefaultFormData = (): UploadFormData => ({
  projectName: '',
  datasetName: '',
  authorName: '',
  publicationType: '',
  description: '',
  domain: '',
  customDomain: undefined,
  dataTopic: '',
  scale: undefined,
  quadName: undefined,
  pubId: undefined,
  loadType: 'full', // Default to 'full' instead of empty string
  selectedFiles: []
});

// Form data type alias for backward compatibility
export type FormData = UploadFormData;

// Form validation errors
export interface FormErrors {
  projectName?: string;
  datasetName?: string;
  authorName?: string;
  publicationType?: string;
  description?: string;
  domain?: string;
  customDomain?: string;
  dataTopic?: string;
  scale?: string;
  quadName?: string;
  pubId?: string;
  loadType?: string;
  selectedFiles?: string;
}

// Handle change function type for form inputs
export type HandleChangeType = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;

// Publication type options
export interface PublicationTypeOption {
  value: string;
  label: string;
}

export const publicationTypeOptions: PublicationTypeOption[] = [
  { value: 'Digital Map', label: 'Digital Map' },
  { value: 'Report', label: 'Report' },
  { value: 'Publication', label: 'Publication' },
  { value: 'Dataset', label: 'Dataset' },
  { value: 'Other', label: 'Other' }
];

// Enhanced metadata structure
export interface EnhancedUploadMetadata {
  projectName: string;
  datasetName: string;
  authorName: string;
  publicationType: string;
  description: string;
  domain: string;
  dataTopic: string;
  scale?: string;
  quadName?: string;
  pubId?: string;
  loadType: string;
  submittedBy: string;
  submittedAt: string;
  originalFiles: Array<{
    name: string;
    size: number;
    type: string;
    lastModified: number;
  }>;
  totalFileCount: number;
  totalFileSize: number;
  zipFilename: string;
  schemaValidation?: MultiLayerSchemaValidation;
  containsGeodatabase: boolean;
  userAgent: string;
  uploadSource: string;
}

// Utility functions
export const generateTargetTableName = (layerName: string, domain: string = 'hazards'): string => {
  const sanitized = layerName.toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  return `${domain}_${sanitized}`;
};

export const generateEnhancedMetadata = (
  formData: UploadFormData, 
  layerMappings: LayerMapping[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gdalAnalysisResult: any,
  email: string,
  generatedFilename: string
): EnhancedUploadMetadata => {
  const effectiveDomain = formData.domain === 'custom' ? formData.customDomain : formData.domain;
  
  return {
    projectName: formData.projectName,
    datasetName: formData.datasetName,
    authorName: formData.authorName,
    publicationType: formData.publicationType,
    description: formData.description,
    domain: effectiveDomain || 'unknown',
    dataTopic: formData.dataTopic,
    scale: formData.scale || undefined,
    quadName: formData.quadName || undefined,
    pubId: formData.pubId || undefined,
    loadType: formData.loadType,
    submittedBy: email,
    submittedAt: new Date().toISOString(),
    originalFiles: formData.selectedFiles.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    })),
    totalFileCount: formData.selectedFiles.length,
    totalFileSize: formData.selectedFiles.reduce((total, file) => total + file.size, 0),
    zipFilename: generatedFilename,
    schemaValidation: formData.loadType !== 'full' ? {
      validationState: 'completed',
      validationCompleted: true,
      gdalAnalysis: gdalAnalysisResult,
      mappingTimestamp: new Date().toISOString(),
      selectedLayers: layerMappings,
      totalLayersSelected: layerMappings.length,
      totalLayersAvailable: gdalAnalysisResult?.layers?.length || 0,
      targetTables: layerMappings.map(l => l.targetTable),
    } : undefined,
    containsGeodatabase: formData.selectedFiles.some(file => 
      file.name.includes('.gdb/') || file.name.endsWith('.gdb')
    ),
    userAgent: navigator.userAgent,
    uploadSource: 'UGS Ingest Web Application v2.1 (Enhanced Multi-Layer Processing)',
  };
};