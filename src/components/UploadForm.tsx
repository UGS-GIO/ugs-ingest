import React, { useState } from 'react';
import type { ChangeEvent, FormEvent, DragEvent } from 'react';

// Define the shape of our form data
interface FormData {
  projectName: string;
  datasetName: string;
  authorName: string;
  publicationType: string;
  description: string;
  selectedFile: File | null;
}

// Define the shape of our errors (all properties are optional strings)
interface FormErrors {
  projectName?: string;
  datasetName?: string;
  authorName?: string;
  publicationType?: string;
  description?: string;
  selectedFile?: string;
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

export const UploadForm: React.FC = () => {
  // State to hold all form data
  const [formData, setFormData] = useState<FormData>({
    projectName: '',
    datasetName: '',
    authorName: '',
    publicationType: '',
    description: '',
    selectedFile: null,
  });

  // State for validation errors
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

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

  // Handle file selection (from input or drag-and-drop)
  const handleFile = (file: File | null) => {
    setFormData((prevData) => ({
      ...prevData,
      selectedFile: file,
    }));
    // Clear file error
    if (errors.selectedFile) {
      setErrors((prevErrors) => ({ ...prevErrors, selectedFile: undefined }));
    }
  };

  // Handler for direct file input change
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    } else {
      handleFile(null);
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
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  // Basic form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.projectName.trim()) newErrors.projectName = 'Project name is required.';
    if (!formData.datasetName.trim()) newErrors.datasetName = 'Dataset name is required.';
    if (!formData.authorName.trim()) newErrors.authorName = 'Author name is required.';
    if (!formData.publicationType) newErrors.publicationType = 'Publication type is required.';
    if (!formData.selectedFile) newErrors.selectedFile = 'Please select or drop a file to upload.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      console.log('Form Data to be submitted:', formData);
      if (formData.selectedFile) {
        console.log('File to upload:', formData.selectedFile.name, formData.selectedFile.type);
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      setUploadMessage('Data prepared and ready for backend processing!');
      // Reset form after successful submission
      setFormData({
        projectName: '',
        datasetName: '',
        authorName: '',
        publicationType: '',
        description: '',
        selectedFile: null,
      });
      setErrors({});
      // Clear the file input element manually after form reset for UI consistency
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

    } catch (error) {
      console.error('Upload failed:', error);
      setUploadMessage('An error occurred during upload. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-lg">
      <form onSubmit={handleSubmit}>
        <h2 className="text-3xl font-bold text-blue-600 mb-6 text-center">Upload Dataset</h2>

        {/* Project Name */}
        <div className="mb-6">
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
            placeholder=""
          />
          {errors.projectName && <p className="text-red-500 text-sm mt-1">{errors.projectName}</p>}
        </div>

        {/* Dataset Name */}
        <div className="mb-6">
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
            placeholder=""
          />
          {errors.datasetName && <p className="text-red-500 text-sm mt-1">{errors.datasetName}</p>}
        </div>

        {/* Author Name */}
        <div className="mb-6">
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
            placeholder=""
          />
          {errors.authorName && <p className="text-red-500 text-sm mt-1">{errors.authorName}</p>}
        </div>

        {/* Publication Type */}
        <div className="mb-6">
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

        {/* Description */}
        <div className="mb-6">
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
            placeholder=""
          />
        </div>

        {/* File Upload with Drag & Drop */}
        <div className="mb-6">
          <label htmlFor="file-input" className="block text-gray-700 font-semibold mb-2">
            Select Data File:
          </label>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center text-gray-500 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[150px] ${
              isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : errors.selectedFile 
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
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="mb-2">Drag & drop your file here, or</p>
            <button
              type="button"
              onClick={() => document.getElementById('file-input')?.click()}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200 text-base"
            >
              Choose File
            </button>
            {formData.selectedFile && (
              <p className="mt-4 font-bold text-gray-800">Selected: {formData.selectedFile.name}</p>
            )}
          </div>
          {errors.selectedFile && <p className="text-red-500 text-sm mt-1">{errors.selectedFile}</p>}
        </div>

        {/* Submission Button */}
        <div className="flex items-center justify-between mt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 text-base"
          >
            {isSubmitting ? 'Uploading...' : 'Upload Data'}
          </button>
          {uploadMessage && (
            <p className={`ml-4 font-medium ${
              uploadMessage.includes('error') ? 'text-red-500' : 'text-green-600'
            }`}>
              {uploadMessage}
            </p>
          )}
        </div>
      </form>
    </div>
  );
};