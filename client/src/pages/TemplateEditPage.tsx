// pages/TemplateEditPage.tsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import TemplateForm from '../components/TemplateForm';
import type { Template, TemplateFormData } from '../types/template.types';
import { templateService } from '../services/templateService';

const TemplateEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [template, setTemplate] = React.useState<Template | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (id) {
      loadTemplate(id);
    }
  }, [id]);

  const loadTemplate = async (templateId: string) => {
    try {
      setLoading(true);
      const response = await templateService.getTemplate(templateId);
      setTemplate(response.data);
    } catch (error) {
      enqueueSnackbar('Failed to load template', { variant: 'error' });
      navigate('/templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: TemplateFormData) => {
    if (!id) return;
    try {
      await templateService.updateTemplate(id, data);
      enqueueSnackbar('Template updated successfully', { variant: 'success' });
      navigate('/templates');
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Failed to update template', { 
        variant: 'error' 
      });
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div>
      <h1>Edit Template</h1>
      <TemplateForm
        mode="edit"
        template={template}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/templates')}
      />
    </div>
  );
};

export default TemplateEditPage;