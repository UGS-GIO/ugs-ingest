/* eslint-disable @typescript-eslint/no-explicit-any */
// types/uploadTypes.ts
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

export type SchemaValidationState = 'not_started' | 'validating' | 'layer_selection' | 'mapping' | 'completed';

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
  { value: 'groundwater', label: 'Groundwater', schema: 'gwportal' }, // Changed from 'groundwater' to 'gwportal'
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

// Event handler types
export type HandleChangeType = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;