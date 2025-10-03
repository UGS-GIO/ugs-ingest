import React from 'react';
import type { FormData, FormErrors, HandleChangeType } from '../types/uploadTypes';

interface CorrectionFieldsProps {
  formData: FormData;
  errors: FormErrors;
  handleChange: HandleChangeType;
  onCorrectionToggle: (checked: boolean) => void;
}

export const CorrectionFields: React.FC<CorrectionFieldsProps> = ({
  formData,
  errors,
  handleChange,
  onCorrectionToggle,
}) => {
  // Only show if loadType is "update"
  if (formData.loadType !== 'update') {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
      <h4 className="text-sm font-semibold text-gray-800 mb-3">Update Type</h4>
      
      {/* Correction Checkbox */}
      <div className="flex items-start space-x-3 mb-4">
        <input
          type="checkbox"
          id="isCorrection"
          name="isCorrection"
          checked={formData.isCorrection}
          onChange={(e) => {
            handleChange(e);
            onCorrectionToggle(e.target.checked);
          }}
          className="mt-1 h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
        />
        <div className="flex-1">
          <label htmlFor="isCorrection" className="text-sm font-medium text-gray-700 cursor-pointer">
            This is a data correction
          </label>
          <p className="text-xs text-gray-600 mt-1">
            Check this box if you are correcting errors in previously uploaded data
          </p>
        </div>
      </div>

      {/* Correction Reason Field - Only show if correction is checked */}
      {formData.isCorrection && (
        <div className="mt-4">
          <label htmlFor="correctionReason" className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Correction: <span className="text-red-500">*</span>
          </label>
          <textarea
            id="correctionReason"
            name="correctionReason"
            value={formData.correctionReason}
            onChange={handleChange}
            rows={3}
            className={`w-full px-3 py-2 border rounded-md text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500 ${
              errors.correctionReason ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Please describe what is being corrected and why (e.g., 'Fixing geometry errors in polygons', 'Updating attribute values based on field verification', etc.)"
          />
          {errors.correctionReason && (
            <p className="text-red-500 text-sm mt-1">{errors.correctionReason}</p>
          )}
        </div>
      )}

      {/* Info text */}
      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-xs text-blue-700">
          <strong>Audit Trail:</strong> Correction information will be included in the upload metadata 
          for compliance and tracking purposes. All updates are logged with user identification and timestamps.
        </p>
      </div>
    </div>
  );
};