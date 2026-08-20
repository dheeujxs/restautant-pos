// components/pos/TemplateSelector.tsx
import React, { useState, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { templateService } from '../../services/templateService';
import type { Template } from '../../types/template.types';

interface TemplateSelectorProps {
  onApplyTemplate: (template: Template) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onApplyTemplate }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await templateService.getTemplates(1, 50, { isActive: true });
      setTemplates(response.data.templates || []);
    } catch (error) {
      enqueueSnackbar('Failed to load templates', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Quick Templates</h3>
      <div className="grid grid-cols-2 gap-2">
        {templates.map((template) => (
          <button
            key={template._id}
            onClick={() => onApplyTemplate(template)}
            className="p-3 border rounded-lg hover:bg-orange-50 hover:border-orange-300 transition text-left"
          >
            <div className="font-medium text-sm">{template.displayName}</div>
            <div className="text-xs text-gray-500">{template.sectionCount} sections</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TemplateSelector;