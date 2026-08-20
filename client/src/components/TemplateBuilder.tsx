// components/TemplateBuilder.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Pagination,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import TemplateCard from './TemplateCard';
import TemplateForm from './TemplateForm';
import SectionManager from './SectionManager';
import { templateService } from '../services/templateService';
import { dishService } from '../services/dishService';
import type {
  Template,
  Dish,
  TemplateType,
  DisplayLayout,
  TemplateFormData,
  TemplateSectionFormData,
} from '../types/template.types';

interface TemplateBuilderState {
  templates: Template[];
  loading: boolean;
  selectedTemplate: Template | null;
  isFormOpen: boolean;
  formMode: 'create' | 'edit' | 'duplicate';
  searchTerm: string;
  filterType: string;
  filterActive: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
};

const TemplateBuilder: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();

  const [state, setState] = useState<TemplateBuilderState>({
    templates: [],
    loading: false,
    selectedTemplate: null,
    isFormOpen: false,
    formMode: 'create',
    searchTerm: '',
    filterType: '',
    filterActive: '',
    pagination: {
      page: DEFAULT_PAGINATION.page,
      limit: DEFAULT_PAGINATION.limit,
      total: 0,
      pages: 0,
    },
  });

  const [availableDishes, setAvailableDishes] = useState<Dish[]>([]);
  const [isSectionManagerOpen, setIsSectionManagerOpen] = useState<boolean>(false);

  const loadTemplates = useCallback(
    async (page: number = DEFAULT_PAGINATION.page) => {
      try {
        setState((prev) => ({ ...prev, loading: true }));

        const response = await templateService.getTemplates(
          page,
          state.pagination.limit,
          {
            search: state.searchTerm || undefined,
            templateType: state.filterType || undefined,
            isActive: state.filterActive ? state.filterActive === 'active' : undefined,
          }
        );

        setState((prev) => ({
          ...prev,
          templates: response.data.templates || [],
          pagination: response.data.pagination,
          loading: false,
        }));
      } catch (error) {
        enqueueSnackbar('Failed to load templates', { variant: 'error' });
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [state.filterActive, state.filterType, state.pagination.limit, state.searchTerm, enqueueSnackbar]
  );

  const loadAvailableDishes = useCallback(async () => {
    try {
      const response = await dishService.getDishes(1, 1000);
      setAvailableDishes(response.data.dishes || []);
    } catch (error) {
      console.error('Failed to load dishes:', error);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
    loadAvailableDishes();
  }, [loadTemplates, loadAvailableDishes]);

  const handleSearch = (): void => {
    loadTemplates(DEFAULT_PAGINATION.page);
  };

  const handleFilterChange = (type: 'type' | 'active', value: string): void => {
    if (type === 'type') {
      setState((prev) => ({ ...prev, filterType: value }));
    } else {
      setState((prev) => ({ ...prev, filterActive: value }));
    }
    loadTemplates(DEFAULT_PAGINATION.page);
  };

  const handleCreateTemplate = async (data: TemplateFormData): Promise<void> => {
    try {
      const response = await templateService.createTemplate(data);
      setState((prev) => ({
        ...prev,
        templates: [response.data, ...prev.templates],
        isFormOpen: false,
      }));
      enqueueSnackbar('Template created successfully', { variant: 'success' });
      loadTemplates(state.pagination.page);
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Failed to create template', {
        variant: 'error',
      });
    }
  };

  const handleUpdateTemplate = async (id: string, data: TemplateFormData): Promise<void> => {
    try {
      const response = await templateService.updateTemplate(id, data);
      setState((prev) => ({
        ...prev,
        templates: prev.templates.map((t) => (t._id === id ? response.data : t)),
        isFormOpen: false,
      }));
      enqueueSnackbar('Template updated successfully', { variant: 'success' });
      loadTemplates(state.pagination.page);
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Failed to update template', {
        variant: 'error',
      });
    }
  };

  const handleDeleteTemplate = async (id: string): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      await templateService.deleteTemplate(id);
      setState((prev) => ({
        ...prev,
        templates: prev.templates.filter((t) => t._id !== id),
      }));
      enqueueSnackbar('Template deleted successfully', { variant: 'success' });
      loadTemplates(state.pagination.page);
    } catch (error) {
      enqueueSnackbar('Failed to delete template', { variant: 'error' });
    }
  };

  const handleDuplicateTemplate = async (id: string): Promise<void> => {
    try {
      const response = await templateService.duplicateTemplate(id);
      setState((prev) => ({
        ...prev,
        templates: [response.data, ...prev.templates],
      }));
      enqueueSnackbar('Template duplicated successfully', { variant: 'success' });
      loadTemplates(state.pagination.page);
    } catch (error) {
      enqueueSnackbar('Failed to duplicate template', { variant: 'error' });
    }
  };

  const handleToggleActive = async (template: Template): Promise<void> => {
    await handleUpdateTemplate(template._id, { 
      ...template, 
      isActive: !template.isActive 
    });
  };

  const handleAddSection = async (sectionData: { name: string; description?: string; dishIds?: string[] }): Promise<void> => {
    if (!state.selectedTemplate) return;
    try {
      await templateService.addSection(state.selectedTemplate._id, sectionData);
      enqueueSnackbar('Section added successfully', { variant: 'success' });
      loadTemplates(state.pagination.page);
    } catch (error) {
      enqueueSnackbar('Failed to add section', { variant: 'error' });
    }
  };

  const handleRemoveSection = async (sectionId: string): Promise<void> => {
    if (!state.selectedTemplate) return;
    try {
      await templateService.removeSection(state.selectedTemplate._id, sectionId);
      enqueueSnackbar('Section removed successfully', { variant: 'success' });
      loadTemplates(state.pagination.page);
    } catch (error) {
      enqueueSnackbar('Failed to remove section', { variant: 'error' });
    }
  };

  const handleAddDishToSection = async (
    templateId: string,
    sectionId: string,
    dishId: string
  ): Promise<void> => {
    try {
      await templateService.addDishToSection(templateId, sectionId, dishId);
      enqueueSnackbar('Dish added to section', { variant: 'success' });
      loadTemplates(state.pagination.page);
    } catch (error) {
      enqueueSnackbar('Failed to add dish to section', { variant: 'error' });
    }
  };

  const handleRemoveDishFromSection = async (
    templateId: string,
    sectionId: string,
    dishId: string
  ): Promise<void> => {
    try {
      await templateService.removeDishFromSection(templateId, sectionId, dishId);
      enqueueSnackbar('Dish removed from section', { variant: 'success' });
      loadTemplates(state.pagination.page);
    } catch (error) {
      enqueueSnackbar('Failed to remove dish from section', { variant: 'error' });
    }
  };

  const handleSectionReorder = (templateId: string, sectionOrder: string[]): void => {
    console.log('Reorder sections:', templateId, sectionOrder);
  };

  const openCreateForm = (): void => {
    setState((prev) => ({
      ...prev,
      formMode: 'create',
      selectedTemplate: null,
      isFormOpen: true,
    }));
  };

  const openEditForm = (template: Template): void => {
    setState((prev) => ({
      ...prev,
      formMode: 'edit',
      selectedTemplate: template,
      isFormOpen: true,
    }));
  };

  const openSectionManager = (template: Template): void => {
    setState((prev) => ({ ...prev, selectedTemplate: template }));
    setIsSectionManagerOpen(true);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1">
            Menu Templates
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Create and manage menu templates for your restaurant
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
          Create Template
        </Button>
      </Box>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <TextField
              fullWidth
              placeholder="Search templates..."
              value={state.searchTerm}
              onChange={(e) => setState((prev) => ({ ...prev, searchTerm: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              slotProps={{
                input: {
                  endAdornment: (
                    <IconButton onClick={handleSearch}>
                      <SearchIcon />
                    </IconButton>
                  ),
                },
              }}
            />
          </Box>
          <Box sx={{ flex: '0 1 200px', minWidth: '150px' }}>
            <FormControl fullWidth>
              <InputLabel>Template Type</InputLabel>
              <Select
                value={state.filterType}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                label="Template Type"
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="special">Special</MenuItem>
                <MenuItem value="seasonal">Seasonal</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: '0 1 200px', minWidth: '150px' }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={state.filterActive}
                onChange={(e) => handleFilterChange('active', e.target.value)}
                label="Status"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: '0 0 auto' }}>
            <Typography variant="body2" color="text.secondary">
              {state.pagination.total} templates found
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Templates Grid */}
      {state.loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 3,
            margin: -1.5,
            '& > *': {
              padding: 1.5,
              flex: '1 1 300px',
              maxWidth: '100%',
            },
          }}
        >
          {state.templates.length === 0 ? (
            <Box sx={{ width: '100%', padding: 1.5 }}>
              <Paper sx={{ p: 6, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No templates found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Create your first menu template to get started
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
                  Create Template
                </Button>
              </Paper>
            </Box>
          ) : (
            state.templates.map((template) => (
              <Box key={template._id}>
                <TemplateCard
                  template={template}
                  onEdit={() => openEditForm(template)}
                  onDelete={() => handleDeleteTemplate(template._id)}
                  onDuplicate={() => handleDuplicateTemplate(template._id)}
                  onManageSections={() => openSectionManager(template)}
                  onToggleActive={() => handleToggleActive(template)}
                />
              </Box>
            ))
          )}
        </Box>
      )}

      {/* Pagination */}
      {state.pagination.pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={state.pagination.pages}
            page={state.pagination.page}
            onChange={(_, page) => loadTemplates(page)}
            color="primary"
          />
        </Box>
      )}

      {/* Template Form Dialog */}
      <Dialog
        open={state.isFormOpen}
        onClose={() => setState((prev) => ({ ...prev, isFormOpen: false }))}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {state.formMode === 'create' && 'Create New Template'}
          {state.formMode === 'edit' && 'Edit Template'}
          {state.formMode === 'duplicate' && 'Duplicate Template'}
        </DialogTitle>
        <DialogContent>
          <TemplateForm
            mode={state.formMode}
            template={state.selectedTemplate}
            onSubmit={
              state.formMode === 'create'
                ? handleCreateTemplate
                : (data: TemplateFormData) => handleUpdateTemplate(state.selectedTemplate!._id, data)
            }
            onCancel={() => setState((prev) => ({ ...prev, isFormOpen: false }))}
          />
        </DialogContent>
      </Dialog>

      {/* Section Manager Dialog */}
      <Dialog
        open={isSectionManagerOpen}
        onClose={() => setIsSectionManagerOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Manage Sections - {state.selectedTemplate?.name}</DialogTitle>
        <DialogContent>
          {state.selectedTemplate && (
            <SectionManager
              template={state.selectedTemplate}
              availableDishes={availableDishes}
              onAddSection={handleAddSection}
              onRemoveSection={handleRemoveSection}
              onAddDish={handleAddDishToSection}
              onRemoveDish={handleRemoveDishFromSection}
              onReorderSections={handleSectionReorder}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsSectionManagerOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TemplateBuilder;