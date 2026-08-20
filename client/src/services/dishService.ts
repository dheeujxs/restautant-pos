// services/dishService.ts
import { adminApi } from './api';
import type { AxiosResponse } from 'axios';
import type { Dish } from '../types/template.types';

interface DishListResponse {
  success: boolean;
  data: {
    dishes: Dish[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
    count: number;
  };
}

interface DishDetailResponse {
  success: boolean;
  data: Dish;
}

export const dishService = {
  // Get all dishes with pagination and filters
  getDishes: async (
    page: number = 1,
    limit: number = 20,
    filters?: {
      search?: string;
      categoryId?: string;
      dietaryType?: string;
      isActive?: boolean;
    }
  ): Promise<DishListResponse> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    if (filters?.dietaryType) params.append('dietaryType', filters.dietaryType);
    if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());

    const response: AxiosResponse<DishListResponse> = await adminApi.get(
      `/dishes?${params.toString()}`
    );
    return response.data;
  },

  // Get single dish by ID
  getDish: async (id: string): Promise<DishDetailResponse> => {
    const response: AxiosResponse<DishDetailResponse> = await adminApi.get(
      `/dishes/${id}`
    );
    return response.data;
  },
};