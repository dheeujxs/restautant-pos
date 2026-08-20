// pages/TemplateCreatePage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { ArrowLeft } from 'lucide-react';
import TemplateForm from '../components/TemplateForm';
import type { TemplateFormData } from '../types/template.types';
import { templateService } from '../services/templateService';

const TemplateCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const handleSubmit = async (data: TemplateFormData): Promise<void> => {
    console.log('📝 Creating template with data:', JSON.stringify(data, null, 2));
    
    try {
      const response = await templateService.createTemplate(data);
      console.log('📝 Response:', response);
      
      if (response.success) {
        enqueueSnackbar('Template created successfully!', { variant: 'success' });
        navigate('/templates');
      } else {
        enqueueSnackbar(response.message || 'Failed to create template', { variant: 'error' });
      }
    } catch (error: any) {
      console.error('❌ Error creating template:', error);
      console.error('❌ Error response:', error.response);
      
      let errorMessage = 'Failed to create template';
      
      // Check for specific error messages
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Handle validation errors
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors.join(', ');
        errorMessage = `Validation failed: ${validationErrors}`;
      }
      
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  const handleCancel = (): void => {
    navigate('/templates');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header with Back Button */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        <button
          onClick={() => navigate('/templates')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            cursor: 'pointer',
            color: '#374151',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <ArrowLeft size={18} />
          Back to Templates
        </button>
      </div>

      {/* Page Title */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 700, 
          color: '#1c1917',
          marginBottom: '8px'
        }}>
          Create New Template
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: '#78716c',
          marginBottom: '4px'
        }}>
          Design a new menu template for your restaurant
        </p>
        <p style={{ 
          fontSize: '14px', 
          color: '#a8a29e'
        }}>
          Fill in the details below to create a customizable menu template
        </p>
      </div>

      {/* Form Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '32px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
      }}>
        <TemplateForm
          mode="create"
          template={null}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>

      {/* Footer Help Text */}
      <div style={{ 
        marginTop: '24px', 
        padding: '16px',
        background: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
      }}>
        <p style={{ 
          fontSize: '14px', 
          color: '#6b7280',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}>💡</span>
          <span>
            <strong>Tip:</strong> You can always add sections and dishes to your template after creation.
            Daily templates require a day of week selection.
          </span>
        </p>
      </div>
    </div>
  );
};

export default TemplateCreatePage;