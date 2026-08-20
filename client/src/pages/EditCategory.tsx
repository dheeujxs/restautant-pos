// EditCategoryPage.tsx - Fixed authentication handling

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../services/api';
import { useAuth } from '../utils/AuthContext';

import { 
  Upload, Sparkles, Loader2, Tag, ChevronUp, ChevronDown, 
  ArrowLeft, RefreshCw, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ICategory {
  name: string;
  description: string;
  image: string;
  isActive: boolean;
}

const fieldStyle = { display: 'flex', flexDirection: 'column' as const, gap: '6px' };
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: '#374151' };
const reqStyle: React.CSSProperties = { color: '#ef4444', marginLeft: 2 };
const inputBase = (err = false): React.CSSProperties => ({
  height: 40, width: '100%', boxSizing: 'border-box',
  border: `1px solid ${err ? '#fca5a5' : '#e5e7eb'}`,
  borderRadius: 8, padding: '0 12px', fontSize: 14,
  background: '#fff', color: '#111827', outline: 'none',
  transition: 'border-color 0.15s',
});
const errTextStyle: React.CSSProperties = { fontSize: 11, color: '#ef4444' };

function Section({ icon: Icon, iconColor = '#f97316', title, children, defaultOpen = true }: {
  icon: React.ElementType; iconColor?: string; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      <button type="button" onClick={() => setOpen(p => !p)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', background: '#fff', borderBottom: open ? '1px solid #f3f4f6' : 'none', cursor: 'pointer', border: 'none', textAlign: 'left' }}>
        <Icon size={16} color={iconColor} />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', flex: 1 }}>{title}</span>
        {open ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
      </button>
      {open && <div style={{ padding: '20px 20px 24px' }}>{children}</div>}
    </div>
  );
}

export default function EditCategoryPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ICategory>({
    name: "",
    description: "",
    image: "",
    isActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ✅ Check authentication using AuthContext
  useEffect(() => {
    // Wait for auth to load before checking
    if (authLoading) return;
    
    if (!isAuthenticated) {
      console.warn('⚠️ Not authenticated, redirecting to login');
      toast.error('Please login to continue');
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Fetch category data
  useEffect(() => {
    // Don't fetch if not authenticated
    if (!isAuthenticated || authLoading) return;
    
    const fetchCategory = async () => {
      try {
        console.log('📥 Fetching category:', id);
        const res = await adminApi.get(`/categories/${id}`);
        console.log('✅ Category fetched:', res.data);
        
        if (res.data.success) {
          const cat = res.data.data;
          setForm({
            name: cat.name || "",
            description: cat.description || "",
            image: cat.image || "",
            isActive: cat.isActive !== false,
          });
          if (cat.image) setImagePreview(cat.image);
        }
      } catch (err: any) {
        console.error('❌ Fetch error:', err);
        
        // Handle authentication errors
        if (err.response?.status === 401 || err.response?.status === 403) {
          // Auth context will handle the redirect
          toast.error('Session expired. Please login again.');
          return;
        }
        
        setErrors({ submit: err.response?.data?.error || "Category not found" });
        toast.error('Failed to load category');
      } finally { 
        setLoading(false); 
      }
    };
    
    if (id) fetchCategory();
  }, [id, isAuthenticated, authLoading]);

  const updateField = <K extends keyof ICategory>(key: K, value: ICategory[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append('image', file);
    
    try {
      console.log('📤 Uploading image:', file.name, file.size, 'bytes');
      
      const res = await adminApi.post('/upload', fd, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
        },
        timeout: 30000,
      });
      
      console.log('✅ Upload response:', res.data);
      
      // Try different response formats
      return res.data.data?.url || 
             res.data.data?.secureUrl || 
             res.data.imageUrl || 
             res.data.url || 
             res.data.path || 
             null;
    } catch (err: any) {
      console.error('❌ Upload error:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401 || err.response?.status === 403) {
        toast.error('Session expired. Please login again.');
        return null;
      }
      
      const errorMsg = err.response?.data?.error || err.message || 'Image upload failed';
      setErrors(prev => ({ ...prev, image: errorMsg }));
      toast.error(errorMsg);
      return null;
    }
  };

  const handleImageFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, image: 'Please upload an image file' }));
      toast.error('Please upload an image file');
      return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, image: 'Image must be less than 5MB' }));
      toast.error('Image must be less than 5MB');
      return;
    }
    
    setUploadingImg(true);
    setErrors(prev => ({ ...prev, image: '' }));
    
    // Create preview immediately
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
    
    // Upload to server
    const url = await uploadImage(file);
    
    if (url) {
      updateField('image', url);
      toast.success('Image uploaded successfully!');
    } else {
      // If upload fails, remove preview
      URL.revokeObjectURL(preview);
      setImagePreview(form.image || null);
      setErrors(prev => ({ ...prev, image: 'Failed to upload image' }));
    }
    
    setUploadingImg(false);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  }, []);

  const handleReset = async () => {
    if (!window.confirm('Reset all changes?')) return;
    
    try {
      const res = await adminApi.get(`/categories/${id}`);
      if (res.data.success) {
        const cat = res.data.data;
        setForm({
          name: cat.name || "",
          description: cat.description || "",
          image: cat.image || "",
          isActive: cat.isActive !== false,
        });
        setImagePreview(cat.image || null);
        setErrors({});
        toast.success('Form reset');
      }
    } catch (err: any) {
      toast.error('Failed to reset form');
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Category name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (uploadingImg) {
      toast.error('Please wait for image upload to finish');
      setErrors({ submit: 'Please wait for image upload to finish' });
      return;
    }
    
    if (!validate()) {
      toast.error('Please fix the errors');
      return;
    }
    
    setSubmitting(true);
    setErrors({});
    
    try {
      console.log('📝 Updating category:', form);
      
      const res = await adminApi.patch(`/categories/${id}`, form);
      
      console.log('✅ Category updated:', res.data);
      
      if (res.data.success) {
        if (imagePreview && !form.image) URL.revokeObjectURL(imagePreview);
        toast.success('Category updated successfully!');
        navigate('/categories');
      } else {
        toast.error(res.data.error || 'Failed to update category');
        setErrors({ submit: res.data.error || 'Failed to update category' });
      }
    } catch (err: any) {
      console.error('❌ Update error:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401 || err.response?.status === 403) {
        toast.error('Session expired. Please login again.');
        return;
      }
      
      const errorMsg = err.response?.data?.error || err.message || 'Failed to update category';
      toast.error(errorMsg);
      setErrors({ submit: errorMsg });
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading state while auth is initializing or data is loading
  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <Loader2 size={40} color="#f97316" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: 16, color: '#6b7280', fontSize: 14 }}>
          {authLoading ? 'Authenticating...' : 'Loading category...'}
        </p>
      </div>
    );
  }

  // If not authenticated, don't render the form (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus, textarea:focus {
          border-color: #f97316 !important;
          box-shadow: 0 0 0 3px rgba(249,115,22,0.12);
        }
      `}</style>

      {/* Navbar */}
      <div style={{ padding: '0 24px', height: 56, background: 'white', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={() => navigate('/categories')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              padding: '0 16px',
              height: 36,
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              background: '#fff',
              color: '#374151',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={15} />
            Back to Categories
          </button>
          
          <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />
          
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Edit Category</h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Update menu category</p>
          </div>
        </div>
        
        <button
          onClick={handleReset}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 20px',
            height: 36,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            background: '#f9fafb',
            color: '#f97316',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={15} />
          Reset Form
        </button>
      </div>

      <div style={{ padding: '24px 24px 40px' }}>

        {errors.submit && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '11px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} color="#dc2626" /> {errors.submit}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Category Image Section */}
          <Section icon={Upload} title="Category Image">
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => !imagePreview && !uploadingImg && fileRef.current?.click()}
              style={{ border: `2px dashed ${isDragging ? '#f97316' : errors.image ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 10, background: '#fafafa', cursor: imagePreview || uploadingImg ? 'default' : 'pointer' }}
            >
              {uploadingImg ? (
                <div style={{ padding: 36, textAlign: 'center' }}>
                  <Loader2 size={26} color="#f97316" style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                  <p style={{ fontSize: 13, color: '#9ca3af' }}>Uploading…</p>
                </div>
              ) : imagePreview ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16 }}>
                  <img src={imagePreview} alt="Preview" style={{ width: 68, height: 68, objectFit: 'cover', borderRadius: 10 }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>Image ready ✓</p>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setImagePreview(null); 
                        updateField('image', ''); 
                      }} 
                      style={{ marginTop: 8, fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Remove image
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                  <Upload size={20} color="#d1d5db" />
                  <p style={{ fontSize: 13, marginTop: 8 }}>Drop image here or <span style={{ color: '#f97316', fontWeight: 600 }}>browse</span></p>
                  <p style={{ fontSize: 11, color: '#9ca3af' }}>JPG, PNG, WebP — max 5 MB</p>
                </div>
              )}
            </div>
            {errors.image && <p style={errTextStyle}>{errors.image}</p>}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])}
            />
          </Section>

          {/* Category Details Section */}
          <Section icon={Tag} title="Category Details">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Category Name */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Category Name <span style={reqStyle}>*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => updateField('name', e.target.value)}
                  placeholder="e.g., Starters, Beverages, North Indian"
                  style={inputBase(!!errors.name)}
                />
                {errors.name && <span style={errTextStyle}>{errors.name}</span>}
              </div>

              {/* Description */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => updateField('description', e.target.value)}
                  placeholder="Describe the category…"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: 14,
                    resize: 'vertical',
                    background: '#fff',
                    color: '#111827',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Active Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={e => updateField('isActive', e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#f97316', cursor: 'pointer' }}
                />
                <label htmlFor="isActive" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>
                  Active category <span style={{ color: '#9ca3af' }}>(visible on menu)</span>
                </label>
              </div>
            </div>
          </Section>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 4 }}>
            <button
              onClick={() => navigate('/categories')}
              style={{
                height: 40,
                padding: '0 24px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#fff',
                fontSize: 14,
                fontWeight: 500,
                color: '#6b7280',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={submitting || uploadingImg}
              style={{ 
                height: 40, 
                padding: '0 28px', 
                borderRadius: 8, 
                border: 'none', 
                background: submitting || uploadingImg ? '#fdba74' : 'linear-gradient(135deg,#f97316,#ef4444)', 
                color: '#fff', 
                fontSize: 14, 
                fontWeight: 600, 
                cursor: submitting ? 'not-allowed' : 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                boxShadow: '0 2px 8px rgba(249,115,22,0.35)'
              }}
            >
              {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Updating…</> : <><Sparkles size={16} /> Update Category</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}