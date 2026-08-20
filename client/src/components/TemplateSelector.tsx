// components/pos/TemplateSelector.tsx
import React, { useState, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { 
  LayoutTemplate, 
  Layers, 
  Clock, 
  CheckCircle, 
  X, 
  Search, 
  ChevronDown,
  Star,
  TrendingUp,
  Calendar,
  Zap
} from 'lucide-react';
import { templateService } from '../services/templateService';
import type { Template } from '../types/template.types';

interface TemplateSelectorProps {
  onApplyTemplate: (template: Template) => void;
  onClose: () => void;
  isOpen: boolean;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ 
  onApplyTemplate, 
  onClose, 
  isOpen 
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [filterType, setFilterType] = useState('all');
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

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

  const filteredTemplates = templates.filter(template => {
    const matchSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'all' || template.templateType === filterType;
    return matchSearch && matchType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'daily': return <Calendar size={14} />;
      case 'weekly': return <Calendar size={14} />;
      case 'special': return <Star size={14} />;
      case 'seasonal': return <TrendingUp size={14} />;
      default: return <Layers size={14} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'daily': return 'text-blue-500 bg-blue-50 border-blue-200';
      case 'weekly': return 'text-purple-500 bg-purple-50 border-purple-200';
      case 'special': return 'text-amber-500 bg-amber-50 border-amber-200';
      case 'seasonal': return 'text-green-500 bg-green-50 border-green-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const handleApply = (template: Template) => {
    onApplyTemplate(template);
    enqueueSnackbar(`Template "${template.name}" applied!`, { variant: 'success' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b bg-gradient-to-r from-purple-50 to-orange-50">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <LayoutTemplate size={20} className="text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Quick Templates</h3>
                <p className="text-sm text-gray-500">Apply a pre-configured menu template to your order</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
            >
              <option value="all">All Types</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="special">Special</option>
              <option value="seasonal">Seasonal</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        {/* Template Grid */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <LayoutTemplate size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No templates found</p>
              <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTemplates.map((template) => (
                <div
                  key={template._id}
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedTemplate?._id === template._id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(template.templateType)}`}>
                          {getTypeIcon(template.templateType)}
                          {template.templateType.charAt(0).toUpperCase() + template.templateType.slice(1)}
                        </span>
                        {template.isDefault && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <CheckCircle size={10} /> Default
                          </span>
                        )}
                        {template.usageCount > 0 && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <TrendingUp size={10} /> {template.usageCount} uses
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-800">{template.name}</h4>
                      {template.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{template.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-0.5">
                          <Layers size={12} /> {template.sectionCount} sections
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Clock size={12} /> {template.totalDishes} dishes
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApply(template);
                      }}
                      className="shrink-0 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-xs font-bold hover:shadow-md transition-all flex items-center gap-1.5"
                    >
                      <Zap size={14} /> Apply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <p className="text-xs text-gray-400">
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelector;