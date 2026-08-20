// components/BulkTemplateActions.tsx
import React, { useState } from 'react';
import { templateService } from '../services/templateService';

interface BulkTemplateActionsProps {
  selectedTemplates: string[];
  onComplete: () => void;
}

const BulkTemplateActions: React.FC<BulkTemplateActionsProps> = ({ 
  selectedTemplates, 
  onComplete 
}) => {
  const [processing, setProcessing] = useState(false);

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (!window.confirm(`Are you sure you want to ${action} ${selectedTemplates.length} templates?`)) {
      return;
    }

    setProcessing(true);
    try {
      // Implement bulk operations
      await Promise.all(
        selectedTemplates.map(id => {
          if (action === 'delete') {
            return templateService.deleteTemplate(id);
          }
          // Add other actions
          return Promise.resolve();
        })
      );
      onComplete();
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleBulkAction('activate')}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        disabled={processing}
      >
        Activate
      </button>
      <button
        onClick={() => handleBulkAction('deactivate')}
        className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        disabled={processing}
      >
        Deactivate
      </button>
      <button
        onClick={() => handleBulkAction('delete')}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        disabled={processing}
      >
        Delete
      </button>
    </div>
  );
};