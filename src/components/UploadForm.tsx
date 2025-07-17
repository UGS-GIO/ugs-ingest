import React, { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent, DragEvent } from 'react';
import { useIAPUser } from '../hooks/useIAPUsers';

// Define the shape of our form data
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

// Domain options
const domainOptions = [
  { value: '', label: 'Select Domain' },
  { value: 'hazards', label: 'Hazards' },
  { value: 'groundwater', label: 'Groundwater' },
  { value: 'wetlands', label: 'Wetlands' },
  { value: 'geologic_maps', label: 'Geologic Maps' },
  { value: 'energy_minerals', label: 'Energy & Minerals' },
  { value: 'ccus', label: 'CCUS' },
  { value: 'custom', label: 'Other (specify)' },
];

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

  // State for validation errors
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [generatedFilename, setGeneratedFilename] = useState<string>('');

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

  // Drag and Drop Handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      addFiles(newFiles);
      e.dataTransfer.clearData();
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

  // Create zip file with data and metadata
  const createZipFile = async (): Promise<Blob> => {
    // Import JSZip dynamically to avoid SSR issues
    const JSZip = (await import('jszip')).default;
    
    const metadata = generateMetadata();
    const metadataJson = JSON.stringify(metadata, null, 2);
    
    // Create zip file
    const zip = new JSZip();
    
    // Add metadata file
    zip.file('metadata.json', metadataJson);
    
    // Add the original data files in a data folder
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

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setUploadMessage('');

    if (!validateForm()) {
      setUploadMessage('Please correct the errors in the form.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create zip file with data and metadata
      const zipBlob = await createZipFile();
      
      console.log('Generated filename:', generatedFilename);
      console.log('Zip file created with size:', zipBlob.size);
      console.log('Metadata:', generateMetadata());

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setUploadMessage(`Zip file "${generatedFilename}" created successfully and ready for upload!`);
      
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
      
      // Clear the file input element
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

    } catch (error) {
      console.error('Processing failed:', error);
      setUploadMessage('An error occurred during processing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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

  // Main form (authenticated users only)
  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-lg">
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
            Data File
          </h3>
          
          <label htmlFor="file-input" className="block text-gray-700 font-semibold mb-2">
            Select Data Files: <span className="text-red-500">*</span>
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
            <p className="mb-2">Drag & drop multiple files here, or</p>
            <button
              type="button"
              onClick={() => document.getElementById('file-input')?.click()}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200 text-base"
            >
              Choose Multiple Files
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Hold Ctrl (Windows) or Cmd (Mac) to select multiple files
            </p>
            
            {/* Selected Files Display */}
            {formData.selectedFiles.length > 0 && (
              <div className="mt-4 w-full">
                <div className="text-left">
                  <p className="font-bold text-green-800 mb-2">
                    Selected Files ({formData.selectedFiles.length}):
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {formData.selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-green-800 truncate">{file.name}</p>
                          <p className="text-xs text-green-600">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded"
                          title="Remove file"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-green-200">
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
            disabled={isSubmitting}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 text-base font-semibold"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Zip...
              </div>
            ) : (
              'Create Zip & Prepare Upload'
            )}
          </button>
          {uploadMessage && (
            <div className={`ml-4 p-3 rounded-md font-medium ${
              uploadMessage.includes('error') 
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