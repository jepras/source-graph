import React, { useState } from 'react';
import type { StructuredOutput } from '../services/api';

interface YearValidationProps {
  structuredData: StructuredOutput;
  onResolve: (updatedData: StructuredOutput) => void;
  onCancel: () => void;
}

interface MissingYearItem {
  type: 'main_item' | 'influence';
  name: string;
  currentYear?: number;
  index?: number; // For influences
}

export const YearValidation: React.FC<YearValidationProps> = ({
  structuredData,
  onResolve,
  onCancel
}) => {
  // Find items missing years
  const missingYears: MissingYearItem[] = [];
  
  // Check main item
  if (!structuredData.main_item_year) {
    missingYears.push({
      type: 'main_item',
      name: structuredData.main_item,
      currentYear: structuredData.main_item_year
    });
  }
  
  // Check influences
  structuredData.influences.forEach((influence, index) => {
    if (!influence.year) {
      missingYears.push({
        type: 'influence',
        name: influence.name,
        currentYear: influence.year,
        index
      });
    }
  });

  // State for year inputs
  const [yearInputs, setYearInputs] = useState<Record<string, string>>(
    Object.fromEntries(
      missingYears.map((item, idx) => [
        `${item.type}_${idx}`,
        item.currentYear?.toString() || ''
      ])
    )
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleYearChange = (key: string, value: string) => {
    setYearInputs(prev => ({ ...prev, [key]: value }));
    
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const validateYear = (yearStr: string): number | null => {
    const year = parseInt(yearStr);
    if (isNaN(year) || year < 1 || year > new Date().getFullYear() + 10) {
      return null;
    }
    return year;
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    
    // Validate all year inputs
    missingYears.forEach((item, idx) => {
      const key = `${item.type}_${idx}`;
      const yearStr = yearInputs[key]?.trim();
      
      if (!yearStr) {
        newErrors[key] = 'Year is required';
      } else {
        const year = validateYear(yearStr);
        if (!year) {
          newErrors[key] = 'Please enter a valid year (1-' + (new Date().getFullYear() + 10) + ')';
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Create updated structured data with years
    const updatedData = { ...structuredData };
    
    missingYears.forEach((item, idx) => {
      const key = `${item.type}_${idx}`;
      const year = validateYear(yearInputs[key]);
      
      if (year) {
        if (item.type === 'main_item') {
          updatedData.main_item_year = year;
        } else if (item.type === 'influence' && item.index !== undefined) {
          updatedData.influences[item.index].year = year;
        }
      }
    });

    onResolve(updatedData);
  };

  if (missingYears.length === 0) {
    // No missing years - proceed directly
    onResolve(structuredData);
    return null;
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-orange-800 mb-2">
          📅 Years Required
        </h4>
        <p className="text-sm text-orange-700">
          Found {missingYears.length} item(s) without years. Please add years for all items before saving:
        </p>
      </div>
      
      {/* Missing Years List */}
      <div className="space-y-3">
        {missingYears.map((item, idx) => {
          const key = `${item.type}_${idx}`;
          const hasError = errors[key];
          
          return (
            <div key={key} className="bg-white border border-gray-200 rounded p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">
                    {item.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.type === 'main_item' ? '🎯 Main Item' : '🔗 Influence'}
                    {item.type === 'influence' && structuredData.influences[item.index!] && (
                      <span> • {structuredData.influences[item.index!].category}</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <label className="text-xs font-medium text-gray-700">Year:</label>
                <input
                  type="number"
                  value={yearInputs[key] || ''}
                  onChange={(e) => handleYearChange(key, e.target.value)}
                  placeholder="e.g., 1999"
                  min="1"
                  max={new Date().getFullYear() + 10}
                  className={`w-20 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {hasError && (
                  <span className="text-xs text-red-600">{hasError}</span>
                )}
              </div>
              
              {/* Show influence details for context */}
              {item.type === 'influence' && item.index !== undefined && (
                <div className="mt-2 text-xs text-gray-600">
                  <div><strong>Type:</strong> {structuredData.influences[item.index].influence_type}</div>
                  {structuredData.influences[item.index].explanation && (
                    <div className="mt-1"><strong>How it influenced:</strong> {structuredData.influences[item.index].explanation}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          onClick={handleSave}
          className="px-3 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          ✅ Save with Years
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
        >
          ❌ Cancel
        </button>
      </div>
      
      {/* Helper text */}
      <div className="text-xs text-gray-500 mt-2">
        💡 <strong>Tips:</strong> Use the year when the item was created, released, or first became influential. 
        For approximate dates, use the start year (e.g., "1990s" → 1990).
      </div>
    </div>
  );
};