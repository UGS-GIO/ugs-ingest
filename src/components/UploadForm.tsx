import React, { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent, DragEvent } from 'react';
import { useIAPUser } from '../hooks/useIAPUsers';

// Type definitions for File System Access API
interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';
  getFile(): Promise<File>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory';
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
}

// Types for schema validation
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

declare global {
  interface Window {
    showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
  }
}

interface FormData {
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

// Options for Publication Type dropdown
const publicationTypeOptions = [
  { value: '', label: 'Select Publication Type' },
  { value: 'Special Study', label: 'Special Study' },
  { value: 'Digital Map', label: 'Digital Map' },
  { value: 'Open File', label: 'Open File Report' },
  { value: 'report', label: 'Technical Report' },
  { value: 'dataset', label: 'Dataset' },
  { value: 'other', label: 'Other' },
];

// Domain options (now includes schema option)
const domainOptions = [
  { value: '', label: 'Select Domain' },
  { value: 'hazards', label: 'Hazards', schema: 'hazards' },
  { value: 'groundwater', label: 'Groundwater', schema: 'groundwater' },
  { value: 'wetlands', label: 'Wetlands', schema: 'wetlands' },
  { value: 'geologic_maps', label: 'Geologic Maps', schema: 'mapping' },
  { value: 'energy_minerals', label: 'Energy & Minerals', schema: 'emp' },
  { value: 'ccus', label: 'CCUS', schema: 'ccus' },
  { value: 'boreholes', label: 'Boreholes', schema: 'boreholes' },
  { value: 'geochron', label: 'Geochronology', schema: 'geochron' },
  { value: 'custom', label: 'Other (specify)' },
];

// Helper function to get schema from domain
const getSchemaFromDomain = (domain: string): string => {
  const domainOption = domainOptions.find(option => option.value === domain);
  return domainOption?.schema || 'mapping'; // Default to mapping schema
};

// Load type options
const loadTypeOptions = [
  { value: '', label: 'Select Load Type' },
  { value: 'full', label: 'Full' },
  { value: 'update', label: 'Update' },
  { value: 'append', label: 'Append' },
  { value: 'incremental', label: 'Incremental' },
];

export const UploadForm: React.FC = () => {
  const { email, authenticated, loading, error } = useIAPUser();

  // State to hold all form data
  const [formData, setFormData] = useState<FormData>({
    // Original fields
    projectName: '',
    datasetName: '',
    authorName: email || '',
    publicationType: '',
    description: '',
    selectedFiles: [],
    // New fields
    domain: '',
    customDomain: '',
    dataTopic: '',
    scale: '',
    quadName: '',
    pubId: '',
    loadType: '',
  });

  // State for schema validation
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [showSchemaMapping, setShowSchemaMapping] = useState<boolean>(false);
  const [sourceColumns, setSourceColumns] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [targetColumns, setTargetColumns] = useState<ColumnInfo[]>([]);
  const [columnMapping, setColumnMapping] = useState<{[key: string]: string}>({});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [availableTables, setAvailableTables] = useState<TableInfo[]>([]);
  const [showManualColumnInput, setShowManualColumnInput] = useState<boolean>(false);
  const [manualColumnInput, setManualColumnInput] = useState<string>('');

  // State for validation errors
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
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

      // Use custom domain if "custom" is selected, otherwise use selected domain
      const effectiveDomain = domain === 'custom' ? customDomain : domain;

      // Only generate if we have the required fields
      if (effectiveDomain && dataTopic && loadType && selectedFiles.length > 0) {
        const today = new Date();
        const dateStr = today.getFullYear().toString() +
                       (today.getMonth() + 1).toString().padStart(2, '0') +
                       today.getDate().toString().padStart(2, '0');

        // Build filename parts, filtering out empty values
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

  // Enhanced function to handle both files and folders
  const processDataTransferItems = async (items: DataTransferItemList): Promise<File[]> => {
    const files: File[] = [];
    const promises: Promise<void>[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry?.();
        
        if (entry) {
          if (entry.isFile) {
            // Handle regular files
            promises.push(
              new Promise<void>((resolve) => {
                (entry as FileSystemFileEntry).file((file) => {
                  files.push(file);
                  resolve();
                });
              })
            );
          } else if (entry.isDirectory) {
            // Handle directories (like .gdb folders)
            promises.push(
              readDirectoryEntry(entry as FileSystemDirectoryEntry, entry.name)
                .then((dirFiles) => {
                  files.push(...dirFiles);
                })
                .catch((error) => {
                  console.warn('Error reading directory:', entry.name, error);
                })
            );
          }
        } else {
          // Fallback for browsers that don't support webkitGetAsEntry
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

  // Helper function to read directory entries (for older API)
  const readDirectoryEntry = async (dirEntry: FileSystemDirectoryEntry, basePath = ''): Promise<File[]> => {
    return new Promise((resolve, reject) => {
      const files: File[] = [];
      const reader = dirEntry.createReader();
      
      const readEntries = () => {
        reader.readEntries(async (entries) => {
          if (entries.length === 0) {
            resolve(files);
            return;
          }
          
          const promises = entries.map((entry) => {
            return new Promise<void>((entryResolve) => {
              const fullPath = basePath ? `${basePath}/${entry.name}` : entry.name;
              
              if (entry.isFile) {
                (entry as FileSystemFileEntry).file((file) => {
                  const fileWithPath = new File([file], fullPath, {
                    type: file.type,
                    lastModified: file.lastModified
                  });
                  files.push(fileWithPath);
                  entryResolve();
                });
              } else if (entry.isDirectory) {
                readDirectoryEntry(entry as FileSystemDirectoryEntry, fullPath)
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
          readEntries(); // Continue reading if there are more entries
        }, reject);
      };
      
      readEntries();
    });
  };

  // Add files to selection
  const addFiles = (newFiles: File[]) => {
    setFormData((prevData) => ({
      ...prevData,
      selectedFiles: [...prevData.selectedFiles, ...newFiles],
    }));
    // Clear file error
    if (errors.selectedFiles) {
      setErrors((prevErrors) => ({ ...prevErrors, selectedFiles: undefined }));
    }
  };

  // Remove a specific file from the selection
  const removeFile = (indexToRemove: number) => {
    setFormData((prevData) => ({
      ...prevData,
      selectedFiles: prevData.selectedFiles.filter((_, index) => index !== indexToRemove),
    }));
  };

  // Handler for direct file input change
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      addFiles(newFiles);
      // Reset the input so the same files can be selected again if needed
      e.target.value = '';
    }
  };

  // Unified handler for both files and folders
  const handleFileOrFolderSelect = async () => {
    // First, try the folder picker if available
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
          
          // Close on background click
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
          // Fallback to file picker
          document.getElementById('file-input')?.click();
        }
      }
    } else {
      // If folder picker not supported, just use file picker
      document.getElementById('file-input')?.click();
    }
  };

  // Helper function to read directory using File System Access API
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
        // Use the enhanced function to handle both files and folders
        const newFiles = await processDataTransferItems(e.dataTransfer.items);
        if (newFiles.length > 0) {
          addFiles(newFiles);
        }
      } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        // Fallback for older browsers
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

  // Generate metadata object
  const generateMetadata = () => {
    const effectiveDomain = formData.domain === 'custom' ? formData.customDomain : formData.domain;
    
    return {
      // Original metadata
      projectName: formData.projectName,
      datasetName: formData.datasetName,
      authorName: formData.authorName,
      publicationType: formData.publicationType,
      description: formData.description,
      
      // Zip naming convention fields
      domain: effectiveDomain,
      dataTopic: formData.dataTopic,
      scale: formData.scale || null,
      quadName: formData.quadName || null,
      pubId: formData.pubId || null,
      loadType: formData.loadType,
      
      // System metadata
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
      
      // Schema validation and mapping (if applicable)
      schemaValidation: formData.loadType !== 'full' ? {
        targetTable: selectedTable,
        sourceColumns: sourceColumns,
        columnMapping: columnMapping,
        validationCompleted: showSchemaMapping ? false : Object.keys(columnMapping).length > 0
      } : null,
      containsGeodatabase: formData.selectedFiles.some(file => 
        file.name.includes('.gdb/') || file.name.endsWith('.gdb')
      ),
      
      // Audit trail
      userAgent: navigator.userAgent,
      uploadSource: 'UGS Ingest Web Application',
    };
  };

  // Basic form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Original field validation
    if (!formData.projectName.trim()) newErrors.projectName = 'Project name is required.';
    if (!formData.datasetName.trim()) newErrors.datasetName = 'Dataset name is required.';
    if (!formData.authorName.trim()) newErrors.authorName = 'Author name is required.';
    if (!formData.publicationType) newErrors.publicationType = 'Publication type is required.';
    if (!formData.selectedFiles || formData.selectedFiles.length === 0) newErrors.selectedFiles = 'Please select or drop at least one file to upload.';
    
    // New field validation
    if (!formData.domain) newErrors.domain = 'Domain is required.';
    if (formData.domain === 'custom' && !formData.customDomain.trim()) {
      newErrors.customDomain = 'Custom domain name is required.';
    }
    if (!formData.dataTopic.trim()) newErrors.dataTopic = 'Data topic is required.';
    if (!formData.loadType) newErrors.loadType = 'Load type is required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // PostgREST configuration
  const POSTGREST_URL = 'https://postgrest-seamlessgeolmap-734948684426.us-central1.run.app';

  // Fetch available tables from PostgREST using Accept-Profile header for specific schema
  const fetchAvailableTables = async (schemaName?: string): Promise<TableInfo[]> => {
    try {
      const schema = schemaName || 'mapping'; // Default to mapping schema
      console.log(`🔍 Discovering tables in schema: ${schema}`);

      // Use Accept-Profile header to specify which schema to query
      const headers: Record<string, string> = {
        'Accept-Profile': schema
      };

      // Get the OpenAPI spec for the specified schema
      const apiResponse = await fetch(`${POSTGREST_URL}/`, { headers });
      
      if (!apiResponse.ok) {
        throw new Error(`Failed to fetch API spec for schema ${schema}: ${apiResponse.statusText}`);
      }

      const apiSpec = await apiResponse.json();
      const paths = apiSpec.paths || {};
      
      // Extract table names from paths (excluding /rpc/ endpoints)
      const tableNames = Object.keys(paths)
        .filter(path => path.startsWith('/') && !path.startsWith('/rpc/') && path !== '/')
        .map(path => path.substring(1)); // Remove leading slash
      
      console.log(`📋 Discovered tables in ${schema}:`, tableNames);
      
      const availableTables: TableInfo[] = [];

      // Test each discovered table for accessibility
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

  // Analyze files to extract column names
  const analyzeFileColumns = async (files: File[]): Promise<string[]> => {
    const allColumns = new Set<string>();

    // Check if we have a geodatabase
    const hasGDB = files.some(f => f.name.includes('.gdb/'));
    
    if (hasGDB) {
      // Try to extract columns using GDAL microservice
      try {
        const gdbColumns = await analyzeGdbColumnsWithGDAL(files);
        gdbColumns.forEach(col => allColumns.add(col));
        if (gdbColumns.length > 0) {
          return Array.from(allColumns);
        }
      } catch (error) {
        console.error('Failed to analyze GDB with GDAL service:', error);
        // Fall back to other methods if GDAL service fails
      }
    }

    // Process other file types
    for (const file of files) {
      try {
        if (file.name.toLowerCase().endsWith('.csv')) {
          const columns = await analyzeCsvColumns(file);
          columns.forEach(col => allColumns.add(col));
        } else if (file.name.toLowerCase().endsWith('.dbf')) {
          console.log('DBF file detected:', file.name);
          const columns = await analyzeDbfColumns(file);
          columns.forEach(col => allColumns.add(col));
        } else if (file.name.includes('.gdb/')) {
          console.log('GDB file detected:', file.name);
          // Try local extraction as fallback
          const columns = await analyzeGdbColumns(files);
          columns.forEach(col => allColumns.add(col));
        }
      } catch (error) {
        console.error('Error analyzing file:', file.name, error);
      }
    }

    return Array.from(allColumns);
  };

  // Analyze geodatabase using GDAL microservice - FIXED VERSION
  const analyzeGdbColumnsWithGDAL = async (files: File[]): Promise<string[]> => {
    const GDAL_SERVICE_URL = 'https://gdal-microservice-534590904912.us-central1.run.app';
    
    try {
      console.log('🔍 Using GDAL microservice to analyze geodatabase...');
      
      // Create a zip of the .gdb folder to send to the service
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Add all .gdb files to the zip
      const gdbFiles = files.filter(f => f.name.includes('.gdb/'));
      if (gdbFiles.length === 0) {
        console.log('No .gdb files found');
        return [];
      }
      
      // Find the .gdb folder name
      const gdbFolderName = gdbFiles[0].name.split('/')[0];
      console.log(`📁 Processing geodatabase: ${gdbFolderName}`);
      
      // Add files to zip preserving structure
      for (const file of gdbFiles) {
        zip.file(file.name, file);
      }
      
      // Generate zip blob
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Step 1: Get list of layers/tables in the geodatabase
      console.log('Step 1: Discovering layers in geodatabase...');
      
      const formData1 = new FormData();
      formData1.append('file', new File([zipBlob], `${gdbFolderName}.zip`));
      formData1.append('command', 'ogrinfo');
      // Just list the layers, use -json for easier parsing
      formData1.append('args', JSON.stringify(['-json', gdbFolderName]));
      
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
        return [];
      }
      
      // Parse the JSON output to get layer names
      let layers: string[] = [];
      try {
        const gdbInfo = JSON.parse(result1.stdout);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        layers = gdbInfo.layers?.map((layer: any) => layer.name) || [];
        console.log(`Found ${layers.length} layers:`, layers);
      } catch (e) {
        console.error('Failed to parse layer list JSON:', e);
        // Fallback: try to parse non-JSON output
        layers = parseLayerListFallback(result1.stdout);
      }
      
      if (layers.length === 0) {
        console.warn('No layers found in geodatabase');
        return [];
      }
      
      // Step 2: Get schema for each layer
      const allColumns = new Set<string>();
      
      for (const layerName of layers) {
        console.log(`Step 2: Getting schema for layer "${layerName}"...`);
        
        const formData2 = new FormData();
        formData2.append('file', new File([zipBlob], `${gdbFolderName}.zip`));
        formData2.append('command', 'ogrinfo');
        // Get schema only (-so) for specific layer, in JSON format
        formData2.append('args', JSON.stringify(['-json', '-so', gdbFolderName, layerName]));
        
        const response2 = await fetch(`${GDAL_SERVICE_URL}/upload-and-execute`, {
          method: 'POST',
          body: formData2
        });
        
        if (!response2.ok) {
          console.error(`Failed to get schema for layer ${layerName}`);
          continue;
        }
        
        const result2 = await response2.json();
        
        if (result2.success && result2.stdout) {
          try {
            // Parse the JSON output to extract field names
            const layerInfo = JSON.parse(result2.stdout);
            const fields = layerInfo.layers?.[0]?.fields || [];
            
            for (const field of fields) {
              if (field.name) {
                allColumns.add(field.name);
                console.log(`  Found field: ${field.name} (${field.type})`);
              }
            }
            
            // Also check for geometry column
            if (layerInfo.layers?.[0]?.geometryFields) {
              for (const geomField of layerInfo.layers[0].geometryFields) {
                if (geomField.name) {
                  allColumns.add(geomField.name);
                  console.log(`  Found geometry field: ${geomField.name}`);
                }
              }
            }
          } catch (e) {
            console.error(`Failed to parse schema JSON for layer ${layerName}:`, e);
            // Fallback to text parsing
            const columns = parseOgrInfoOutput(result2.stdout);
            columns.forEach(col => allColumns.add(col));
          }
        }
      }
      
      // Add common GIS fields if we found any columns
      if (allColumns.size > 0) {
        // These are often implicit in geodatabases
        const commonFields = ['OBJECTID', 'Shape', 'Shape_Length', 'Shape_Area'];
        for (const field of commonFields) {
          if (!Array.from(allColumns).some(col => col.toUpperCase() === field.toUpperCase())) {
            // Only add if not already present (case-insensitive check)
            console.log(`Adding common field: ${field}`);
            allColumns.add(field);
          }
        }
      }
      
      const columnArray = Array.from(allColumns);
      console.log(`✅ Extracted ${columnArray.length} unique columns from geodatabase:`, columnArray);
      return columnArray;
      
    } catch (error) {
      console.error('Error using GDAL microservice:', error);
      return [];
    }
  };

  // Fallback parser for non-JSON layer list output
  const parseLayerListFallback = (output: string): string[] => {
    const layers: string[] = [];
    const lines = output.split('\n');
    
    // Look for lines that start with a number followed by a colon (layer listing format)
    // Example: "1: LayerName (Polygon)"
    const layerPattern = /^\d+:\s+([^\s(]+)/;
    
    for (const line of lines) {
      const match = line.match(layerPattern);
      if (match && match[1]) {
        layers.push(match[1]);
      }
    }
    
    // Alternative pattern: "Layer name: LayerName"
    if (layers.length === 0) {
      const altPattern = /^Layer name:\s+(.+)$/i;
      for (const line of lines) {
        const match = line.match(altPattern);
        if (match && match[1]) {
          layers.push(match[1].trim());
        }
      }
    }
    
    return layers;
  };

  // Parse ogrinfo output to extract field names (fallback for non-JSON output)
  const parseOgrInfoOutput = (output: string): string[] => {
    const columns = new Set<string>();
    
    // ogrinfo output format for fields:
    // OBJECTID: Integer64 (0.0)
    // Shape: Geometry
    // field_name: String (255.0)
    
    const lines = output.split('\n');
    let inLayerSection = false;
    
    for (const line of lines) {
      // Check if we're in a layer section
      if (line.startsWith('Layer name:') || line.includes('Feature Count:')) {
        inLayerSection = true;
        continue;
      }
      
      // Look for field definitions (they have a colon followed by a type)
      if (inLayerSection && line.includes(':')) {
        // Match pattern: "field_name: Type" or "field_name (FieldAlias): Type"
        const match = line.match(/^([^:(]+)(?:\s*\([^)]*\))?\s*:\s*(String|Integer|Integer64|Real|Date|DateTime|Binary|Geometry|Text|Double|Float)/i);
        if (match) {
          const fieldName = match[1].trim();
          // Skip metadata fields
          if (!fieldName.startsWith('Layer') && 
              !fieldName.startsWith('Geometry') && 
              !fieldName.startsWith('Feature Count') &&
              !fieldName.startsWith('Extent') &&
              !fieldName.startsWith('SRS') &&
              !fieldName.startsWith('FID Column') &&
              !fieldName.startsWith('Geometry Column') &&
              fieldName.length > 0) {
            columns.add(fieldName);
          }
        }
      }
    }
    
    return Array.from(columns);
  };

  // Analyze geodatabase files to extract column names (fallback method)
  const analyzeGdbColumns = async (allFiles: File[]): Promise<string[]> => {
    try {
      const gdbFiles = allFiles.filter(f => f.name.includes('.gdb/'));
      
      console.log(`Found ${gdbFiles.length} files in geodatabase`);
      
      // Look for metadata.xml files which might contain field information
      const xmlFiles = gdbFiles.filter(f => 
        f.name.endsWith('.xml') || 
        f.name.includes('metadata') ||
        f.name.includes('gdbindexes')
      );
      
      const columns = new Set<string>();
      
      // Try to read XML metadata files
      for (const xmlFile of xmlFiles) {
        try {
          const xmlContent = await readFileAsText(xmlFile);
          const xmlColumns = extractColumnsFromXml(xmlContent);
          xmlColumns.forEach(col => columns.add(col));
        } catch (error) {
          console.log(`Could not read XML metadata ${xmlFile.name}:`, error);
        }
      }
      
      // Look for .spx files which might contain field names
      const spxFiles = gdbFiles.filter(f => f.name.endsWith('.spx'));
      for (const spxFile of spxFiles) {
        const fileName = spxFile.name.split('/').pop()?.replace('.spx', '') || '';
        if (fileName && !fileName.startsWith('a0000')) {
          // File name might be a table name, but we can't get fields from it
          console.log(`Found potential table: ${fileName}`);
        }
      }
      
      // If we found some columns, return them
      if (columns.size > 0) {
        console.log('Extracted columns from GDB metadata:', Array.from(columns));
        return Array.from(columns);
      }
      
      // If no columns found, prompt user that manual input is needed
      console.warn('⚠️ Could not automatically extract column names from .gdb files.');
      console.warn('File geodatabases are proprietary format. Please use one of these methods:');
      console.warn('1. Enter column names manually in the next dialog');
      console.warn('2. Export to CSV/Shapefile from ArcGIS Pro first');
      console.warn('3. Include a metadata.json file with column definitions');
      
      // Return empty array - will trigger manual input or schema validation
      return [];
      
    } catch (error) {
      console.error('Error analyzing geodatabase columns:', error);
      return [];
    }
  };

  // Helper function to read file as ArrayBuffer
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

  // Helper function to read file as text
  const readFileAsText = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // Extract column information from XML metadata
  const extractColumnsFromXml = (xmlContent: string): string[] => {
    const columns: string[] = [];
    
    try {
      // Look for field definitions in XML
      const fieldMatches = xmlContent.match(/<Field[^>]*>[\s\S]*?<\/Field>/gi);
      if (fieldMatches) {
        for (const fieldMatch of fieldMatches) {
          const nameMatch = fieldMatch.match(/<Name[^>]*>(.*?)<\/Name>/i);
          if (nameMatch) {
            columns.push(nameMatch[1]);
          }
        }
      }
      
      // Alternative XML patterns
      const altMatches = xmlContent.match(/name\s*=\s*["']([^"']+)["']/gi);
      if (altMatches) {
        for (const match of altMatches) {
          const nameMatch = match.match(/name\s*=\s*["']([^"']+)["']/i);
          if (nameMatch) {
            columns.push(nameMatch[1]);
          }
        }
      }
      
    } catch (error) {
      console.log('Error parsing XML metadata:', error);
    }
    
    return columns;
  };

  // Analyze DBF files (shapefile attribute tables)
  const analyzeDbfColumns = async (file: File): Promise<string[]> => {
    try {
      // DBF files have a specific header structure
      const buffer = await readFileAsArrayBuffer(file, 512); // Read header
      const view = new DataView(buffer);
      
      // DBF header starts at byte 32 with field descriptors
      const columns: string[] = [];
      let offset = 32; // Start of field descriptors
      
      while (offset < buffer.byteLength - 32 && view.getUint8(offset) !== 0x0D) {
        // Field name is 11 bytes starting at offset
        const nameBytes = new Uint8Array(buffer, offset, 11);
        const decoder = new TextDecoder('ascii');
        const fieldName = decoder.decode(nameBytes).replace(/\0+$/, ''); // Remove null terminators
        
        if (fieldName.length > 0) {
          columns.push(fieldName);
        }
        
        offset += 32; // Each field descriptor is 32 bytes
      }
      
      return columns;
      
    } catch (error) {
      console.error('Error analyzing DBF columns:', error);
      return [];
    }
  };

  // Handle manual column input submission
  const handleManualColumnSubmit = () => {
    const columns = manualColumnInput
      .split(',')
      .map(col => col.trim())
      .filter(col => col.length > 0);
    
    // Set the source columns directly
    setSourceColumns(columns);
    setShowManualColumnInput(false);
    setManualColumnInput('');
  };

  // Handle manual column input cancellation
  const handleManualColumnCancel = () => {
    setShowManualColumnInput(false);
    setManualColumnInput('');
  };

  // Analyze CSV file to get column headers
  const analyzeCsvColumns = async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const firstLine = text.split('\n')[0];
          // Handle different CSV delimiters
          const delimiters = [',', '\t', ';', '|'];
          let columns: string[] = [];
          
          for (const delimiter of delimiters) {
            const testColumns = firstLine.split(delimiter);
            if (testColumns.length > columns.length) {
              columns = testColumns;
            }
          }
          
          // Clean column names
          const cleanColumns = columns.map(col => 
            col.trim().replace(/^["']|["']$/g, '') // Remove quotes
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

  // Fetch column schema for a specific table using Accept-Profile header
  const fetchTableSchema = async (schema: string, tableName: string): Promise<ColumnInfo[]> => {
    try {
      // Use Accept-Profile header to specify which schema to query
      const headers: Record<string, string> = {
        'Accept-Profile': schema
      };

      // Get the OpenAPI spec to extract column definitions for the specific schema
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
      
      // Convert properties to ColumnInfo format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const columns: ColumnInfo[] = Object.entries(properties).map(([columnName, columnDef]: [string, any], index) => {
        // Map PostgREST types to more readable types
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
    // Import JSZip dynamically to avoid SSR issues
    const JSZip = (await import('jszip')).default;
    
    const metadata = generateMetadata();
    const metadataJson = JSON.stringify(metadata, null, 2);
    
    // Create zip file
    const zip = new JSZip();
    
    // Add metadata file
    zip.file('metadata.json', metadataJson);
    
    // Add the original data files in a data folder, preserving directory structure
    formData.selectedFiles.forEach((file) => {
      zip.file(`data/${file.name}`, file);
    });
    
    // Generate the zip file
    return await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6
      }
    });
  };

  // Start schema validation process
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const startSchemaValidation = async () => {
    if (formData.selectedFiles.length === 0) {
      setUploadMessage('Please select files before validating schema.');
      return;
    }

    setIsProcessingFolders(true);
    try {
      // 1. Get schema from the selected domain
      const schemaToUse = getSchemaFromDomain(formData.domain);
      console.log(`🎯 Using schema "${schemaToUse}" for domain "${formData.domain}"`);
      
      // 2. Fetch available tables using the domain's schema
      const tables = await fetchAvailableTables(schemaToUse);
      setAvailableTables(tables);
      
      if (tables.length === 0) {
        setUploadMessage(`No accessible tables found in the ${schemaToUse} schema. Please check the schema configuration.`);
        return;
      }
      
      // 3. Analyze uploaded files for column names
      const columns = await analyzeFileColumns(formData.selectedFiles);
      
      // Check if we have a geodatabase
      const hasGDB = formData.selectedFiles.some(f => f.name.includes('.gdb/'));
      
      if (columns.length === 0 && hasGDB) {
        // Show manual input modal for GDB files if GDAL service couldn't extract columns
        setShowManualColumnInput(true);
        setUploadMessage('Could not automatically extract columns from geodatabase. Please enter them manually.');
        return;
      } else if (columns.length === 0) {
        setUploadMessage('Could not detect column names from uploaded files. Please upload CSV files or enter columns manually.');
        setShowManualColumnInput(true);
        return;
      }
      
      // If we successfully got columns from GDAL service
      if (hasGDB && columns.length > 0) {
        setUploadMessage(`✅ Successfully extracted ${columns.length} columns from geodatabase using GDAL`);
      }
      
      setSourceColumns(columns);
      
      // 4. Show schema mapping interface
      setShowSchemaMapping(true);
      
    } catch (error) {
      console.error('Schema validation error:', error);
      setUploadMessage('Error during schema validation. Please try again.');
    } finally {
      setIsProcessingFolders(false);
    }
  };

  // Handle target table selection
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleTableSelection = async (tableFullName: string) => {
    setSelectedTable(tableFullName);
    
    if (tableFullName) {
      const [schema, tableName] = tableFullName.split('.');
      const columns = await fetchTableSchema(schema, tableName);
      setTargetColumns(columns);
      
      // Initialize mapping - try to auto-match columns with same names
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
    }
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setUploadMessage('');

    if (!validateForm()) {
      setUploadMessage('Please correct the errors in the form.');
      return;
    }

    // If load type is not 'full', we need schema validation
    if (formData.loadType !== 'full') {
      await startSchemaValidation();
      return; // Schema validation will call this function again after mapping
    }

    setIsSubmitting(true);

    try {
      // Step 1: Create zip file with data and metadata
      setUploadMessage('Creating zip file...');
      const zipBlob = await createZipFile();
      
      console.log('Generated filename:', generatedFilename);
      console.log('Zip file created with size:', zipBlob.size);

      // Step 2: Upload to GCS
      setUploadMessage('Uploading to cloud storage...');
      await uploadZipToGCS(zipBlob, generatedFilename);

      // Step 3: Success!
      setUploadMessage(`✅ Upload successful! File "${generatedFilename}" has been uploaded to cloud storage.`);
      
      // Reset form after successful submission
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
      
      // Clear the file input element
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

  // Helper function to group files by directory for better display
  const groupFilesByDirectory = (files: File[]) => {
    const groups: { [key: string]: File[] } = {};
    
    files.forEach(file => {
      const pathParts = file.name.split('/');
      if (pathParts.length > 1) {
        const directory = pathParts[0];
        if (!groups[directory]) groups[directory] = [];
        groups[directory].push(file);
      } else {
        if (!groups['Files']) groups['Files'] = [];
        groups['Files'].push(file);
      }
    });
    
    return groups;
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

  const fileGroups = groupFilesByDirectory(formData.selectedFiles);

  // Main form (authenticated users only)
  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-lg">
      {/* Manual Column Input Modal */}
      {showManualColumnInput && (
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
                value={manualColumnInput}
                onChange={(e) => setManualColumnInput(e.target.value)}
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
                onClick={handleManualColumnCancel}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleManualColumnSubmit();
                  // After setting columns, show the schema mapping
                  if (manualColumnInput.trim()) {
                    setShowSchemaMapping(true);
                  }
                }}
                disabled={!manualColumnInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue with Mapping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schema Mapping Modal */}
      {showSchemaMapping && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Schema Validation & Column Mapping</h2>
            
            {/* Table Selection */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                Select Target Table:
              </label>
              <select
                value={selectedTable}
                onChange={(e) => handleTableSelection(e.target.value)}
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
                            onChange={(e) => setColumnMapping(prev => ({
                              ...prev,
                              [sourceCol]: e.target.value
                            }))}
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
                  {sourceColumns.filter(col => !columnMapping[col]).length > 0 ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-yellow-800 font-medium">
                        ⚠️ Unmapped columns ({sourceColumns.filter(col => !columnMapping[col]).length}):
                      </p>
                      <p className="text-yellow-700 text-sm mt-1">
                        {sourceColumns.filter(col => !columnMapping[col]).join(', ')}
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
                        Ready to proceed with upload.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSchemaMapping(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              {sourceColumns.filter(col => !columnMapping[col]).length === 0 && (
                <button
                  onClick={() => {
                    setShowSchemaMapping(false);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    handleSubmit(new Event('submit') as any);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Proceed with Upload
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
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
            Project Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Name */}
            <div>
              <label htmlFor="projectName" className="block text-gray-700 font-semibold mb-2">
                Project Name:
              </label>
              <input
                type="text"
                id="projectName"
                name="projectName"
                value={formData.projectName}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 ${
                  errors.projectName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter the project name"
              />
              {errors.projectName && <p className="text-red-500 text-sm mt-1">{errors.projectName}</p>}
            </div>

            {/* Dataset Name */}
            <div>
              <label htmlFor="datasetName" className="block text-gray-700 font-semibold mb-2">
                Dataset Name:
              </label>
              <input
                type="text"
                id="datasetName"
                name="datasetName"
                value={formData.datasetName}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 ${
                  errors.datasetName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter the dataset name"
              />
              {errors.datasetName && <p className="text-red-500 text-sm mt-1">{errors.datasetName}</p>}
            </div>

            {/* Author Name */}
            <div>
              <label htmlFor="authorName" className="block text-gray-700 font-semibold mb-2">
                Author Name:
              </label>
              <input
                type="text"
                id="authorName"
                name="authorName"
                value={formData.authorName}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 ${
                  errors.authorName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Author name (auto-filled from your account)"
              />
              {errors.authorName && <p className="text-red-500 text-sm mt-1">{errors.authorName}</p>}
            </div>

            {/* Publication Type */}
            <div>
              <label htmlFor="publicationType" className="block text-gray-700 font-semibold mb-2">
                Publication Type:
              </label>
              <select
                id="publicationType"
                name="publicationType"
                value={formData.publicationType}
                onChange={handleChange}
                className={`w-full px-3 py-2 pr-10 border rounded-md text-base bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 appearance-none bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")] bg-no-repeat bg-[right_0.75rem_center] bg-[length:1em_1em] ${
                  errors.publicationType ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {publicationTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.publicationType && <p className="text-red-500 text-sm mt-1">{errors.publicationType}</p>}
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <label htmlFor="description" className="block text-gray-700 font-semibold mb-2">
              Description (Optional):
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 resize-vertical"
              placeholder="Provide additional details about the dataset"
            />
          </div>
        </div>

        {/* File Naming Convention Section */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
            File Naming Convention
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Domain */}
            <div>
              <label htmlFor="domain" className="block text-gray-700 font-semibold mb-2">
                Domain: <span className="text-red-500">*</span>
              </label>
              <select
                id="domain"
                name="domain"
                value={formData.domain}
                onChange={handleChange}
                className={`w-full px-3 py-2 pr-10 border rounded-md text-base bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 appearance-none bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")] bg-no-repeat bg-[right_0.75rem_center] bg-[length:1em_1em] ${
                  errors.domain ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {domainOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.domain && <p className="text-red-500 text-sm mt-1">{errors.domain}</p>}
            </div>

            {/* Custom Domain (conditional) */}
            {formData.domain === 'custom' && (
              <div>
                <label htmlFor="customDomain" className="block text-gray-700 font-semibold mb-2">
                  Custom Domain: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="customDomain"
                  name="customDomain"
                  value={formData.customDomain}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 ${
                    errors.customDomain ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter custom domain name"
                />
                {errors.customDomain && <p className="text-red-500 text-sm mt-1">{errors.customDomain}</p>}
              </div>
            )}

            {/* Data Topic */}
            <div>
              <label htmlFor="dataTopic" className="block text-gray-700 font-semibold mb-2">
                Data Topic: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="dataTopic"
                name="dataTopic"
                value={formData.dataTopic}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 ${
                  errors.dataTopic ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., geolunits, alluvial_fan, wetland_inventory"
              />
              {errors.dataTopic && <p className="text-red-500 text-sm mt-1">{errors.dataTopic}</p>}
            </div>

            {/* Scale */}
            <div>
              <label htmlFor="scale" className="block text-gray-700 font-semibold mb-2">
                Scale:
              </label>
              <input
                type="text"
                id="scale"
                name="scale"
                value={formData.scale}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                placeholder="e.g., 30x60, 7.5"
              />
            </div>

            {/* Quad Name */}
            <div>
              <label htmlFor="quadName" className="block text-gray-700 font-semibold mb-2">
                Quad Name:
              </label>
              <input
                type="text"
                id="quadName"
                name="quadName"
                value={formData.quadName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                placeholder="USGS quad name"
              />
            </div>

            {/* Publication ID */}
            <div>
              <label htmlFor="pubId" className="block text-gray-700 font-semibold mb-2">
                Publication ID:
              </label>
              <input
                type="text"
                id="pubId"
                name="pubId"
                value={formData.pubId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                placeholder="e.g., OFR-123"
              />
            </div>

            {/* Load Type */}
            <div>
              <label htmlFor="loadType" className="block text-gray-700 font-semibold mb-2">
                Load Type: <span className="text-red-500">*</span>
              </label>
              <select
                id="loadType"
                name="loadType"
                value={formData.loadType}
                onChange={handleChange}
                className={`w-full px-3 py-2 pr-10 border rounded-md text-base bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 appearance-none bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")] bg-no-repeat bg-[right_0.75rem_center] bg-[length:1em_1em] ${
                  errors.loadType ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {loadTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.loadType && <p className="text-red-500 text-sm mt-1">{errors.loadType}</p>}
            </div>
          </div>
        </div>

        {/* File Upload Section */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
            Data Files
          </h3>
          
          <label htmlFor="file-input" className="block text-gray-700 font-semibold mb-2">
            Select Data Files or Folders: <span className="text-red-500">*</span>
          </label>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center text-gray-500 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[150px] ${
              isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : errors.selectedFiles 
                  ? 'border-red-500' 
                  : 'border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-input"
              multiple
              onChange={handleFileChange}
              className="hidden"
              accept="*/*"
            />
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {isProcessingFolders ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <p>Processing folders...</p>
              </div>
            ) : (
              <>
                <p className="mb-2">Drag & drop files or folders here (including .gdb), or</p>
                <button
                  type="button"
                  onClick={handleFileOrFolderSelect}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-base"
                >
                  Choose Files or Folder
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  ✅ Supports File Geodatabases (.gdb folders)<br/>
                  ✅ Shapefiles, CSVs, and other individual files<br/>
                  ✅ Multiple selection with Ctrl/Cmd<br/>
                  💡 Button will ask whether you want files or folders
                </p>
              </>
            )}
            
            {/* Selected Files Display */}
            {formData.selectedFiles.length > 0 && (
              <div className="mt-4 w-full">
                <div className="text-left">
                  <p className="font-bold text-green-800 mb-2">
                    Selected Files ({formData.selectedFiles.length}):
                  </p>
                  <div className="max-h-64 overflow-y-auto space-y-3">
                    {Object.entries(fileGroups).map(([groupName, files]) => (
                      <div key={groupName} className="border border-green-200 rounded-md">
                        <div className="bg-green-100 px-3 py-2 border-b border-green-200">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-green-800">
                              {groupName.endsWith('.gdb') ? `📁 ${groupName} (File Geodatabase)` : `📁 ${groupName}`}
                            </span>
                            <span className="text-sm text-green-600">
                              {files.length} file{files.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <div className="max-h-32 overflow-y-auto">
                          {files.map((file, fileIndex) => {
                            const globalIndex = formData.selectedFiles.indexOf(file);
                            return (
                              <div key={fileIndex} className="flex items-center justify-between p-2 border-b border-green-100 last:border-b-0 hover:bg-green-50">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-green-800 truncate">
                                    {file.name.includes('/') ? file.name.split('/').pop() : file.name}
                                  </p>
                                  <p className="text-xs text-green-600">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFile(globalIndex)}
                                  className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded"
                                  title="Remove file"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-2 border-t border-green-200">
                    <p className="text-sm text-green-600">
                      Total Size: {(formData.selectedFiles.reduce((total, file) => total + file.size, 0) / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          {errors.selectedFiles && <p className="text-red-500 text-sm mt-1">{errors.selectedFiles}</p>}
        </div>

        {/* Submission Button */}
        <div className="flex items-center justify-between mt-8">
          <button
            type="submit"
            disabled={isSubmitting || isProcessingFolders}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 text-base font-semibold"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {uploadMessage.includes('Creating') ? 'Creating Zip...' : 
                 uploadMessage.includes('Uploading') ? 'Uploading...' : 
                 'Processing...'}
              </div>
            ) : formData.loadType !== 'full' ? (
              'Validate Schema & Upload'
            ) : (
              'Create & Upload'
            )}
          </button>
          {uploadMessage && (
            <div className={`ml-4 p-3 rounded-md font-medium ${
              uploadMessage.includes('error') || uploadMessage.includes('failed') || uploadMessage.includes('❌')
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {uploadMessage}
            </div>
          )}
        </div>

        {/* Naming Convention Info */}
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

        {/* Enhanced Info Box */}
        <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
          <p className="text-xs text-blue-700">
            <strong>File Geodatabase Support:</strong> You can now drag and drop .gdb folders directly! 
            The application will automatically include all files within the geodatabase while preserving the directory structure.
          </p>
          {/* Development: Test table discovery */}
          {process.env.NODE_ENV === 'development' && (
            <button
              type="button"
              onClick={async () => {
                console.log('🔍 Testing table discovery...');
                const tables = await fetchAvailableTables();
                console.log('📋 Discovered tables:', tables);
              }}
              className="mt-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
            >
              Test Table Discovery (Dev Only)
            </button>
          )}
        </div>

        {/* Audit Trail Info */}
        <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
          <p className="text-xs text-gray-600">
            <strong>Audit Trail:</strong> All uploads are logged with user identification, timestamp, 
            and file details. A metadata.json file will be included in the zip with complete audit information.
          </p>
        </div>
      </form> 
    </div>
  );
};