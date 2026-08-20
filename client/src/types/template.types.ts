// types/template.types.ts

export type TemplateType = 'daily' | 'weekly' | 'special' | 'seasonal' | 'custom';
export type DisplayLayout = 'grid' | 'list' | 'card' | 'carousel';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface TemplateSection {
  _id: string;
  name: string;
  description: string;
  displayOrder: number;
  dishIds: string[];
  isVisible: boolean;
}

export interface Template {
  _id: string;
  restaurantId: string;
  restaurantName: string;
  branchId?: string | null;
  branchName: string;
  name: string;
  description: string;
  templateType: TemplateType;
  dayOfWeek?: DayOfWeek | null;
  sections: TemplateSection[];
  displayLayout: DisplayLayout;
  itemsPerRow: number;
  isActive: boolean;
  isDefault: boolean;
  usageCount: number;
  lastUsedAt?: Date | null;
  tags: string[];
  sectionCount: number;
  totalDishes: number;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateFormData {
  name: string;
  description: string;
  templateType: TemplateType;
  dayOfWeek?: DayOfWeek | null;
  displayLayout: DisplayLayout;
  itemsPerRow: number;
  isActive: boolean;
  isDefault: boolean;
  tags: string[];
  sections: TemplateSectionFormData[];
}

export interface TemplateSectionFormData {
  _id?: string;
  name: string;
  description: string;
  dishIds: string[];
  isVisible: boolean;
}

export interface TemplateListResponse {
  success: boolean;
  data: {
    templates: Template[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
    count: number;
  };
}

export interface TemplateDetailResponse {
  success: boolean;
  data: Template;
}

export interface TemplateCreateResponse {
  success: boolean;
  data: Template;
  message: string;
}

export interface TemplateUpdateResponse {
  success: boolean;
  data: Template;
  message: string;
}

export interface Dish {
  _id: string;
  name: string;
  image: string;
  price: number;
  dietaryType: string;
}