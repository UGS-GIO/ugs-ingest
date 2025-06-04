import React, { useState } from 'react';
import type { ChangeEvent, FormEvent, DragEvent } from 'react'; // Added DragEvent type

// Define the shape of our form data
interface FormData {
  projectName: string;
  datasetName: string;
  authorName: string; // Renamed from scientistName
  publicationType: string; // New field
  description: string;
  selectedFile: File | null;
}

// Define the shape of our errors (all properties are optional strings)
interface FormErrors {
  projectName?: string;
  datasetName?: string;
  authorName?: string; // Renamed from scientistName
  publicationType?: string; // New field
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
    authorName: '', // Initialize new name
    publicationType: '', // Initialize new field
    description: '',
    selectedFile: null,
  });

  // State for validation errors
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false); // New state for drag-and-drop UI

  // Handle changes for text and select inputs
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { // Added HTMLSelectElement
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
    // Also reset the file input field if a new file is set via drag-drop
    // This is a bit tricky with controlled components; often best to let React manage if possible.
    // For direct file input, clearing it after selection might be desirable if you want to allow re-selection.
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
    e.preventDefault(); // Prevent default to allow drop
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
      e.dataTransfer.clearData(); // Clear data after successful drop
    }
  };


  // Basic form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.projectName.trim()) newErrors.projectName = 'Project name is required.';
    if (!formData.datasetName.trim()) newErrors.datasetName = 'Dataset name is required.';
    if (!formData.authorName.trim()) newErrors.authorName = 'Author name is required.'; // Updated field
    if (!formData.publicationType) newErrors.publicationType = 'Publication type is required.'; // New field validation
    if (!formData.selectedFile) newErrors.selectedFile = 'Please select or drop a file to upload.'; // Updated message

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
    <form onSubmit={handleSubmit} className="upload-form-container">
      <h2 style={{ fontSize: '2em', fontWeight: 'bold', color: '#007bff', marginBottom: '1.5rem' }}>Upload Dataset</h2>

      {/* Project Name */}
      <div className="form-group">
        <label htmlFor="projectName" className="form-label">
          Project Name:
        </label>
        <input
          type="text"
          id="projectName"
          name="projectName"
          value={formData.projectName}
          onChange={handleChange}
          style={{ borderColor: errors.projectName ? '#dc3545' : '' }}
          placeholder=""
        />
        {errors.projectName && <p className="error-message">{errors.projectName}</p>}
      </div>

      {/* Dataset Name */}
      <div className="form-group">
        <label htmlFor="datasetName" className="form-label">
          Dataset Name:
        </label>
        <input
          type="text"
          id="datasetName"
          name="datasetName"
          value={formData.datasetName}
          onChange={handleChange}
          style={{ borderColor: errors.datasetName ? '#dc3545' : '' }}
          placeholder=""
        />
        {errors.datasetName && <p className="error-message">{errors.datasetName}</p>}
      </div>

      {/* Author Name (formerly Scientist Name) */}
      <div className="form-group">
        <label htmlFor="authorName" className="form-label">
          Author Name:
        </label>
        <input
          type="text"
          id="authorName"
          name="authorName" // Updated name
          value={formData.authorName}
          onChange={handleChange}
          style={{ borderColor: errors.authorName ? '#dc3545' : '' }}
          placeholder=""
        />
        {errors.authorName && <p className="error-message">{errors.authorName}</p>}
      </div>

      {/* Publication Type (New Field) */}
      <div className="form-group">
        <label htmlFor="publicationType" className="form-label">
          Publication Type:
        </label>
        <select
          id="publicationType"
          name="publicationType"
          value={formData.publicationType}
          onChange={handleChange}
          className="form-select" // New class for select styling
          style={{ borderColor: errors.publicationType ? '#dc3545' : '' }}
        >
          {publicationTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.publicationType && <p className="error-message">{errors.publicationType}</p>}
      </div>

      {/* Description */}
      <div className="form-group">
        <label htmlFor="description" className="form-label">
          Description (Optional):
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          placeholder=""
        ></textarea>
      </div>

      {/* File Upload (with Drag & Drop) */}
      <div className="form-group">
        <label htmlFor="file-input" className="form-label">
          Select Data File:
        </label>
        <div
          className={`file-drop-area ${isDragging ? 'dragging' : ''} ${
            errors.selectedFile ? 'has-error' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-input"
            onChange={handleFileChange}
            style={{ display: 'none' }} // Hide the default file input visually
          />
          <p>Drag & drop your file here, or</p>
          <button
            type="button" // Important: type="button" to prevent form submission
            onClick={() => document.getElementById('file-input')?.click()}
            className="choose-file-button" // New class for button styling
          >
            Choose File
          </button>
          {formData.selectedFile && (
            <p className="selected-file-info">Selected: {formData.selectedFile.name}</p>
          )}
        </div>
        {errors.selectedFile && <p className="error-message">{errors.selectedFile}</p>}
      </div>

      {/* Submission Button */}
      <div className="form-submit-row">
        <button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Uploading...' : 'Upload Data'}
        </button>
        {uploadMessage && (
          <p className={`upload-message ${uploadMessage.includes('error') ? 'error' : 'success'}`}>
            {uploadMessage}
          </p>
        )}
      </div>
    </form>
  );
};