// components/ProjectInfoForm.tsx
import React from 'react';
import type { FormData, FormErrors, HandleChangeType } from '../types/uploadTypes';
import { publicationTypeOptions } from '../types/uploadTypes';

interface ProjectInfoFormProps {
  formData: FormData;
  errors: FormErrors;
  handleChange: HandleChangeType;
}

export const ProjectInfoForm: React.FC<ProjectInfoFormProps> = ({
  formData,
  errors,
  handleChange,
}) => {
  return (
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
  );
};