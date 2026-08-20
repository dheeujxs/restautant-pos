// components/TemplateForm.tsx
import React, { useState, useEffect } from 'react';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  Button,
  Box,
  Chip,
  Typography,
  IconButton,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import type { 
  Template, 
  TemplateFormData, 
  TemplateType,
  DisplayLayout,
  DayOfWeek,
  TemplateSectionFormData,
} from '../types/template.types';

interface TemplateFormProps {
  mode: 'create' | 'edit' | 'duplicate';
  template: Template | null;
  onSubmit: (data: TemplateFormData) => void | Promise<void>;
  onCancel: () => void;
}

const validationSchema = yup.object({
  name: yup.string()
    .required('Template name is required')
    .min(1, 'Name must be at least 1 character')
    .max(100, 'Name cannot exceed 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_.,&()'"]+$/, 'Name contains invalid characters'),
  description: yup.string()
    .max(500, 'Description cannot exceed 500 characters'),
  templateType: yup.string()
    .required('Template type is required')
    .oneOf(['daily', 'weekly', 'special', 'seasonal', 'custom'], 'Invalid template type'),
  dayOfWeek: yup.string()
    .nullable()
    .when('templateType', {
      is: 'daily',
      then: () => yup.string().required('Day of week is required for daily templates'),
    }),
  displayLayout: yup.string()
    .oneOf(['grid', 'list', 'card', 'carousel'], 'Invalid display layout'),
  itemsPerRow: yup.number()
    .min(1, 'Minimum 1 item per row')
    .max(6, 'Maximum 6 items per row')
    .integer('Must be a whole number'),
  isActive: yup.boolean(),
  isDefault: yup.boolean(),
});

const TemplateForm: React.FC<TemplateFormProps> = ({ mode, template, onSubmit, onCancel }) => {
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState<string>('');

  const formik = useFormik<TemplateFormData>({
    initialValues: {
      name: template?.name || '',
      description: template?.description || '',
      templateType: (template?.templateType as TemplateType) || 'custom',
      dayOfWeek: (template?.dayOfWeek as DayOfWeek) || undefined,
      displayLayout: (template?.displayLayout as DisplayLayout) || 'grid',
      itemsPerRow: template?.itemsPerRow || 3,
      isActive: template?.isActive !== false,
      isDefault: template?.isDefault || false,
      tags: template?.tags || [],
      sections: template?.sections?.map((section): TemplateSectionFormData => ({
        _id: section._id,
        name: section.name,
        description: section.description || '',
        dishIds: section.dishIds || [],
        isVisible: section.isVisible !== false,
      })) || [],
    },
    validationSchema,
    onSubmit: (values) => {
      // Prepare the data for submission
      const submitData: TemplateFormData = {
        ...values,
        tags: tags || [],
        sections: values.sections || [],
      };
      
      // ✅ Only send dayOfWeek if templateType is 'daily' and it has a value
      // Otherwise, set it to undefined (which will be omitted from the request)
      if (submitData.templateType === 'daily' && submitData.dayOfWeek) {
        submitData.dayOfWeek = submitData.dayOfWeek;
      } else {
        submitData.dayOfWeek = undefined;
      }
      
      console.log('📝 Submitting form data:', JSON.stringify(submitData, null, 2));
      onSubmit(submitData);
    },
  });

  useEffect(() => {
    if (template?.tags) {
      setTags(template.tags);
    }
  }, [template]);

  const handleAddTag = (): void => {
    const trimmedTag = currentTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string): void => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Basic Information */}
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Basic Information
          </Typography>
        </Box>

        <TextField
          fullWidth
          name="name"
          label="Template Name"
          value={formik.values.name}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.name && Boolean(formik.errors.name)}
          helperText={formik.touched.name && formik.errors.name}
          placeholder="e.g., Summer Menu, Weekend Special"
        />

        <TextField
          fullWidth
          name="description"
          label="Description"
          multiline
          rows={3}
          value={formik.values.description}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.description && Boolean(formik.errors.description)}
          helperText={formik.touched.description && formik.errors.description}
          placeholder="Brief description of this template"
        />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flex: '1 1 200px', minWidth: '150px' }}>
            <FormControl fullWidth>
              <InputLabel>Template Type</InputLabel>
              <Select
                name="templateType"
                value={formik.values.templateType}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.templateType && Boolean(formik.errors.templateType)}
                label="Template Type"
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="special">Special</MenuItem>
                <MenuItem value="seasonal">Seasonal</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {formik.values.templateType === 'daily' && (
            <Box sx={{ flex: '1 1 200px', minWidth: '150px' }}>
              <FormControl fullWidth>
                <InputLabel>Day of Week</InputLabel>
                <Select
                  name="dayOfWeek"
                  value={formik.values.dayOfWeek || ''}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.dayOfWeek && Boolean(formik.errors.dayOfWeek)}
                  label="Day of Week"
                >
                  <MenuItem value="Monday">Monday</MenuItem>
                  <MenuItem value="Tuesday">Tuesday</MenuItem>
                  <MenuItem value="Wednesday">Wednesday</MenuItem>
                  <MenuItem value="Thursday">Thursday</MenuItem>
                  <MenuItem value="Friday">Friday</MenuItem>
                  <MenuItem value="Saturday">Saturday</MenuItem>
                  <MenuItem value="Sunday">Sunday</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </Box>

        {/* Display Settings */}
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, mt: 2 }}>
            Display Settings
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flex: '1 1 200px', minWidth: '150px' }}>
            <FormControl fullWidth>
              <InputLabel>Display Layout</InputLabel>
              <Select
                name="displayLayout"
                value={formik.values.displayLayout}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                label="Display Layout"
              >
                <MenuItem value="grid">Grid</MenuItem>
                <MenuItem value="list">List</MenuItem>
                <MenuItem value="card">Card</MenuItem>
                <MenuItem value="carousel">Carousel</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ flex: '1 1 200px', minWidth: '150px' }}>
            <TextField
              fullWidth
              name="itemsPerRow"
              label="Items Per Row"
              type="number"
              value={formik.values.itemsPerRow}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.itemsPerRow && Boolean(formik.errors.itemsPerRow)}
              helperText={formik.touched.itemsPerRow && formik.errors.itemsPerRow}
              slotProps={{ 
                htmlInput: { min: 1, max: 6 } 
              }}
            />
          </Box>
        </Box>

        {/* Status */}
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, mt: 2 }}>
            Status
          </Typography>
        </Box>

        <Box>
          <FormControlLabel
            control={
              <Switch
                name="isActive"
                checked={formik.values.isActive}
                onChange={formik.handleChange}
              />
            }
            label="Active"
          />
          <FormControlLabel
            control={
              <Switch
                name="isDefault"
                checked={formik.values.isDefault}
                onChange={formik.handleChange}
              />
            }
            label="Set as Default"
          />
        </Box>

        {/* Tags */}
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, mt: 2 }}>
            Tags
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              size="small"
              placeholder="Add tag..."
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
              onKeyDown={handleKeyDown}
              sx={{ flexGrow: 1 }}
            />
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddTag}
            >
              Add
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onDelete={() => handleRemoveTag(tag)}
                deleteIcon={<CloseIcon />}
              />
            ))}
          </Box>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={formik.isSubmitting}
          >
            {mode === 'create' ? 'Create Template' : 'Update Template'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default TemplateForm;