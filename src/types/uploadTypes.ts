/* eslint-disable @typescript-eslint/no-explicit-any */
// types/uploadTypes.ts - Enhanced with Multi-Layer Support
import type { ChangeEvent } from 'react';

// Type definitions for File System Access API
export interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
}

export interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';
  getFile(): Promise<File>;
}

export interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory';
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
}

// Legacy File System Entry API types (simplified to avoid inheritance issues)
// Using any types here since these are legacy browser APIs with inconsistent typing
export interface FileSystemEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
}

// Note: We use 'any' for the actual entry objects since the WebKit File System API
// has inconsistent typing across browsers. Runtime checks ensure safety.
export type FileSystemFileEntry = any;
export type FileSystemDirectoryEntry = any;
export type FileSystemDirectoryReader = any;

// Types for schema validation
export interface TableInfo {
  schema: string;
  name: string;
  fullName: string;
  displayName: string;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue: string | null;
  position: number;
}

// Layer information interface
export interface LayerInfo {
  name: string;
  fields: string[];
  featureCount: string | number;
  geometryType: string;
}

// GDAL Analysis Result interface for metadata preservation
export interface GDALAnalysisResult {
  layers: LayerInfo[];
  selectedLayer?: LayerInfo;
  gdbFolderName?: string;
  totalLayers: number;
  analysisTimestamp: string;
}

// NEW: Multi-layer table mapping interfaces
export interface LayerTableMapping {
  sourceLayer: string;
  layerFields: string[];
  targetTable: string;
  columnMapping: { [key: string]: string };
  isComplete: boolean;
  enabled: boolean;
}

export interface MultiLayerValidation {
  selectedLayers: LayerTableMapping[];
  gdalAnalysis: GDALAnalysisResult | null;
  availableTables: TableInfo[];
  validationCompleted: boolean;
  validationTimestamp: string;
}

export interface FormData {
  // Original fields
  projectName: string;
  datasetName: string;
  authorName: string;
  publicationType: string;
  description: string;
  selectedFiles: File[];
  
  // New fields for zip naming convention
  domain: string;
  customDomain: string;
  dataTopic: string;
  scale: string;
  quadName: string;
  pubId: string;
  loadType: string;
}

// Define the shape of our errors
export interface FormErrors {
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

// Enhanced schema validation states for multi-layer support
export type SchemaValidationState = 
  | 'not_started' 
  | 'validating' 
  | 'layer_selection' 
  | 'table_mapping'      // NEW: Multi-table mapping phase
  | 'column_mapping'     // NEW: Column mapping for each table
  | 'completed';

// Options for dropdowns
export const publicationTypeOptions = [
  { value: '', label: 'Select Publication Type' },
  { value: 'Special Study', label: 'Special Study' },
  { value: 'Digital Map', label: 'Digital Map' },
  { value: 'Open File', label: 'Open File Report' },
  { value: 'report', label: 'Technical Report' },
  { value: 'dataset', label: 'Dataset' },
  { value: 'other', label: 'Other' },
];

export const domainOptions = [
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

export const loadTypeOptions = [
  { value: '', label: 'Select Load Type' },
  { value: 'full', label: 'Full' },
  { value: 'update', label: 'Update' },
  { value: 'append', label: 'Append' },
  { value: 'incremental', label: 'Incremental' },
];

// Helper function to get schema from domain
export const getSchemaFromDomain = (domain: string): string => {
  const domainOption = domainOptions.find(option => option.value === domain);
  return domainOption?.schema || 'mapping'; // Default to mapping schema
};

// Helper functions for multi-layer validation
export const isMultiLayerValidationComplete = (mappings: LayerTableMapping[]): boolean => {
  return mappings
    .filter(mapping => mapping.enabled)
    .every(mapping => 
      mapping.targetTable && 
      mapping.isComplete &&
      Object.keys(mapping.columnMapping).length === mapping.layerFields.length
    );
};

export const getEnabledLayerCount = (mappings: LayerTableMapping[]): number => {
  return mappings.filter(mapping => mapping.enabled).length;
};

export const getCompletedMappingCount = (mappings: LayerTableMapping[]): number => {
  return mappings.filter(mapping => mapping.enabled && mapping.isComplete).length;
};

export const createDefaultLayerMapping = (layer: LayerInfo): LayerTableMapping => {
  return {
    sourceLayer: layer.name,
    layerFields: layer.fields,
    targetTable: '',
    columnMapping: {},
    isComplete: false,
    enabled: true,
  };
};

// Enhanced metadata structure for multi-layer processing
export interface EnhancedMetadata {
  // Original metadata fields
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
  
  // File information
  originalFiles: Array<{
    name: string;
    size: number;
    type: string;
    lastModified: number;
  }>;
  totalFileCount: number;
  totalFileSize: number;
  zipFilename: string;
  
  // Multi-layer schema validation (enhanced)
  schemaValidation?: {
    validationState: SchemaValidationState;
    isMultiLayer: boolean;
    selectedLayers: LayerTableMapping[];
    gdalAnalysis: GDALAnalysisResult | null;
    validationCompleted: boolean;
    mappingTimestamp: string;
    postgreRestUrl: string;
    
    // Legacy fields for backward compatibility
    targetTable?: string;
    sourceLayer?: string;
    sourceColumns?: string[];
    columnMapping?: { [key: string]: string };
    currentLayer?: LayerTableMapping;
  };
  
  // System information
  containsGeodatabase: boolean;
  userAgent: string;
  uploadSource: string;
}

// Event handler types
export type HandleChangeType = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;

// Validation helper functions
export const validateLayerMapping = (mapping: LayerTableMapping): string[] => {
  const errors: string[] = [];
  
  if (!mapping.targetTable) {
    errors.push('Target table is required');
  }
  
  const unmappedColumns = mapping.layerFields.filter(field => !mapping.columnMapping[field]);
  if (unmappedColumns.length > 0) {
    errors.push(`Unmapped columns: ${unmappedColumns.join(', ')}`);
  }
  
  return errors;
};

export const validateAllLayerMappings = (mappings: LayerTableMapping[]): { [layerName: string]: string[] } => {
  const validationResults: { [layerName: string]: string[] } = {};
  
  mappings
    .filter(mapping => mapping.enabled)
    .forEach(mapping => {
      const errors = validateLayerMapping(mapping);
      if (errors.length > 0) {
        validationResults[mapping.sourceLayer] = errors;
      }
    });
  
  return validationResults;
};

// Table name generation helper for multi-layer
export const generateTableName = (formData: FormData, layerName: string): string => {
  const effectiveDomain = formData.domain === 'custom' ? formData.customDomain : formData.domain;
  const sanitizedLayerName = layerName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  
  const parts = [
    effectiveDomain,
    formData.dataTopic,
    sanitizedLayerName, // Include layer name for uniqueness
    formData.scale,
    formData.quadName,
    formData.pubId,
  ].filter(part => part && part.trim() !== '');
  
  return parts.join('_');
};