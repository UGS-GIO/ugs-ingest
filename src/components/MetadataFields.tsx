// components/MetadataFields.tsx
import React from 'react';
import type { FormData, FormErrors, HandleChangeType } from '../types/uploadTypes';
import { tableTypeOptions, reviewStatusOptions } from '../types/uploadTypes';

interface MetadataFieldsProps {
  formData: FormData;
  errors: FormErrors;
  handleChange: HandleChangeType;
  unifiedViewName: string; // Pass the auto-generated name from parent
}

export const MetadataFields: React.FC<MetadataFieldsProps> = ({
  formData,
  errors,
  handleChange,
  unifiedViewName,
}) => {
  // Get today's date in YYYY-MM-DD format for max date validation
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="mb-8">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
        Data Metadata
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Publication Date - Always show */}
        <div>
          <label htmlFor="publicationDate" className="block text-gray-700 font-semibold mb-2">
            Publication Date: <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="publicationDate"
            name="publicationDate"
            value={formData.publicationDate}
            onChange={handleChange}
            max={today}
            className={`w-full px-3 py-2 border rounded-md text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 ${
              errors.publicationDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.publicationDate && <p className="text-red-500 text-sm mt-1">{errors.publicationDate}</p>}
          <p className="text-xs text-gray-500 mt-1">
            When was this data originally published? (Cannot be in the future)
          </p>
        </div>

        {/* Table Type - Only for new_table */}
        {formData.loadType === 'new_table' && (
          <div>
            <label htmlFor="tableType" className="block text-gray-700 font-semibold mb-2">
              Table Type: <span className="text-red-500">*</span>
            </label>
            <select
              id="tableType"
              name="tableType"
              value={formData.tableType}
              onChange={handleChange}
              className={`w-full px-3 py-2 pr-10 border rounded-md text-base bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 appearance-none bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")] bg-no-repeat bg-[right_0.75rem_center] bg-[length:1em_1em] ${
                errors.tableType ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              {tableTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.tableType && <p className="text-red-500 text-sm mt-1">{errors.tableType}</p>}
            <p className="text-xs text-gray-500 mt-1">
              Fact tables store measurements/metrics. Dimension tables store descriptive attributes.
            </p>
          </div>
        )}

        {/* Unique Key - Only for new_table */}
        {formData.loadType === 'new_table' && (
          <div>
            <label htmlFor="uniqueKey" className="block text-gray-700 font-semibold mb-2">
              Unique Key Column: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="uniqueKey"
              name="uniqueKey"
              value={formData.uniqueKey}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 ${
                errors.uniqueKey ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., faultnum, oid, id"
            />
            {errors.uniqueKey && <p className="text-red-500 text-sm mt-1">{errors.uniqueKey}</p>}
            <p className="text-xs text-gray-500 mt-1">
              The column name that uniquely identifies each record
            </p>
          </div>
        )}

        {/* Review Status - Always show */}
        <div>
          <label htmlFor="reviewStatus" className="block text-gray-700 font-semibold mb-2">
            Review Status: <span className="text-red-500">*</span>
          </label>
          <select
            id="reviewStatus"
            name="reviewStatus"
            value={formData.reviewStatus}
            onChange={handleChange}
            className={`w-full px-3 py-2 pr-10 border rounded-md text-base bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 appearance-none bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")] bg-no-repeat bg-[right_0.75rem_center] bg-[length:1em_1em] ${
              errors.reviewStatus ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            {reviewStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.reviewStatus && <p className="text-red-500 text-sm mt-1">{errors.reviewStatus}</p>}
        </div>

        {/* Unified View Name - Only for new_table, read-only display */}
        {formData.loadType === 'new_table' && unifiedViewName && (
          <div className="md:col-span-2">
            <label className="block text-gray-700 font-semibold mb-2">
              Unified View Name:
            </label>
            <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-base font-mono text-gray-700">
              {unifiedViewName}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Auto-generated based on domain and data topic
            </p>
          </div>
        )}
      </div>
    </div>
  );
};