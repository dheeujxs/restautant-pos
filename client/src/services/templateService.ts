// services/templateService.ts
import { adminApi } from './api';
import type { AxiosResponse } from 'axios';
import type {
  Template,
  TemplateFormData,
  TemplateListResponse,
  TemplateDetailResponse,
  TemplateCreateResponse,
  TemplateUpdateResponse,
} from '../types/template.types';

export const templateService = {
  // Get all templates with pagination and filters
  getTemplates: async (
    page: number = 1,
    limit: number = 20,
    filters?: {
      search?: string;
      templateType?: string;
      isActive?: boolean;
    }
  ): Promise<TemplateListResponse> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.templateType) params.append('templateType', filters.templateType);
    if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());

    const response: AxiosResponse<TemplateListResponse> = await adminApi.get(
      `/templates?${params.toString()}`
    );
    return response.data;
  },

  // Get single template by ID
  getTemplate: async (id: string): Promise<TemplateDetailResponse> => {
    const response: AxiosResponse<TemplateDetailResponse> = await adminApi.get(
      `/templates/${id}`
    );
    return response.data;
  },

  // Create new template
  createTemplate: async (data: TemplateFormData): Promise<TemplateCreateResponse> => {
    const response: AxiosResponse<TemplateCreateResponse> = await adminApi.post(
      `/templates`,
      data
    );
    return response.data;
  },

  // Update template
  updateTemplate: async (
    id: string,
    data: Partial<TemplateFormData>
  ): Promise<TemplateUpdateResponse> => {
    const response: AxiosResponse<TemplateUpdateResponse> = await adminApi.patch(
      `/templates/${id}`,
      data
    );
    return response.data;
  },

  // Delete template
  deleteTemplate: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response: AxiosResponse<{ success: boolean; message: string }> = await adminApi.delete(
      `/templates/${id}`
    );
    return response.data;
  },

  // Duplicate template
  duplicateTemplate: async (id: string): Promise<TemplateCreateResponse> => {
    const response: AxiosResponse<TemplateCreateResponse> = await adminApi.post(
      `/templates/${id}/duplicate`
    );
    return response.data;
  },

  // Add section to template
  addSection: async (
    templateId: string,
    sectionData: { name: string; description?: string; dishIds?: string[] }
  ): Promise<{ success: boolean; data: { sectionId: string }; message: string }> => {
    const response: AxiosResponse<{
      success: boolean;
      data: { sectionId: string };
      message: string;
    }> = await adminApi.post(`/templates/${templateId}/sections`, sectionData);
    return response.data;
  },

  // Remove section from template
  removeSection: async (
    templateId: string,
    sectionId: string
  ): Promise<{ success: boolean; message: string }> => {
    const response: AxiosResponse<{ success: boolean; message: string }> = await adminApi.delete(
      `/templates/${templateId}/sections/${sectionId}`
    );
    return response.data;
  },

  // Add dish to section
  addDishToSection: async (
    templateId: string,
    sectionId: string,
    dishId: string
  ): Promise<{ success: boolean; message: string }> => {
    const response: AxiosResponse<{ success: boolean; message: string }> = await adminApi.post(
      `/templates/${templateId}/sections/${sectionId}/dishes/${dishId}`
    );
    return response.data;
  },

  // Remove dish from section
  removeDishFromSection: async (
    templateId: string,
    sectionId: string,
    dishId: string
  ): Promise<{ success: boolean; message: string }> => {
    const response: AxiosResponse<{ success: boolean; message: string }> = await adminApi.delete(
      `/templates/${templateId}/sections/${sectionId}/dishes/${dishId}`
    );
    return response.data;
  },

  // Reorder sections
  reorderSections: async (
    templateId: string,
    sectionOrder: string[]
  ): Promise<{ success: boolean; message: string }> => {
    const response: AxiosResponse<{ success: boolean; message: string }> = await adminApi.patch(
      `/templates/${templateId}/reorder`,
      { sectionOrder }
    );
    return response.data;
  },
};