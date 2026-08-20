// AddDishCategoryPage.tsx - Fixed (no legacy localStorage token checks)

import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../services/api';
import { adminStorage } from '../utils/storage';
import { 
  Upload, Sparkles, Loader2, FolderTree, ChevronUp, ChevronDown, 
  ArrowLeft, AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ICategory {
  name: string;
  description: string;
  image: string;
  isActive: boolean;
}

const defaultForm = (): ICategory => ({
  name: "",
  description: "",
  image: "",
  isActive: true,
});

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

export default function AddDishCategoryPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ICategory>(defaultForm());
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // No mount-time token check needed — adminApi's interceptor attaches
  // the token from adminStorage automatically on every request. If the
  // session is actually invalid, the requests below will 401 and the
  // catch blocks handle the redirect.

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
        timeout: 60000, // 60 seconds timeout
      });

      console.log('✅ Upload response:', res.data);

      if (res.data.success) {
        const imageUrl = res.data.data?.url || res.data.data?.secureUrl || res.data.url || res.data.imageUrl;

        if (imageUrl) {
          console.log('✅ Image URL:', imageUrl);
          return imageUrl;
        } else {
          console.error('❌ No URL in response:', res.data);
          toast.error('Upload succeeded but no URL returned');
          return null;
        }
      } else {
        console.error('❌ Upload failed:', res.data.error);
        toast.error(res.data.error || 'Image upload failed');
        return null;
      }
    } catch (err: any) {
      console.error('❌ Upload error:', err);

      if (err.response?.status === 401) {
        adminStorage.clear();
        toast.error('Session expired. Please login again.');
        navigate('/login');
        return null;
      }

      if (err.response?.data?.error) {
        toast.error(err.response.data.error);
      } else if (err.message) {
        toast.error(err.message);
      } else {
        toast.error('Failed to upload image. Please try again.');
      }

      return null;
    }
  };

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, image: 'Please upload an image file' }));
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, image: 'Image must be less than 20MB' }));
      toast.error('Image must be less than 20MB');
      return;
    }

    setUploadingImg(true);
    setErrors(prev => ({ ...prev, image: '' }));

    const preview = URL.createObjectURL(file);
    setImagePreview(preview);

    const url = await uploadImage(file);

    if (url) {
      updateField('image', url);
      toast.success('Image uploaded successfully!');
    } else {
      URL.revokeObjectURL(preview);
      setImagePreview(null);
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

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Category name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (uploadingImg) {
      toast.error('Please wait for image upload to finish');
      return;
    }

    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      console.log('📝 Creating category:', form);

      const res = await adminApi.post('/categories', form);

      console.log('✅ Category created:', res.data);

      if (res.data.success) {
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        toast.success('Dish category created successfully!');
        navigate('/categories');
      } else {
        toast.error(res.data.error || 'Failed to create category');
        setErrors({ submit: res.data.error || 'Failed to create category' });
      }
    } catch (err: any) {
      console.error('❌ Create category error:', err);

      if (err.response?.status === 401) {
        adminStorage.clear();
        toast.error('Session expired. Please login again.');
        navigate('/login');
        return;
      }

      const errorMsg = err.response?.data?.error || err.message || 'Failed to create category';
      toast.error(errorMsg);
      setErrors({ submit: errorMsg });
    } finally {
      setLoading(false);
    }
  };

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
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Add Dish Category</h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Create a new dish category</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 24px 40px' }}>
        {errors.submit && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '11px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} color="#dc2626" /> {errors.submit}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Category Image */}
          <Section icon={Upload} title="Category Image">
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => !imagePreview && !uploadingImg && fileRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? '#f97316' : errors.image ? '#fca5a5' : '#e5e7eb'}`,
                borderRadius: 10,
                background: '#fafafa',
                cursor: (imagePreview || uploadingImg) ? 'default' : 'pointer',
                transition: 'border-color 0.2s',
              }}
            >
              {uploadingImg ? (
                <div style={{ padding: 36, textAlign: 'center' }}>
                  <Loader2 size={26} color="#f97316" style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                  <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 10 }}>Uploading…</p>
                </div>
              ) : imagePreview ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16 }}>
                  <img src={imagePreview} alt="Preview" style={{ width: 68, height: 68, objectFit: 'cover', borderRadius: 10, border: '1px solid #e5e7eb' }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Image ready ✓</p>
                    <button
                      onClick={e => { e.stopPropagation(); setImagePreview(null); updateField('image', ''); }}
                      style={{ marginTop: 8, fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Remove image
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                  <Upload size={20} color="#d1d5db" style={{ margin: '0 auto' }} />
                  <p style={{ fontSize: 13, marginTop: 8, color: '#6b7280' }}>
                    Drop image here or <span style={{ color: '#f97316', fontWeight: 600 }}>browse</span>
                  </p>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>JPG, PNG, WebP — max 5 MB</p>
                </div>
              )}
            </div>
            {errors.image && <p style={{ ...errTextStyle, marginTop: 8 }}>{errors.image}</p>}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])}
            />
          </Section>

          {/* Category Details */}
          <Section icon={FolderTree} title="Category Details">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Category Name */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Category Name <span style={reqStyle}>*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => updateField('name', e.target.value)}
                  placeholder="e.g., Starters, Main Course, Desserts"
                  style={inputBase(!!errors.name)}
                />
                {errors.name && <span style={errTextStyle}>{errors.name}</span>}
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Enter a unique name for this dish category</p>
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
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Optional description (max 500 characters)</p>
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button
              onClick={() => navigate('/categories')}
              style={{ height: 40, padding: '0 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 500, color: '#6b7280', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || uploadingImg}
              style={{
                height: 40,
                padding: '0 24px',
                borderRadius: 8,
                border: 'none',
                background: loading || uploadingImg ? '#fdba74' : 'linear-gradient(135deg,#f97316,#ef4444)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: loading || uploadingImg ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                boxShadow: '0 2px 8px rgba(249,115,22,0.35)',
              }}
            >
              {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Sparkles size={14} /> Create Category</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}