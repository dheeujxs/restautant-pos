// utils/imageUpload.ts

/**
 * Optimized Image Upload Utility
 * Handles compression, resizing, and upload with progress tracking
 */

import type { AxiosInstance, AxiosProgressEvent } from 'axios';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const QUALITY = 0.82;
const UPLOAD_TIMEOUT = 60000; // 60 seconds

// ─── Types ────────────────────────────────────────────────────────────────────
export interface UploadResult {
  success: boolean;
  url?: string;
  data?: unknown;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export type ProgressCallback = (progress: number) => void;

// ─── Image Optimization ──────────────────────────────────────────────────────

/**
 * Compress and resize image before upload
 */
export const optimizeImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    // Validate input
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Please upload a valid image file'));
      return;
    }

    // If file is already small enough, return as-is
    if (file.size <= MAX_IMAGE_SIZE) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const result = event.target?.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read image file'));
        return;
      }

      const img = new Image();
      
      img.onload = () => {
        try {
          // Calculate new dimensions maintaining aspect ratio
          let width = img.width;
          let height = img.height;
          
          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // Use better image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Determine output format
          let mimeType: string = file.type;
          // Convert to WebP for better compression when possible
          if (file.type === 'image/jpeg' || file.type === 'image/jpg' || file.type === 'image/png') {
            mimeType = 'image/webp';
          }

          // Compress with quality setting
          const dataUrl = canvas.toDataURL(mimeType, QUALITY);
          
          // Convert data URL to Blob
          const blob = dataURLToBlob(dataUrl);
          
          // Create new File with optimized size
          const optimizedFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, '.webp'),
            { type: mimeType, lastModified: Date.now() }
          );

          console.log(
            `📸 Image optimized: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(optimizedFile.size / 1024 / 1024).toFixed(2)}MB`
          );
          
          resolve(optimizedFile);
        } catch (error) {
          reject(new Error(`Failed to optimize image: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for optimization'));
      };
      
      img.src = result;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };
  });
};

/**
 * Convert data URL to Blob
 */
const dataURLToBlob = (dataURL: string): Blob => {
  const parts = dataURL.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/webp';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

// ─── Upload with Progress ────────────────────────────────────────────────────

/**
 * Upload image with progress tracking
 */
export const uploadImageWithProgress = async (
  file: File,
  apiClient: AxiosInstance,
  onProgress?: ProgressCallback
): Promise<UploadResult> => {
  try {
    // Step 1: Optimize the image
    const optimizedFile = await optimizeImage(file);
    
    // Step 2: Create form data
    const formData = new FormData();
    formData.append('image', optimizedFile);
    formData.append('folder', 'restaurant-dishes');
    
    // Step 3: Upload with progress
    const response = await apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
      timeout: UPLOAD_TIMEOUT,
    });
    
    if (response.data?.success) {
      const imageUrl = response.data.data?.url || 
                       response.data.data?.secureUrl || 
                       response.data.url || 
                       response.data.imageUrl;
      
      if (imageUrl) {
        return { success: true, url: imageUrl, data: response.data };
      }
    }
    
    return { success: false, error: 'No image URL returned from server' };
  } catch (error) {
    console.error('❌ Image upload error:', error);
    
    let errorMessage = 'Failed to upload image';
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      if (axiosError.response?.data?.error) {
        errorMessage = axiosError.response.data.error;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
};

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validate image file before upload
 */
export const validateImageFile = (file: File | null): ValidationResult => {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  // Check file type
  const allowedTypes = [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/webp', 
    'image/gif', 
    'image/svg+xml'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Please upload JPG, PNG, WebP, GIF, or SVG image' 
    };
  }
  
  // Check file size (5MB limit)
  if (file.size > MAX_IMAGE_SIZE) {
    return { 
      valid: false, 
      error: `Image must be less than ${MAX_IMAGE_SIZE / 1024 / 1024}MB` 
    };
  }
  
  return { valid: true };
};

// ─── Preview Management ──────────────────────────────────────────────────────

/**
 * Create a preview URL for image
 */
export const createImagePreview = (file: File | null): string | null => {
  if (!file) return null;
  return URL.createObjectURL(file);
};

/**
 * Revoke preview URL to free memory
 */
export const revokeImagePreview = (url: string | null): void => {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

// ─── Additional Utility Functions ───────────────────────────────────────────

/**
 * Get image dimensions from file
 */
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Invalid image file'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read image file'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      img.src = result;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };
  });
};

/**
 * Check if image is too large (dimensions)
 */
export const isImageTooLarge = (width: number, height: number): boolean => {
  return width > MAX_WIDTH || height > MAX_HEIGHT;
};

/**
 * Get recommended dimensions for image
 */
export const getRecommendedDimensions = (width: number, height: number): { width: number; height: number } => {
  if (width <= MAX_WIDTH && height <= MAX_HEIGHT) {
    return { width, height };
  }
  
  const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// ─── Default Export ──────────────────────────────────────────────────────────

export default {
  optimizeImage,
  uploadImageWithProgress,
  validateImageFile,
  createImagePreview,
  revokeImagePreview,
  getImageDimensions,
  isImageTooLarge,
  getRecommendedDimensions,
  formatFileSize,
};