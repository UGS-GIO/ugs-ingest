// components/NamingConventionForm.tsx
import React from 'react';
import type { FormData, FormErrors, HandleChangeType } from '../types/uploadTypes';
import { domainOptions, loadTypeOptions } from '../types/uploadTypes';

interface NamingConventionFormProps {
  formData: FormData;
  errors: FormErrors;
  handleChange: HandleChangeType;
}

export const NamingConventionForm: React.FC<NamingConventionFormProps> = ({
  formData,
  errors,
  handleChange,
}) => {
  return (
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
  );
};