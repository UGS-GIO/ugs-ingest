//Enhanced UploadForm.tsx with Multi-Layer Support
import React, { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent, DragEvent } from 'react';
import { useIAPUser } from '../hooks/useIAPUsers';

// Import types and utilities
import type {
  FormData as UploadFormData,
  FormErrors,
  SchemaValidationState,
  TableInfo,
  ColumnInfo,
  LayerInfo,
  GDALAnalysisResult,
  FileSystemDirectoryHandle,
  FileSystemFileHandle,
  FileSystemDirectoryEntry,
  LayerTableMapping,
  EnhancedMetadata,
} from '../types/uploadTypes';

import { 
  getSchemaFromDomain,
  isMultiLayerValidationComplete,
  getEnabledLayerCount,
  getCompletedMappingCount,
  createDefaultLayerMapping,
  generateTableName
} from '../types/uploadTypes';

// Import components
import { ProjectInfoForm } from './ProjectInfoForm';
import { NamingConventionForm } from './NamingConventionForm';
import { FileUploadSection } from './FileUploadSection';
import { SchemaValidationStatus } from './SchemaValidationStatus';
import { LayerSelectionModal } from './LayerSelectionModal';
import { ManualColumnModal } from './ManualColumnModal';
import { SchemaMappingModal } from './SchemaMappingModal';
import { ActionButtons } from './ActionButtons';

declare global {
  interface Window {
    showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
  }
}

export const UploadForm: React.FC = () => {
  const { email, authenticated, loading, error } = useIAPUser();

  // State to hold all form data
  const [formData, setFormData] = useState<UploadFormData>({
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

  // Enhanced state for multi-layer schema validation
  const [schemaValidationState, setSchemaValidationState] = useState<SchemaValidationState>('not_started');
  const [layerTableMappings, setLayerTableMappings] = useState<LayerTableMapping[]>([]);
  const [availableTables, setAvailableTables] = useState<TableInfo[]>([]);
  const [showManualColumnInput, setShowManualColumnInput] = useState<boolean>(false);
  const [manualColumnInput, setManualColumnInput] = useState<string>('');
  const [gdalAnalysisResult, setGdalAnalysisResult] = useState<GDALAnalysisResult | null>(null);

  // Legacy single-layer state (for backward compatibility)
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [sourceColumns, setSourceColumns] = useState<string[]>([]);
  const [targetColumns, setTargetColumns] = useState<ColumnInfo[]>([]);
  const [columnMapping, setColumnMapping] = useState<{[key: string]: string}>({});
  const [sourceLayerInfo, setSourceLayerInfo] = useState<LayerInfo[]>([]);
  const [selectedSourceLayer, setSelectedSourceLayer] = useState<string>('');

  // State for validation errors and UI
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isValidatingSchema, setIsValidatingSchema] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [generatedFilename, setGeneratedFilename] = useState<string>('');
  const [isProcessingFolders, setIsProcessingFolders] = useState<boolean>(false);

  // ==========================================
  // PostgREST URL logic based on domain
  // ==========================================
  
  /**
   * Get the appropriate PostgREST URL based on the domain
   */
  const getPostgrestUrl = (domain: string): string => {
    if (domain === 'groundwater') {
      return 'https://ugs-koop-umfdxaxiyq-wm.a.run.app';
    }
    return 'https://postgrest-seamlessgeolmap-734948684426.us-central1.run.app';
  };

  // Update author name when email is loaded
  useEffect(() => {
    if (email && !formData.authorName) {
      setFormData((prevData) => ({
        ...prevData,
        authorName: email,
      }));
    }
  }, [email, formData.authorName]);

  // Generate filename whenever relevant fields change
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

  // Handle changes for text and select inputs
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prevErrors) => ({ ...prevErrors, [name]: undefined }));
    }
  };

  // ==========================================
  // File handling functions (unchanged)
  // ==========================================
  const processDataTransferItems = async (items: DataTransferItemList): Promise<File[]> => {
    const files: File[] = [];
    const promises: Promise<void>[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry?.();
        
        if (entry) {
          if (entry.isFile) {
            promises.push(
              new Promise<void>((resolve) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fileEntry = entry as any;
                if (fileEntry.file && typeof fileEntry.file === 'function') {
                  fileEntry.file((file: File) => {
                    files.push(file);
                    resolve();
                  });
                } else {
                  resolve();
                }
              })
            );
          } else if (entry.isDirectory) {
            promises.push(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              readDirectoryEntry(entry as any, entry.name)
                .then((dirFiles) => {
                  files.push(...dirFiles);
                })
                .catch((error) => {
                  console.warn('Error reading directory:', entry.name, error);
                })
            );
          }
        } else {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }
    }

    await Promise.all(promises);
    return files;
  };

  const readDirectoryEntry = async (dirEntry: FileSystemDirectoryEntry, basePath = ''): Promise<File[]> => {
    return new Promise((resolve, reject) => {
      const files: File[] = [];
      const reader = dirEntry.createReader();
      
      const readEntries = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reader.readEntries(async (entries: any[]) => {
          if (entries.length === 0) {
            resolve(files);
            return;
          }
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const promises = entries.map((entry: any) => {
            return new Promise<void>((entryResolve) => {
              const fullPath = basePath ? `${basePath}/${entry.name}` : entry.name;
              
              if (entry.isFile) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fileEntry = entry as any;
                if (fileEntry.file && typeof fileEntry.file === 'function') {
                  fileEntry.file((file: File) => {
                    const fileWithPath = new File([file], fullPath, {
                      type: file.type,
                      lastModified: file.lastModified
                    });
                    files.push(fileWithPath);
                    entryResolve();
                  });
                } else {
                  entryResolve();
                }
              } else if (entry.isDirectory) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                readDirectoryEntry(entry as any, fullPath)
                  .then((subFiles) => {
                    files.push(...subFiles);
                    entryResolve();
                  })
                  .catch(() => entryResolve());
              } else {
                entryResolve();
              }
            });
          });
          
          await Promise.all(promises);
          readEntries();
        }, reject);
      };
      
      readEntries();
    });
  };

  const readDirectoryHandle = async (dirHandle: FileSystemDirectoryHandle, path = ''): Promise<File[]> => {
    const files: File[] = [];
    
    for await (const [name, handle] of dirHandle.entries()) {
      const fullPath = path ? `${path}/${name}` : name;
      
      if (handle.kind === 'file') {
        const file = await (handle as FileSystemFileHandle).getFile();
        const fileWithPath = new File([file], fullPath, {
          type: file.type,
          lastModified: file.lastModified
        });
        files.push(fileWithPath);
      } else if (handle.kind === 'directory') {
        const subFiles = await readDirectoryHandle(handle as FileSystemDirectoryHandle, fullPath);
        files.push(...subFiles);
      }
    }
    
    return files;
  };

  const addFiles = (newFiles: File[]) => {
    setFormData((prevData) => ({
      ...prevData,
      selectedFiles: [...prevData.selectedFiles, ...newFiles],
    }));
    if (errors.selectedFiles) {
      setErrors((prevErrors) => ({ ...prevErrors, selectedFiles: undefined }));
    }
    // Reset validation state when files change
    setSchemaValidationState('not_started');
    setLayerTableMappings([]);
    setGdalAnalysisResult(null);
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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      addFiles(newFiles);
      e.target.value = '';
    }
  };

  const handleFileOrFolderSelect = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const choice = await new Promise<'files' | 'folder' | 'cancel'>((resolve) => {
          const modal = document.createElement('div');
          modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
            z-index: 10000; font-family: system-ui, -apple-system, sans-serif;
          `;
          
          modal.innerHTML = `
            <div style="background: white; padding: 24px; border-radius: 8px; max-width: 400px; text-align: center;">
              <h3 style="margin: 0 0 16px 0; color: #333;">Select Files or Folder</h3>
              <p style="margin: 0 0 20px 0; color: #666; font-size: 14px;">
                Choose individual files or select an entire folder (like .gdb)
              </p>
              <div style="display: flex; gap: 12px; justify-content: center;">
                <button id="select-files" style="
                  padding: 8px 16px; background: #6b7280; color: white; border: none; 
                  border-radius: 6px; cursor: pointer; font-size: 14px;
                ">Individual Files</button>
                <button id="select-folder" style="
                  padding: 8px 16px; background: #2563eb; color: white; border: none; 
                  border-radius: 6px; cursor: pointer; font-size: 14px;
                ">Folder (.gdb)</button>
                <button id="cancel" style="
                  padding: 8px 16px; background: #e5e7eb; color: #374151; border: none; 
                  border-radius: 6px; cursor: pointer; font-size: 14px;
                ">Cancel</button>
              </div>
            </div>
          `;
          
          document.body.appendChild(modal);
          
          modal.querySelector('#select-files')?.addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve('files');
          });
          
          modal.querySelector('#select-folder')?.addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve('folder');
          });
          
          modal.querySelector('#cancel')?.addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve('cancel');
          });
          
          modal.addEventListener('click', (e) => {
            if (e.target === modal) {
              document.body.removeChild(modal);
              resolve('cancel');
            }
          });
        });
        
        if (choice === 'folder') {
          const dirHandle = await window.showDirectoryPicker();
          setIsProcessingFolders(true);
          const files = await readDirectoryHandle(dirHandle);
          if (files.length > 0) {
            addFiles(files);
          }
          setIsProcessingFolders(false);
        } else if (choice === 'files') {
          document.getElementById('file-input')?.click();
        }
        
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error selecting folder:', error);
          document.getElementById('file-input')?.click();
        }
      }
    } else {
      document.getElementById('file-input')?.click();
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setIsProcessingFolders(true);
    
    try {
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        const newFiles = await processDataTransferItems(e.dataTransfer.items);
        if (newFiles.length > 0) {
          addFiles(newFiles);
        }
      } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const newFiles = Array.from(e.dataTransfer.files);
        addFiles(newFiles);
      }
      e.dataTransfer.clearData();
    } catch (error) {
      console.error('Error processing dropped items:', error);
      setUploadMessage('Error processing dropped files/folders. Please try again.');
    } finally {
      setIsProcessingFolders(false);
    }
  };

  // ==========================================
  // Upload functionality
  // ==========================================
  const uploadZipToGCS = async (zipBlob: Blob, filename: string): Promise<boolean> => {
    try {
      const fileSizeMB = (zipBlob.size / 1024 / 1024).toFixed(2);
      console.log('Starting upload process...');
      console.log(`File: ${filename}`);
      console.log(`Size: ${zipBlob.size} bytes (${fileSizeMB}MB)`);

      // Phase 1: Get Signed URL
      console.log('Phase 1: Requesting signed URL from Cloud Function...');
      
      const functionUrl = `https://us-central1-${process.env.REACT_APP_PROJECT_ID || 'ut-dnr-ugs-backend-tools'}.cloudfunctions.net/ugs-zip-upload`;
      
      const signedUrlResponse = await fetch(`${functionUrl}?filename=${encodeURIComponent(filename)}&fileSize=${zipBlob.size}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Filename': filename,
          'X-File-Size': zipBlob.size.toString(),
        },
      });

      if (!signedUrlResponse.ok) {
        let errorData;
        try {
          errorData = await signedUrlResponse.json();
        } catch {
          errorData = { error: `HTTP ${signedUrlResponse.status}: ${signedUrlResponse.statusText}` };
        }
        throw new Error(`Failed to get signed URL: ${errorData.error || signedUrlResponse.statusText}`);
      }

      const signedUrlData = await signedUrlResponse.json();
      console.log('Phase 1 Complete: Signed URL received');

      const { signedUrl, uploadedBy } = signedUrlData;

      // Phase 2: Direct Upload to GCS
      console.log('Phase 2: Uploading directly to Cloud Storage...');
      
      const uploadStartTime = Date.now();
      
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/zip',
        },
        body: zipBlob,
      });

      const uploadDuration = ((Date.now() - uploadStartTime) / 1000).toFixed(1);

      if (!uploadResponse.ok) {
        console.error('GCS upload error');
        console.error('Response status:', uploadResponse.status);
        throw new Error(`Upload to Cloud Storage failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      console.log('Phase 2 Complete: File uploaded to Cloud Storage');

      // Phase 3: Update file metadata
      console.log('Phase 3: Adding metadata to uploaded file...');
      
      const metadata = {
        'uploaded-by': uploadedBy,
        'uploaded-at': new Date().toISOString(),
        'source': 'UGS-Ingest-Web-Application',
        'original-filename': filename,
        'file-size-bytes': zipBlob.size.toString(),
        'file-size-mb': fileSizeMB,
        'upload-duration-seconds': uploadDuration
      };

      const metadataResponse = await fetch('/api/update-file-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: filename,
          metadata: metadata
        })
      });

      if (metadataResponse.ok) {
        console.log('Phase 3 Complete: Metadata added successfully');
      } else {
        console.warn('Phase 3 Warning: Failed to add metadata, but upload was successful');
      }

      console.log(`Upload completed in ${uploadDuration} seconds`);
      console.log(`File location: gs://${signedUrlData.bucket}/${filename}`);
      console.log(`Upload speed: ${(zipBlob.size / 1024 / 1024 / parseFloat(uploadDuration)).toFixed(2)} MB/s`);
      
      return true;

    } catch (error) {
      console.error('Upload process failed:', error);
      throw error;
    }
  };

  // ==========================================
  // PostgREST and GDAL functions
  // ==========================================
  
  const fetchAvailableTables = async (schemaName?: string): Promise<TableInfo[]> => {
    try {
      const schema = schemaName || 'mapping';
      const POSTGREST_URL = getPostgrestUrl(formData.domain);
      
      console.log(`🔍 Discovering tables in schema: ${schema}`);
      console.log(`🌐 Using PostgREST URL: ${POSTGREST_URL}`);

      const headers: Record<string, string> = {
        'Accept-Profile': schema
      };

      const apiResponse = await fetch(`${POSTGREST_URL}/`, { headers });
      
      if (!apiResponse.ok) {
        throw new Error(`Failed to fetch API spec for schema ${schema}: ${apiResponse.statusText}`);
      }

      const apiSpec = await apiResponse.json();
      const paths = apiSpec.paths || {};
      
      const tableNames = Object.keys(paths)
        .filter(path => path.startsWith('/') && !path.startsWith('/rpc/') && path !== '/')
        .map(path => path.substring(1));
      
      console.log(`📋 Discovered tables in ${schema}:`, tableNames);
      
      const availableTables: TableInfo[] = [];

      for (const tableName of tableNames) {
        try {
          const testResponse = await fetch(`${POSTGREST_URL}/${tableName}?limit=0`, { headers });
          if (testResponse.ok) {
            availableTables.push({
              schema: schema,
              name: tableName,
              fullName: `${schema}.${tableName}`,
              displayName: `${schema}.${tableName}`
            });
            console.log(`✅ Table accessible: ${schema}.${tableName}`);
          }
        } catch (error) {
          console.log(`❌ Error testing table ${tableName}:`, error);
        }
      }

      console.log(`Found ${availableTables.length} accessible tables in ${schema} schema`);
      return availableTables;

    } catch (error) {
      console.error('Error fetching tables:', error);
      return [];
    }
  };

  const fetchTableSchema = async (schema: string, tableName: string): Promise<ColumnInfo[]> => {
    try {
      const POSTGREST_URL = getPostgrestUrl(formData.domain);
      
      console.log(`🔍 Fetching schema for ${schema}.${tableName}`);
      console.log(`🌐 Using PostgREST URL: ${POSTGREST_URL}`);

      const headers: Record<string, string> = {
        'Accept-Profile': schema
      };

      const response = await fetch(`${POSTGREST_URL}/`, { headers });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch API spec for schema ${schema}: ${response.statusText}`);
      }
      
      const apiSpec = await response.json();
      const definitions = apiSpec.definitions;
      
      if (!definitions[tableName]) {
        throw new Error(`Table ${tableName} not found in ${schema} schema definitions`);
      }
      
      const tableDefinition = definitions[tableName];
      const properties = tableDefinition.properties;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const columns: ColumnInfo[] = Object.entries(properties).map(([columnName, columnDef]: [string, any], index) => {
        let dataType = columnDef.type || 'string';
        if (columnDef.format) {
          if (columnDef.format.includes('integer')) dataType = 'integer';
          else if (columnDef.format.includes('geometry')) dataType = 'geometry';
          else if (columnDef.format.includes('date')) dataType = 'date';
          else if (columnDef.format.includes('character')) dataType = 'text';
          else if (columnDef.format.includes('numeric')) dataType = 'numeric';
          else if (columnDef.format.includes('boolean')) dataType = 'boolean';
        }
        
        const isRequired = tableDefinition.required?.includes(columnName) || false;
        
        return {
          name: columnName,
          dataType: dataType,
          isNullable: !isRequired,
          defaultValue: columnDef.default || null,
          position: index + 1
        };
      });
      
      console.log(`📋 Schema for ${schema}.${tableName}:`, columns.map(c => `${c.name} (${c.dataType})`));
      return columns;
      
    } catch (error) {
      console.error(`Error fetching schema for ${schema}.${tableName}:`, error);
      return [];
    }
  };

  // ==========================================
  // GDAL analysis functions
  // ==========================================
  const analyzeGdbColumnsWithGDAL = async (files: File[]): Promise<{ layers: LayerInfo[], gdalResult: GDALAnalysisResult | null }> => {
    try {
      console.log('🔍 Using GDAL microservice to analyze geodatabase...');
      
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      const gdbFiles = files.filter(f => f.name.includes('.gdb/'));
      if (gdbFiles.length === 0) {
        console.log('No .gdb files found');
        return { layers: [], gdalResult: null };
      }
      
      const gdbFolderName = gdbFiles[0].name.split('/')[0];
      console.log(`📁 Processing geodatabase: ${gdbFolderName}`);
      
      for (const file of gdbFiles) {
        zip.file(file.name, file);
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const tempFilename = `temp-analysis-${Date.now()}-${gdbFolderName}.zip`;
      
      console.log(`📦 Created analysis zip: ${tempFilename} (${(zipBlob.size / 1024 / 1024).toFixed(2)}MB)`);

      // Check if file is too large for direct upload
      const MAX_DIRECT_SIZE = 50 * 1024 * 1024; // 50MB limit for direct uploads
      
      if (zipBlob.size > MAX_DIRECT_SIZE) {
        console.log(`⚠️ File too large for direct upload (${(zipBlob.size / 1024 / 1024).toFixed(2)}MB), using Cloud Storage staging...`);
        return await analyzeGdbViaCloudStorage(zipBlob, tempFilename, gdbFolderName);
      } else {
        console.log(`✅ File size OK for direct upload (${(zipBlob.size / 1024 / 1024).toFixed(2)}MB), using direct method...`);
        return await analyzeGdbDirect(zipBlob, tempFilename, gdbFolderName);
      }
      
    } catch (error) {
      console.error('Error using GDAL microservice:', error);
      return { layers: [], gdalResult: null };
    }
  };

  const analyzeGdbDirect = async (zipBlob: Blob, tempFilename: string, gdbFolderName: string): Promise<{ layers: LayerInfo[], gdalResult: GDALAnalysisResult | null }> => {
    console.log('Step 1: Discovering layers in geodatabase (direct upload)...');
    
    const formData = new FormData();
    formData.append('file', new File([zipBlob], tempFilename));
    formData.append('command', 'ogrinfo');
    formData.append('args', JSON.stringify(['-json', `/vsizip/${tempFilename}/${gdbFolderName}`]));
    
    const response = await fetch('/api/gdal-proxy/upload-and-execute', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`GDAL service returned ${response.status}`);
    }
    
    const result = await response.json();
    return processGdalResult(result, gdbFolderName);
  };

  const analyzeGdbViaCloudStorage = async (zipBlob: Blob, tempFilename: string, gdbFolderName: string): Promise<{ layers: LayerInfo[], gdalResult: GDALAnalysisResult | null }> => {
    try {
      console.log('🔄 Using Cloud Storage staging for large geodatabase analysis...');
      
      // Step 1: Upload to Cloud Storage using signed URLs
      console.log('Step 1: Uploading to Cloud Storage for analysis...');
      const uploaded = await uploadZipToGCS(zipBlob, tempFilename);
      
      if (!uploaded) {
        throw new Error('Failed to upload file to Cloud Storage for analysis');
      }
      
      // Step 2: Tell GDAL service to analyze from Cloud Storage
      console.log('Step 2: Requesting GDAL analysis from Cloud Storage...');
      const analysisResponse = await fetch('/api/gdal-proxy/analyze-from-storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bucket: 'stagedzips',
          filename: tempFilename,
          gdbFolderName: gdbFolderName,
          command: 'ogrinfo',
          args: ['-json', `/vsizip/${tempFilename}/${gdbFolderName}`]
        })
      });
      
      if (!analysisResponse.ok) {
        throw new Error(`GDAL analysis failed: ${analysisResponse.status}`);
      }
      
      const result = await analysisResponse.json();
      
      // Step 3: Clean up temporary file
      console.log('Step 3: Cleaning up temporary analysis file...');
      try {
        await fetch('/api/gdal-proxy/cleanup-temp-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bucket: 'stagedzips', filename: tempFilename })
        });
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', cleanupError);
      }
      
      return processGdalResult(result, gdbFolderName);
      
    } catch (error) {
      console.error('Error in Cloud Storage analysis workflow:', error);
      throw error;
    }
  };

  // Shared result processing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processGdalResult = (result: any, gdbFolderName: string): { layers: LayerInfo[], gdalResult: GDALAnalysisResult | null } => {
    if (!result.success || !result.stdout) {
      console.error('Failed to list layers:', result.stderr);
      return { layers: [], gdalResult: null };
    }
    
    const layersWithFields: LayerInfo[] = [];
    
    try {
      const gdbInfo = JSON.parse(result.stdout);
      const layers = gdbInfo.layers || [];
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.log(`Found ${layers.length} layers:`, layers.map((l: any) => l.name));
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const layer of layers) {
        const layerFields = new Set<string>();
        
        const fields = layer.fields || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const field of fields) {
          if (field.name) {
            layerFields.add(field.name);
          }
        }
        
        const geometryFields = layer.geometryFields || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const geomField of geometryFields) {
          if (geomField.name) {
            layerFields.add(geomField.name);
          }
        }
        
        const commonFields = ['OBJECTID', 'Shape', 'Shape_Length', 'Shape_Area'];
        for (const field of commonFields) {
          if (!Array.from(layerFields).some(col => col.toUpperCase() === field.toUpperCase())) {
            layerFields.add(field);
          }
        }
        
        layersWithFields.push({
          name: layer.name,
          fields: Array.from(layerFields),
          featureCount: layer.featureCount || 'Unknown',
          geometryType: layer.geometryFields?.[0]?.type || 'Unknown'
        });
        
        console.log(`Layer "${layer.name}": ${layerFields.size} fields, ${layer.featureCount || '?'} features`);
      }

      const gdalResult: GDALAnalysisResult = {
        layers: layersWithFields,
        gdbFolderName: gdbFolderName,
        totalLayers: layersWithFields.length,
        analysisTimestamp: new Date().toISOString()
      };

      return { 
        layers: layersWithFields, 
        gdalResult: gdalResult
      };
      
    } catch (e) {
      console.error('Failed to parse layer list JSON:', e);
      return { layers: [], gdalResult: null };
    }
  };

  const analyzeFileColumns = async (files: File[]): Promise<{ needsLayerSelection: boolean, columns: string[], layers?: LayerInfo[], gdalResult?: GDALAnalysisResult | null }> => {
    const allColumns = new Set<string>();

    const hasGDB = files.some(f => f.name.includes('.gdb/'));
    
    if (hasGDB) {
      try {
        const { layers, gdalResult } = await analyzeGdbColumnsWithGDAL(files);
        
        if (layers.length > 1) {
          // Multi-layer geodatabase detected
          setSourceLayerInfo(layers);
          setGdalAnalysisResult(gdalResult);
          return { 
            needsLayerSelection: true, 
            columns: [], 
            layers,
            gdalResult
          };
        } else if (layers.length === 1) {
          // Single layer geodatabase
          const singleLayer = layers[0];
          singleLayer.fields.forEach(col => allColumns.add(col));
          setGdalAnalysisResult(gdalResult);
          return { 
            needsLayerSelection: false, 
            columns: Array.from(allColumns),
            gdalResult
          };
        }
      } catch (error) {
        console.error('Failed to analyze GDB with GDAL service:', error);
      }
    }

    // Handle other file types (CSV, DBF, etc.)
    for (const file of files) {
      try {
        if (file.name.toLowerCase().endsWith('.csv')) {
          const columns = await analyzeCsvColumns(file);
          columns.forEach(col => allColumns.add(col));
        } else if (file.name.toLowerCase().endsWith('.dbf')) {
          console.log('DBF file detected:', file.name);
          const columns = await analyzeDbfColumns(file);
          columns.forEach(col => allColumns.add(col));
        }
      } catch (error) {
        console.error('Error analyzing file:', file.name, error);
      }
    }

    return { 
      needsLayerSelection: false, 
      columns: Array.from(allColumns),
      gdalResult: null
    };
  };

  const analyzeDbfColumns = async (file: File): Promise<string[]> => {
    try {
      const buffer = await readFileAsArrayBuffer(file, 512);
      const view = new DataView(buffer);
      
      const columns: string[] = [];
      let offset = 32;
      
      while (offset < buffer.byteLength - 32 && view.getUint8(offset) !== 0x0D) {
        const nameBytes = new Uint8Array(buffer, offset, 11);
        const decoder = new TextDecoder('ascii');
        const fieldName = decoder.decode(nameBytes).replace(/\0+$/, '');
        
        if (fieldName.length > 0) {
          columns.push(fieldName);
        }
        
        offset += 32;
      }
      
      return columns;
      
    } catch (error) {
      console.error('Error analyzing DBF columns:', error);
      return [];
    }
  };

  const readFileAsArrayBuffer = async (file: File, maxBytes?: number): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      if (maxBytes) {
        reader.readAsArrayBuffer(file.slice(0, maxBytes));
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const analyzeCsvColumns = async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const firstLine = text.split('\n')[0];
          const delimiters = [',', '\t', ';', '|'];
          let columns: string[] = [];
          
          for (const delimiter of delimiters) {
            const testColumns = firstLine.split(delimiter);
            if (testColumns.length > columns.length) {
              columns = testColumns;
            }
          }
          
          const cleanColumns = columns.map(col => 
            col.trim().replace(/^["']|["']$/g, '')
          ).filter(col => col.length > 0);
          
          resolve(cleanColumns);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // ==========================================
  // ENHANCED: Multi-layer schema validation
  // ==========================================
  
  const handleSchemaValidation = async () => {
    if (formData.selectedFiles.length === 0) {
      setUploadMessage('Please select files before validating schema.');
      return;
    }

    setIsValidatingSchema(true);
    setSchemaValidationState('validating');
    
    try {
      const schemaToUse = getSchemaFromDomain(formData.domain);
      console.log(`🎯 Using schema "${schemaToUse}" for domain "${formData.domain}"`);
      
      const tables = await fetchAvailableTables(schemaToUse);
      setAvailableTables(tables);
      
      if (tables.length === 0) {
        setUploadMessage(`No accessible tables found in the ${schemaToUse} schema. Please check the schema configuration.`);
        setSchemaValidationState('not_started');
        return;
      }
      
      const analysisResult = await analyzeFileColumns(formData.selectedFiles);
      
      if (analysisResult.gdalResult) {
        setGdalAnalysisResult(analysisResult.gdalResult);
      }
      
      if (analysisResult.needsLayerSelection && analysisResult.layers) {
        // Multi-layer geodatabase - create initial mappings for all layers
        console.log('🗂️ Multi-layer geodatabase detected - setting up layer mappings');
        
        const initialMappings: LayerTableMapping[] = analysisResult.layers.map(layer => ({
          sourceLayer: layer.name,
          layerFields: layer.fields,
          targetTable: '', // User will select these
          columnMapping: {},
          isComplete: false,
          enabled: true, // All layers enabled by default
        }));
        
        setLayerTableMappings(initialMappings);
        setSchemaValidationState('table_mapping');
        setUploadMessage(
          `✅ Found ${analysisResult.layers.length} layers in geodatabase. Please select target tables for each layer.`
        );
        return;
      }
      
      if (analysisResult.columns.length === 0) {
        const hasGDB = formData.selectedFiles.some(f => f.name.includes('.gdb/'));
        
        if (hasGDB) {
          setShowManualColumnInput(true);
          setUploadMessage('Could not automatically extract columns from geodatabase. Please enter them manually.');
          return;
        } else {
          setUploadMessage('Could not detect column names from uploaded files. Please upload CSV files or enter columns manually.');
          setShowManualColumnInput(true);
          return;
        }
      }
      
      // Single layer/file - use legacy workflow
      setSourceColumns(analysisResult.columns);
      setSchemaValidationState('column_mapping');
      setUploadMessage(`✅ Successfully extracted ${analysisResult.columns.length} columns from files. Please select a target table and map columns.`);
      
    } catch (error) {
      console.error('Schema validation error:', error);
      setUploadMessage('Error during schema validation. Please try again.');
      setSchemaValidationState('not_started');
    } finally {
      setIsValidatingSchema(false);
    }
  };

  // ==========================================
  // Multi-layer table and column mapping handlers
  // ==========================================
  
  const handleLayerTableSelection = async (layerIndex: number, tableFullName: string) => {
    const updatedMappings = [...layerTableMappings];
    const mapping = updatedMappings[layerIndex];
    
    mapping.targetTable = tableFullName;
    
    if (tableFullName) {
      // Fetch schema for this table and auto-map columns
      const [schema, tableName] = tableFullName.split('.');
      const columns = await fetchTableSchema(schema, tableName);
      
      // Auto-map columns based on name matching
      const newColumnMapping: {[key: string]: string} = {};
      mapping.layerFields.forEach(sourceCol => {
        const matchingTarget = columns.find((targetCol: ColumnInfo) => 
          targetCol.name.toLowerCase() === sourceCol.toLowerCase()
        );
        if (matchingTarget) {
          newColumnMapping[sourceCol] = matchingTarget.name;
        }
      });
      
      mapping.columnMapping = newColumnMapping;
      
      // Check if mapping is complete
      const unmappedColumns = mapping.layerFields.filter(col => !newColumnMapping[col]);
      mapping.isComplete = unmappedColumns.length === 0;
      
      if (mapping.isComplete) {
        console.log(`✅ Layer "${mapping.sourceLayer}" fully mapped to ${tableFullName}`);
      } else {
        console.log(`⚠️ Layer "${mapping.sourceLayer}" has ${unmappedColumns.length} unmapped columns`);
      }
    } else {
      mapping.columnMapping = {};
      mapping.isComplete = false;
    }
    
    setLayerTableMappings(updatedMappings);
    
    // Check if overall validation is complete
    if (isMultiLayerValidationComplete(updatedMappings)) {
      setSchemaValidationState('completed');
      setUploadMessage('✅ Multi-layer schema validation completed! All enabled layers have been mapped successfully.');
    } else {
      const enabledCount = getEnabledLayerCount(updatedMappings);
      const completedCount = getCompletedMappingCount(updatedMappings);
      setUploadMessage(`Progress: ${completedCount}/${enabledCount} layers fully mapped. Continue mapping the remaining layers.`);
    }
  };

  const handleLayerColumnMapping = (layerIndex: number, sourceCol: string, targetCol: string) => {
    const updatedMappings = [...layerTableMappings];
    const mapping = updatedMappings[layerIndex];
    
    if (targetCol) {
      mapping.columnMapping[sourceCol] = targetCol;
    } else {
      delete mapping.columnMapping[sourceCol];
    }
    
    // Check if this layer mapping is now complete
    const unmappedColumns = mapping.layerFields.filter(col => !mapping.columnMapping[col]);
    mapping.isComplete = mapping.targetTable && unmappedColumns.length === 0;
    
    setLayerTableMappings(updatedMappings);
    
    // Check if overall validation is complete
    if (isMultiLayerValidationComplete(updatedMappings)) {
      setSchemaValidationState('completed');
      setUploadMessage('✅ Multi-layer schema validation completed! All enabled layers have been mapped successfully.');
    }
  };

  const handleLayerToggle = (layerIndex: number, enabled: boolean) => {
    const updatedMappings = [...layerTableMappings];
    updatedMappings[layerIndex].enabled = enabled;
    
    if (!enabled) {
      // Clear mappings when disabled
      updatedMappings[layerIndex].targetTable = '';
      updatedMappings[layerIndex].columnMapping = {};
      updatedMappings[layerIndex].isComplete = false;
    }
    
    setLayerTableMappings(updatedMappings);
    
    // Update validation state
    if (isMultiLayerValidationComplete(updatedMappings)) {
      setSchemaValidationState('completed');
      setUploadMessage('✅ Multi-layer schema validation completed! All enabled layers have been mapped successfully.');
    }
  };

  // ==========================================
  // Legacy single-layer handlers (for backward compatibility)
  // ==========================================
  
  const handleLayerSelection = (layerName: string) => {
    setSelectedSourceLayer(layerName);
    
    const selectedLayer = sourceLayerInfo.find(layer => layer.name === layerName);
    if (selectedLayer) {
      if (gdalAnalysisResult) {
        setGdalAnalysisResult({
          ...gdalAnalysisResult,
          selectedLayer: selectedLayer
        });
      }
      
      setSourceColumns(selectedLayer.fields);
      setSchemaValidationState('column_mapping');
      setUploadMessage(`✅ Selected layer "${layerName}" with ${selectedLayer.fields.length} columns. Please select a target table and map columns.`);
    }
  };

  const handleTableSelection = async (tableFullName: string) => {
    setSelectedTable(tableFullName);
    
    if (tableFullName) {
      const [schema, tableName] = tableFullName.split('.');
      const columns = await fetchTableSchema(schema, tableName);
      setTargetColumns(columns);
      
      const newMapping: {[key: string]: string} = {};
      sourceColumns.forEach(sourceCol => {
        const matchingTarget = columns.find((targetCol: ColumnInfo) => 
          targetCol.name.toLowerCase() === sourceCol.toLowerCase()
        );
        if (matchingTarget) {
          newMapping[sourceCol] = matchingTarget.name;
        }
      });
      setColumnMapping(newMapping);
      
      const unmappedColumns = sourceColumns.filter(col => !newMapping[col]);
      if (unmappedColumns.length === 0) {
        setSchemaValidationState('completed');
        setUploadMessage('✅ Schema validation completed! All columns mapped successfully. You can now upload.');
      } else {
        setUploadMessage(`Please map the remaining ${unmappedColumns.length} columns to complete validation.`);
      }
    }
  };

  const isColumnMappingComplete = (): boolean => {
    if (formData.loadType === 'full') return true;
    if (schemaValidationState !== 'column_mapping' && schemaValidationState !== 'completed') return false;
    if (sourceColumns.length === 0) return false;
    if (!selectedTable) return false;
    
    return sourceColumns.every(col => columnMapping[col]);
  };

  useEffect(() => {
    if (schemaValidationState === 'column_mapping' && isColumnMappingComplete()) {
      setSchemaValidationState('completed');
      setUploadMessage('✅ Schema validation completed! All columns mapped successfully. You can now upload.');
    }
  }, [columnMapping, sourceColumns, selectedTable, schemaValidationState]);

  // ==========================================
  // Manual column input handlers
  // ==========================================
  
  const handleManualColumnSubmit = () => {
    const columns = manualColumnInput
      .split(',')
      .map(col => col.trim())
      .filter(col => col.length > 0);
    
    if (columns.length === 0) {
      setUploadMessage('Please enter at least one column name.');
      return;
    }

    // Create a single mapping for manual input
    const singleMapping: LayerTableMapping = {
      sourceLayer: 'Manual Input',
      layerFields: columns,
      targetTable: '',
      columnMapping: {},
      isComplete: false,
      enabled: true
    };
    
    setLayerTableMappings([singleMapping]);
    setShowManualColumnInput(false);
    setManualColumnInput('');
    setSchemaValidationState('table_mapping');
    setUploadMessage(`✅ Successfully entered ${columns.length} columns. Please select a target table.`);
  };

  const handleManualColumnCancel = () => {
    setShowManualColumnInput(false);
    setManualColumnInput('');
    setSchemaValidationState('not_started');
  };

  // ==========================================
  // Enhanced metadata generation
  // ==========================================
  
  const generateMetadata = (): EnhancedMetadata => {
    const effectiveDomain = formData.domain === 'custom' ? formData.customDomain : formData.domain;
    
    return {
      projectName: formData.projectName,
      datasetName: formData.datasetName,
      authorName: formData.authorName,
      publicationType: formData.publicationType,
      description: formData.description,
      domain: effectiveDomain,
      dataTopic: formData.dataTopic,
      scale: formData.scale || undefined,
      quadName: formData.quadName || undefined,
      pubId: formData.pubId || undefined,
      loadType: formData.loadType,
      submittedBy: email || '',
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
        validationState: schemaValidationState,
        isMultiLayer: layerTableMappings.length > 1 || (layerTableMappings.length === 1 && layerTableMappings[0].sourceLayer !== 'Manual Input'),
        selectedLayers: layerTableMappings,
        gdalAnalysis: gdalAnalysisResult,
        validationCompleted: schemaValidationState === 'completed',
        mappingTimestamp: new Date().toISOString(),
        postgreRestUrl: getPostgrestUrl(formData.domain),
        
        // Legacy fields for backward compatibility
        targetTable: selectedTable,
        sourceLayer: selectedSourceLayer,
        sourceColumns: sourceColumns,
        columnMapping: columnMapping,
        currentLayer: layerTableMappings.length > 0 ? layerTableMappings[0] : undefined,
      } : undefined,
      containsGeodatabase: formData.selectedFiles.some(file => 
        file.name.includes('.gdb/') || file.name.endsWith('.gdb')
      ),
      userAgent: navigator.userAgent,
      uploadSource: 'UGS Ingest Web Application v3.0 (Multi-Layer Support with Domain-Specific PostgREST URLs)',
    };
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.projectName.trim()) newErrors.projectName = 'Project name is required.';
    if (!formData.datasetName.trim()) newErrors.datasetName = 'Dataset name is required.';
    if (!formData.authorName.trim()) newErrors.authorName = 'Author name is required.';
    if (!formData.publicationType) newErrors.publicationType = 'Publication type is required.';
    if (!formData.selectedFiles || formData.selectedFiles.length === 0) newErrors.selectedFiles = 'Please select or drop at least one file to upload.';
    if (!formData.domain) newErrors.domain = 'Domain is required.';
    if (formData.domain === 'custom' && !formData.customDomain.trim()) {
      newErrors.customDomain = 'Custom domain name is required.';
    }
    if (!formData.dataTopic.trim()) newErrors.dataTopic = 'Data topic is required.';
    if (!formData.loadType) newErrors.loadType = 'Load type is required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createZipFile = async (): Promise<Blob> => {
    const JSZip = (await import('jszip')).default;
    
    const metadata = generateMetadata();
    const metadataJson = JSON.stringify(metadata, null, 2);
    
    const zip = new JSZip();
    zip.file('metadata.json', metadataJson);
    
    formData.selectedFiles.forEach((file) => {
      zip.file(`data/${file.name}`, file);
    });
    
    return await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6
      }
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setUploadMessage('');

    if (!validateForm()) {
      setUploadMessage('Please correct the errors in the form.');
      return;
    }

    // Enhanced validation for multi-layer vs single-layer
    if (formData.loadType !== 'full') {
      if (layerTableMappings.length > 0) {
        // Multi-layer validation
        if (!isMultiLayerValidationComplete(layerTableMappings)) {
          const enabledCount = getEnabledLayerCount(layerTableMappings);
          const completedCount = getCompletedMappingCount(layerTableMappings);
          setUploadMessage(`Please complete mapping for all enabled layers (${completedCount}/${enabledCount} completed).`);
          return;
        }
      } else {
        // Legacy single-layer validation
        if (schemaValidationState !== 'completed') {
          setUploadMessage('Please complete schema validation before uploading.');
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      // Step 1: Create zip file
      setUploadMessage('📦 Creating zip file...');
      const zipBlob = await createZipFile();
      
      const fileSizeMB = (zipBlob.size / 1024 / 1024).toFixed(2);
      console.log(`📦 Zip file created: ${generatedFilename} (${fileSizeMB}MB)`);

      // Step 2: Show appropriate message based on file size
      if (zipBlob.size > 100 * 1024 * 1024) { // 100MB+
        setUploadMessage(`📤 Uploading large file (${fileSizeMB}MB) - this may take several minutes...`);
      } else if (zipBlob.size > 10 * 1024 * 1024) { // 10MB+
        setUploadMessage(`📤 Uploading file (${fileSizeMB}MB) - please wait...`);
      } else {
        setUploadMessage('📤 Uploading to cloud storage...');
      }

      // Step 3: Upload using signed URLs
      await uploadZipToGCS(zipBlob, generatedFilename);

      // Step 4: Success message
      const layerCount = getEnabledLayerCount(layerTableMappings);
      const layerInfo = layerCount > 1 ? ` with ${layerCount} layers` : '';
      
      setUploadMessage(`✅ Upload successful! File "${generatedFilename}" (${fileSizeMB}MB)${layerInfo} has been uploaded to cloud storage.`);
      
      // Reset form
      setFormData({
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
      setErrors({});
      setGeneratedFilename('');
      setLayerTableMappings([]);
      setColumnMapping({});
      setSelectedTable('');
      setSelectedSourceLayer('');
      setSourceLayerInfo([]);
      setSchemaValidationState('not_started');
      setGdalAnalysisResult(null);
      
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

    } catch (error) {
      console.error('Upload process failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setUploadMessage(`❌ Upload failed: ${errorMessage}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // Render helpers
  // ==========================================

  // Loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user information...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h2>
          <p className="text-gray-600 mb-4">Unable to verify your authentication status.</p>
          <p className="text-sm text-red-500">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Not authenticated state
  if (!authenticated) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">You are not authorized to access this application.</p>
          <p className="text-sm text-gray-500">Please contact your administrator if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // Main form render
  // ==========================================
  return (
    <div className="max-w-6xl mx-auto p-8 bg-white rounded-lg shadow-lg">
      {/* Modals */}
      <LayerSelectionModal
        isOpen={schemaValidationState === 'layer_selection'}
        layers={sourceLayerInfo}
        selectedLayer={selectedSourceLayer}
        onLayerSelect={(layerName: string) => setSelectedSourceLayer(layerName)}
        onConfirm={() => handleLayerSelection(selectedSourceLayer)}
        onCancel={() => {
          setSchemaValidationState('not_started');
          setSelectedSourceLayer('');
        }}
      />

      <ManualColumnModal
        isOpen={showManualColumnInput}
        columnInput={manualColumnInput}
        onInputChange={setManualColumnInput}
        onSubmit={handleManualColumnSubmit}
        onCancel={handleManualColumnCancel}
      />

      <SchemaMappingModal
        isOpen={schemaValidationState === 'column_mapping'}
        selectedSourceLayer={selectedSourceLayer}
        sourceColumns={sourceColumns}
        selectedTable={selectedTable}
        availableTables={availableTables}
        targetColumns={targetColumns}
        columnMapping={columnMapping}
        onTableSelect={handleTableSelection}
        onColumnMap={(sourceCol, targetCol) => setColumnMapping(prev => ({
          ...prev,
          [sourceCol]: targetCol
        }))}
        onComplete={() => setSchemaValidationState('completed')}
        onCancel={() => setSchemaValidationState('not_started')}
        isComplete={isColumnMappingComplete()}
      />

      {/* Multi-Layer Table Mapping Modal */}
      {schemaValidationState === 'table_mapping' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Multi-Layer Table Mapping</h2>
            
            {gdalAnalysisResult && (
              <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-blue-800 font-semibold mb-1">
                  📁 Geodatabase: {gdalAnalysisResult.gdbFolderName}
                </p>
                <p className="text-blue-700 text-sm">
                  Found {gdalAnalysisResult.totalLayers} layers. Select target tables and map columns for each layer you want to process.
                </p>
              </div>
            )}

            {/* Progress indicator */}
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Progress: {getCompletedMappingCount(layerTableMappings)}/{getEnabledLayerCount(layerTableMappings)} layers mapped
                </span>
                <span className="text-xs text-gray-500">
                  {layerTableMappings.filter(m => !m.enabled).length} layers disabled
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${getEnabledLayerCount(layerTableMappings) > 0 ? 
                      (getCompletedMappingCount(layerTableMappings) / getEnabledLayerCount(layerTableMappings)) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>

            {/* Layer mappings */}
            <div className="space-y-6">
              {layerTableMappings.map((mapping, index) => (
                <div key={mapping.sourceLayer} className={`border rounded-lg p-4 ${
                  mapping.enabled ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={mapping.enabled}
                        onChange={(e) => handleLayerToggle(index, e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div>
                        <h3 className={`text-lg font-semibold ${
                          mapping.enabled ? 'text-gray-800' : 'text-gray-500'
                        }`}>
                          {mapping.sourceLayer}
                        </h3>
                        <p className={`text-sm ${
                          mapping.enabled ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          {mapping.layerFields.length} fields
                        </p>
                      </div>
                    </div>
                    {mapping.enabled && mapping.isComplete && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        ✅ Complete
                      </span>
                    )}
                  </div>

                  {mapping.enabled && (
                    <>
                      {/* Target table selection */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Target Table:
                        </label>
                        <select
                          value={mapping.targetTable}
                          onChange={(e) => handleLayerTableSelection(index, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select a target table...</option>
                          {availableTables.map(table => (
                            <option key={table.fullName} value={table.fullName}>
                              {table.displayName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Column mapping preview */}
                      {mapping.targetTable && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">Column Mapping:</h4>
                          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded p-3 bg-gray-50">
                            {mapping.layerFields.map(sourceCol => (
                              <div key={sourceCol} className="flex items-center justify-between py-1">
                                <span className="text-sm text-gray-700">{sourceCol}</span>
                                <span className="text-xs text-gray-500">
                                  → {mapping.columnMapping[sourceCol] || 'unmapped'}
                                </span>
                              </div>
                            ))}
                          </div>
                          {!mapping.isComplete && (
                            <button
                              onClick={() => {
                                // TODO: Open detailed column mapping modal for this specific layer
                                console.log(`Open detailed mapping for ${mapping.sourceLayer}`);
                              }}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              Configure column mapping →
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Modal actions */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setSchemaValidationState('not_started');
                  setLayerTableMappings([]);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              {isMultiLayerValidationComplete(layerTableMappings) && (
                <button
                  onClick={() => {
                    setSchemaValidationState('completed');
                    setUploadMessage('✅ Multi-layer schema validation completed! All enabled layers have been mapped successfully.');
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Complete Mapping
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User info header */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-800">
              Logged in as: <strong>{email}</strong>
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Utah Department of Natural Resources - UGS
            </p>
          </div>
          <div className="w-3 h-3 bg-green-500 rounded-full" title="Authenticated"></div>
        </div>
      </div>

      {/* Domain-specific PostgREST URL indicator */}
      {formData.domain && (
        <div className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-700">
            <strong>PostgREST Service:</strong> {getPostgrestUrl(formData.domain)}
            {formData.domain === 'groundwater' && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                Using Groundwater-specific service
              </span>
            )}
          </p>
        </div>
      )}

      {/* Enhanced Schema Validation Status for Multi-Layer */}
      {(schemaValidationState !== 'not_started' || layerTableMappings.length > 0) && (
        <div className="mb-6 p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-gray-800">Schema Validation Status:</h4>
              <div className="mt-2 flex items-center space-x-4">
                {/* Status badge */}
                <span className={`px-3 py-1 text-sm rounded-full ${
                  schemaValidationState === 'not_started' ? 'bg-gray-100 text-gray-700' :
                  schemaValidationState === 'validating' ? 'bg-blue-100 text-blue-700' :
                  schemaValidationState === 'layer_selection' ? 'bg-yellow-100 text-yellow-700' :
                  schemaValidationState === 'table_mapping' ? 'bg-orange-100 text-orange-700' :
                  schemaValidationState === 'column_mapping' ? 'bg-purple-100 text-purple-700' :
                  schemaValidationState === 'completed' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {schemaValidationState === 'not_started' && '⏳ Not Started'}
                  {schemaValidationState === 'validating' && '🔄 Validating...'}
                  {schemaValidationState === 'layer_selection' && '📋 Layer Selection Required'}
                  {schemaValidationState === 'table_mapping' && '🗂️ Multi-Layer Table Mapping'}
                  {schemaValidationState === 'column_mapping' && '🔗 Column Mapping'}
                  {schemaValidationState === 'completed' && '✅ Validation Complete'}
                </span>

                {/* Multi-layer progress indicator */}
                {layerTableMappings.length > 0 && (
                  <div className="flex items-center space-x-2 text-xs text-gray-600">
                    <span>
                      {getCompletedMappingCount(layerTableMappings)}/{getEnabledLayerCount(layerTableMappings)} layers mapped
                    </span>
                    {layerTableMappings.filter(m => !m.enabled).length > 0 && (
                      <span className="text-gray-500">
                        ({layerTableMappings.filter(m => !m.enabled).length} disabled)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Multi-layer details */}
              {layerTableMappings.length > 0 && (
                <div className="mt-3 text-xs text-gray-600">
                  <p>Layers found:</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {layerTableMappings.map((mapping, index) => (
                      <span 
                        key={index}
                        className={`px-2 py-1 rounded text-xs ${
                          !mapping.enabled ? 'bg-gray-100 text-gray-400' :
                          mapping.isComplete ? 'bg-green-100 text-green-700' :
                          mapping.targetTable ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {mapping.sourceLayer}
                        {mapping.enabled && mapping.isComplete && ' ✓'}
                      </span>
                    ))}
                  </div>
                </div>
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
      )}

      {/* Generated filename preview */}
      {generatedFilename && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-green-800 font-semibold">Generated Zip Filename:</p>
          <p className="text-green-700 font-mono text-lg mt-1">{generatedFilename}</p>
          {layerTableMappings.length > 1 && (
            <p className="text-xs text-green-600 mt-1">
              Multi-layer geodatabase with {getEnabledLayerCount(layerTableMappings)} enabled layers
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <h2 className="text-3xl font-bold text-blue-600 mb-6 text-center">Upload Dataset</h2>

        {/* Project Information Section */}
        <ProjectInfoForm
          formData={formData}
          errors={errors}
          handleChange={handleChange}
        />

        {/* File Naming Convention Section */}
        <NamingConventionForm
          formData={formData}
          errors={errors}
          handleChange={handleChange}
        />

        {/* File Upload Section */}
        <FileUploadSection
          formData={formData}
          errors={errors}
          isDragging={isDragging}
          isProcessingFolders={isProcessingFolders}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onFileOrFolderSelect={handleFileOrFolderSelect}
          onFileChange={handleFileChange}
          onRemoveFile={removeFile}
        />

        {/* Enhanced Action Buttons with Multi-Layer Support */}
        <ActionButtons
          loadType={formData.loadType}
          schemaValidationState={schemaValidationState}
          isValidatingSchema={isValidatingSchema}
          isSubmitting={isSubmitting}
          isProcessingFolders={isProcessingFolders}
          selectedFilesCount={formData.selectedFiles.length}
          domain={formData.domain}
          uploadMessage={uploadMessage}
          onSchemaValidation={handleSchemaValidation}
          onSubmit={handleSubmit}
        />

        {/* Info sections */}
        <div className="mt-6 p-4 bg-gray-50 rounded-md border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">File Naming Convention:</h4>
          <p className="text-xs text-gray-600 font-mono">
            &lt;domain&gt;_&lt;data_topic&gt;_&lt;scale&gt;_&lt;quad_name&gt;_&lt;pub_id&gt;_&lt;load_type&gt;_&lt;YYYYMMDD&gt;.zip
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Required fields are marked with <span className="text-red-500">*</span>. 
            Optional fields will be omitted from filename if left empty.
          </p>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
          <p className="text-xs text-blue-700">
            <strong>Multi-Layer Support:</strong> This application now supports file geodatabases with multiple layers! 
            Select which layers to process, map each to target tables, and configure column mappings individually. 
            The system automatically handles the backend processing for each layer.
          </p>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
          <p className="text-xs text-gray-600">
            <strong>Audit Trail:</strong> All uploads are logged with user identification, timestamp, 
            file details, layer mappings, and schema validation results. Multi-layer metadata includes 
            complete mapping information for each processed layer.
          </p>
        </div>
      </form> 
    </div>