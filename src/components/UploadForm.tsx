// components/UploadForm.tsx - Refactored Main Component
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
  //FileSystemFileEntry,
} from '../types/uploadTypes';

import { getSchemaFromDomain } from '../types/uploadTypes';

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

  // State for schema validation workflow
  const [schemaValidationState, setSchemaValidationState] = useState<SchemaValidationState>('not_started');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [sourceColumns, setSourceColumns] = useState<string[]>([]);
  const [targetColumns, setTargetColumns] = useState<ColumnInfo[]>([]);
  const [columnMapping, setColumnMapping] = useState<{[key: string]: string}>({});
  const [availableTables, setAvailableTables] = useState<TableInfo[]>([]);
  const [showManualColumnInput, setShowManualColumnInput] = useState<boolean>(false);
  const [manualColumnInput, setManualColumnInput] = useState<string>('');

  // State for layer selection
  const [sourceLayerInfo, setSourceLayerInfo] = useState<LayerInfo[]>([]);
  const [selectedSourceLayer, setSelectedSourceLayer] = useState<string>('');
  const [gdalAnalysisResult, setGdalAnalysisResult] = useState<GDALAnalysisResult | null>(null);

  // State for validation errors and UI
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isValidatingSchema, setIsValidatingSchema] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [generatedFilename, setGeneratedFilename] = useState<string>('');
  const [isProcessingFolders, setIsProcessingFolders] = useState<boolean>(false);

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

  // File handling functions
  const processDataTransferItems = async (items: DataTransferItemList): Promise<File[]> => {
    const files: File[] = [];
    const promises: Promise<void>[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry?.();
        
        if (entry) {
          if (entry.isFile) {
            // Handle regular files - use runtime safety approach
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
            // Handle directories (like .gdb folders)
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
                // Use any type and runtime check for safety
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
    setSchemaValidationState('not_started');
    setGdalAnalysisResult(null);
    setColumnMapping({});
  };

  const removeFile = (indexToRemove: number) => {
    setFormData((prevData) => ({
      ...prevData,
      selectedFiles: prevData.selectedFiles.filter((_, index) => index !== indexToRemove),
    }));
    setSchemaValidationState('not_started');
    setGdalAnalysisResult(null);
    setColumnMapping({});
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

  // PostgREST and GDAL functions
  const POSTGREST_URL = 'https://postgrest-seamlessgeolmap-734948684426.us-central1.run.app';

  const fetchAvailableTables = async (schemaName?: string): Promise<TableInfo[]> => {
    try {
      const schema = schemaName || 'mapping';
      console.log(`🔍 Discovering tables in schema: ${schema}`);

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

  const analyzeGdbColumnsWithGDAL = async (files: File[]): Promise<{ layers: LayerInfo[], columns: string[], gdalResult: GDALAnalysisResult | null }> => {
    const GDAL_SERVICE_URL = '/api/gdal-proxy';
    
    try {
      console.log('🔍 Using GDAL microservice to analyze geodatabase...');
      
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      const gdbFiles = files.filter(f => f.name.includes('.gdb/'));
      if (gdbFiles.length === 0) {
        console.log('No .gdb files found');
        return { layers: [], columns: [], gdalResult: null };
      }
      
      const gdbFolderName = gdbFiles[0].name.split('/')[0];
      console.log(`📁 Processing geodatabase: ${gdbFolderName}`);
      
      for (const file of gdbFiles) {
        zip.file(file.name, file);
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      console.log('Step 1: Discovering layers in geodatabase...');
      
      const formData1 = new FormData();
      formData1.append('file', new File([zipBlob], `${gdbFolderName}.zip`));
      formData1.append('command', 'ogrinfo');
      formData1.append('args', JSON.stringify(['-json', `/vsizip/${gdbFolderName}.zip/${gdbFolderName}`]));
      
      const response1 = await fetch(`${GDAL_SERVICE_URL}/upload-and-execute`, {
        method: 'POST',
        body: formData1
      });
      
      if (!response1.ok) {
        throw new Error(`GDAL service returned ${response1.status}`);
      }
      
      const result1 = await response1.json();
      
      if (!result1.success || !result1.stdout) {
        console.error('Failed to list layers:', result1.stderr);
        return { layers: [], columns: [], gdalResult: null };
      }
      
      const layersWithFields: LayerInfo[] = [];
      try {
        const gdbInfo = JSON.parse(result1.stdout);
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

        if (layersWithFields.length === 1) {
          console.log(`✅ Single layer found: ${layersWithFields[0].name}, auto-selecting`);
          const resultWithSelection: GDALAnalysisResult = {
            ...gdalResult,
            selectedLayer: layersWithFields[0]
          };
          
          return { 
            layers: layersWithFields, 
            columns: layersWithFields[0].fields,
            gdalResult: resultWithSelection
          };
        }
        
        console.log(`✅ Found ${layersWithFields.length} layers, requiring user selection`);
        return { 
          layers: layersWithFields, 
          columns: [],
          gdalResult: gdalResult
        };
        
      } catch (e) {
        console.error('Failed to parse layer list JSON:', e);
        return { layers: [], columns: [], gdalResult: null };
      }
      
    } catch (error) {
      console.error('Error using GDAL microservice:', error);
      return { layers: [], columns: [], gdalResult: null };
    }
  };

  const analyzeFileColumns = async (files: File[]): Promise<{ needsLayerSelection: boolean, columns: string[], layers?: LayerInfo[], gdalResult?: GDALAnalysisResult | null }> => {
    const allColumns = new Set<string>();

    const hasGDB = files.some(f => f.name.includes('.gdb/'));
    
    if (hasGDB) {
      try {
        const { layers, columns, gdalResult } = await analyzeGdbColumnsWithGDAL(files);
        
        if (layers.length > 1) {
          setSourceLayerInfo(layers);
          setGdalAnalysisResult(gdalResult);
          return { 
            needsLayerSelection: true, 
            columns: [], 
            layers,
            gdalResult
          };
        } else if (layers.length === 1) {
          columns.forEach(col => allColumns.add(col));
          setGdalAnalysisResult(gdalResult);
          if (columns.length > 0) {
            return { 
              needsLayerSelection: false, 
              columns: Array.from(allColumns),
              gdalResult
            };
          }
        }
      } catch (error) {
        console.error('Failed to analyze GDB with GDAL service:', error);
      }
    }

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

  const fetchTableSchema = async (schema: string, tableName: string): Promise<ColumnInfo[]> => {
    try {
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

  // Schema validation and metadata functions
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
      
      if (analysisResult.needsLayerSelection) {
        setSchemaValidationState('layer_selection');
        setUploadMessage('Multiple layers found. Please select a source layer.');
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
      
      setSourceColumns(analysisResult.columns);
      setSchemaValidationState('mapping');
      
      if (analysisResult.columns.length > 0) {
        setUploadMessage(`✅ Successfully extracted ${analysisResult.columns.length} columns from files. Please select a target table and map columns.`);
      }
      
    } catch (error) {
      console.error('Schema validation error:', error);
      setUploadMessage('Error during schema validation. Please try again.');
      setSchemaValidationState('not_started');
    } finally {
      setIsValidatingSchema(false);
    }
  };

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
      setSchemaValidationState('mapping');
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
    if (schemaValidationState !== 'mapping' && schemaValidationState !== 'completed') return false;
    if (sourceColumns.length === 0) return false;
    if (!selectedTable) return false;
    
    return sourceColumns.every(col => columnMapping[col]);
  };

  useEffect(() => {
    if (schemaValidationState === 'mapping' && isColumnMappingComplete()) {
      setSchemaValidationState('completed');
      setUploadMessage('✅ Schema validation completed! All columns mapped successfully. You can now upload.');
    }
  }, [columnMapping, sourceColumns, selectedTable, schemaValidationState]);

  const generateMetadata = () => {
    const effectiveDomain = formData.domain === 'custom' ? formData.customDomain : formData.domain;
    
    return {
      projectName: formData.projectName,
      datasetName: formData.datasetName,
      authorName: formData.authorName,
      publicationType: formData.publicationType,
      description: formData.description,
      domain: effectiveDomain,
      dataTopic: formData.dataTopic,
      scale: formData.scale || null,
      quadName: formData.quadName || null,
      pubId: formData.pubId || null,
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
        validationState: schemaValidationState,
        targetTable: selectedTable,
        sourceLayer: selectedSourceLayer,
        sourceColumns: sourceColumns,
        columnMapping: columnMapping,
        validationCompleted: schemaValidationState === 'completed',
        gdalAnalysis: gdalAnalysisResult,
        mappingTimestamp: new Date().toISOString()
      } : null,
      containsGeodatabase: formData.selectedFiles.some(file => 
        file.name.includes('.gdb/') || file.name.endsWith('.gdb')
      ),
      userAgent: navigator.userAgent,
      uploadSource: 'UGS Ingest Web Application v2.0 (Enhanced Schema Validation)',
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

  const uploadZipToGCS = async (zipBlob: Blob, filename: string): Promise<boolean> => {
    try {
      const functionUrl = `https://us-central1-${process.env.REACT_APP_PROJECT_ID || 'ut-dnr-ugs-backend-tools'}.cloudfunctions.net/ugs-zip-upload`;
      
      console.log('Uploading to Cloud Function:', functionUrl);
      console.log('Filename:', filename);
      console.log('Zip size:', zipBlob.size, 'bytes');

      const response = await fetch(`${functionUrl}?filename=${encodeURIComponent(filename)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/zip',
          'X-Filename': filename,
        },
        body: zipBlob,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Upload failed: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Upload successful:', result);
      return true;

    } catch (error) {
      console.error('❌ Upload to GCS failed:', error);
      throw error;
    }
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

    if (formData.loadType !== 'full' && schemaValidationState !== 'completed') {
      setUploadMessage('Please complete schema validation before uploading.');
      return;
    }

    setIsSubmitting(true);

    try {
      setUploadMessage('Creating zip file...');
      const zipBlob = await createZipFile();
      
      console.log('Generated filename:', generatedFilename);
      console.log('Zip file created with size:', zipBlob.size);

      setUploadMessage('Uploading to cloud storage...');
      await uploadZipToGCS(zipBlob, generatedFilename);

      setUploadMessage(`✅ Upload successful! File "${generatedFilename}" has been uploaded to cloud storage.`);
      
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

  // Manual column input handlers
  const handleManualColumnSubmit = () => {
    const columns = manualColumnInput
      .split(',')
      .map(col => col.trim())
      .filter(col => col.length > 0);
    
    setSourceColumns(columns);
    setShowManualColumnInput(false);
    setManualColumnInput('');
    setSchemaValidationState('mapping');
  };

  const handleManualColumnCancel = () => {
    setShowManualColumnInput(false);
    setManualColumnInput('');
    setSchemaValidationState('not_started');
  };

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

  // Main form render
  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-lg">
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
        isOpen={schemaValidationState === 'mapping'}
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

      {/* Schema Validation Status */}
      <SchemaValidationStatus
        loadType={formData.loadType}
        schemaValidationState={schemaValidationState}
        selectedSourceLayer={selectedSourceLayer}
        selectedTable={selectedTable}
      />

      {/* Generated filename preview */}
      {generatedFilename && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-green-800 font-semibold">Generated Zip Filename:</p>
          <p className="text-green-700 font-mono text-lg mt-1">{generatedFilename}</p>
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

        {/* Action Buttons */}
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
            <strong>Enhanced Schema Validation:</strong> The application now supports separated schema validation and upload workflows! 
            Complete field mapping validation before uploading to ensure data integrity and proper schema compliance.
          </p>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
          <p className="text-xs text-gray-600">
            <strong>Audit Trail:</strong> All uploads are logged with user identification, timestamp, 
            file details, and schema validation results. A metadata.json file will be included in the zip with complete audit information.
          </p>
        </div>
      </form> 
    </div>
  );
};