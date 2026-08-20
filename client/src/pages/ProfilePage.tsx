// src/pages/profile/ProfilePage.tsx
// Profile data no longer gets cached into localStorage under the 'user' key
// — per utils/storage.ts, storage is token-only now. User/profile data lives
// solely in AuthContext's `user` (server-fetched), so after any mutation we
// call refreshUser() to update context instead of hand-writing to
// localStorage. This also switches from ../hooks/useAuth to
// ../utils/AuthContext to match the rest of the app; if hooks/useAuth.ts is
// a separate legacy hook, it's worth checking whether it independently
// still touches localStorage['user'] too.
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { adminApi } from '../services/api';
import {
  User, Mail, Phone, Calendar, Save, Edit2, X, Camera,
  Loader2, Shield, CheckCircle, AlertCircle, LogOut,
  ChevronRight, Building2, Clock, FileText, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface IUserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, isLoading: authLoading, refreshUser } = useAuth();
  const [profile, setProfile] = useState<IUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (authLoading) return; // wait for the session check to resolve first
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  const loadProfile = async () => {
    setLoading(true);

    try {
      // Seed immediately from AuthContext's `user` (already server-fetched
      // by AuthContext on load) so the page isn't blank while the request
      // below is in flight.
      if (user) {
        setProfile({
          _id: user.id,
          firstName: user.firstName || (user.name ? user.name.split(' ')[0] : ''),
          lastName: user.lastName || '',
          email: user.email || '',
          phone: '',
          role: user.role || 'user',
          profileImage: user.avatar || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setFormData({
          firstName: user.firstName || (user.name ? user.name.split(' ')[0] : ''),
          lastName: user.lastName || '',
          phone: '',
        });
      }

      // Then fetch the authoritative, full profile from the API — this has
      // fields (phone, createdAt, updatedAt) that AuthContext's slimmer
      // `user` doesn't carry.
      const res = await adminApi.get('/auth/profile');

      if (res.data.success) {
        const freshData = res.data.data || res.data.user;
        if (freshData) {
          setProfile({
            _id: freshData._id || freshData.id,
            firstName: freshData.firstName || '',
            lastName: freshData.lastName || '',
            email: freshData.email || '',
            phone: freshData.phone || '',
            role: freshData.role || 'user',
            profileImage: freshData.profileImage || '',
            createdAt: freshData.createdAt || new Date().toISOString(),
            updatedAt: freshData.updatedAt || new Date().toISOString(),
          });
          setFormData({
            firstName: freshData.firstName || '',
            lastName: freshData.lastName || '',
            phone: freshData.phone || '',
          });
        }
      }
    } catch (error: any) {
      console.error('Failed to load profile:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      } else if (!user) {
        toast.error(error.response?.data?.error || 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!formData.firstName || !formData.lastName) {
      toast.error('First name and last name are required');
      return;
    }

    setSaving(true);
    try {
      const res = await adminApi.put('/auth/profile', formData);
      if (res.data.success) {
        const updatedData = res.data.data || res.data.user;
        setProfile({
          _id: updatedData._id || updatedData.id,
          firstName: updatedData.firstName || '',
          lastName: updatedData.lastName || '',
          email: updatedData.email || '',
          phone: updatedData.phone || '',
          role: updatedData.role || 'user',
          profileImage: updatedData.profileImage || profile?.profileImage || '',
          createdAt: updatedData.createdAt || new Date().toISOString(),
          updatedAt: updatedData.updatedAt || new Date().toISOString(),
        });
        setEditing(false);
        toast.success('Profile updated successfully');

        // Let AuthContext re-fetch so the rest of the app (navbar, etc.)
        // picks up the change — no localStorage write needed.
        await refreshUser();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Upload profile image
  const uploadProfileImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    const uploadData = new FormData();
    uploadData.append('image', file);

    try {
      const res = await adminApi.post('/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (res.data.success) {
        const imageUrl = res.data.imageUrl || res.data.url;
        
        // Update profile with new image
        const updateRes = await adminApi.put('/auth/profile-image', { profileImage: imageUrl });
        
        if (updateRes.data.success) {
          setProfile(prev => prev ? { ...prev, profileImage: imageUrl } : null);
          toast.success('Profile picture updated!');
          await refreshUser();
        }
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.error || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Remove profile image
  const removeProfileImage = async () => {
    if (!confirm('Remove your profile picture?')) return;
    
    setUploadingImage(true);
    try {
      const res = await adminApi.put('/auth/profile-image', { profileImage: '' });
      if (res.data.success) {
        setProfile(prev => prev ? { ...prev, profileImage: '' } : null);
        toast.success('Profile picture removed');
        await refreshUser();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to remove image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadProfileImage(file);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await adminApi.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      if (res.data.success) {
        toast.success('Password changed successfully');
        setShowChangePassword(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    // AuthContext's logout() already clears storage, shows a toast, and
    // navigates to the right login page — no need to navigate again here.
    logout();
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, { bg: string; text: string; icon: any }> = {
      admin: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Shield },
      manager: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Building2 },
      waiter: { bg: 'bg-green-100', text: 'text-green-700', icon: User },
      kitchen: { bg: 'bg-orange-100', text: 'text-orange-700', icon: Clock },
      cashier: { bg: 'bg-cyan-100', text: 'text-cyan-700', icon: FileText },
      user: { bg: 'bg-gray-100', text: 'text-gray-700', icon: User },
    };
    const config = colors[role] || colors.user;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        <Icon size={12} /> {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  if ((loading || authLoading) && !profile) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={40} className="animate-spin text-orange-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={48} className="mx-auto text-red-500 mb-3" />
        <p className="text-gray-500">Unable to load profile. Please try again.</p>
        <button 
          onClick={loadProfile}
          className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your personal information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="relative h-24 bg-gradient-to-r from-orange-500 to-red-500" />
            <div className="relative px-6 pb-6">
              <div className="flex justify-center -mt-12 mb-4">
                <div className="relative group">
                  {/* Profile Image */}
                  {profile.profileImage ? (
                    <img
                      src={profile.profileImage}
                      alt={`${profile.firstName} ${profile.lastName}`}
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center border-4 border-white shadow-lg">
                      <span className="text-3xl font-bold text-white">
                        {profile.firstName?.[0]}{profile.lastName?.[0]}
                      </span>
                    </div>
                  )}
                  
                  {/* Edit Image Button Overlay */}
                  <button
                    onClick={handleImageClick}
                    disabled={uploadingImage}
                    className="absolute bottom-0 right-0 p-1.5 bg-orange-500 rounded-full text-white shadow-lg hover:bg-orange-600 transition disabled:opacity-50"
                    title="Change profile picture"
                  >
                    {uploadingImage ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Camera size={14} />
                    )}
                  </button>
                  
                  {/* Remove Image Button (only if image exists) */}
                  {profile.profileImage && (
                    <button
                      onClick={removeProfileImage}
                      disabled={uploadingImage}
                      className="absolute bottom-0 left-0 p-1.5 bg-red-500 rounded-full text-white shadow-lg hover:bg-red-600 transition disabled:opacity-50"
                      title="Remove profile picture"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-800">
                  {profile.firstName} {profile.lastName}
                </h2>
                <div className="mt-2">{getRoleBadge(profile.role)}</div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400">Member since</p>
                  <p className="text-sm font-medium text-gray-600">
                    {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }) : 'Recently'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => setShowChangePassword(true)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition group"
              >
                <span className="flex items-center gap-2 text-sm text-gray-600">
                  <Shield size={16} /> Change Password
                </span>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-orange-500" />
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-red-50 transition group"
              >
                <span className="flex items-center gap-2 text-sm text-red-600">
                  <LogOut size={16} /> Logout
                </span>
                <ChevronRight size={16} className="text-red-400 group-hover:text-red-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Profile Info */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Personal Information</h3>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition"
                >
                  <Edit2 size={14} /> Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(false);
                      if (profile) {
                        setFormData({
                          firstName: profile.firstName,
                          lastName: profile.lastName,
                          phone: profile.phone,
                        });
                      }
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateProfile}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save Changes
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-5">
              {/* Email (Read-only) */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <Mail size={18} className="text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Email Address</p>
                  <p className="text-sm font-medium text-gray-800 mt-1">{profile.email}</p>
                  <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                </div>
              </div>

              {/* First Name */}
              <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition">
                <User size={18} className="text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">First Name</p>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-800 mt-1">{profile.firstName}</p>
                  )}
                </div>
              </div>

              {/* Last Name */}
              <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition">
                <User size={18} className="text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Last Name</p>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-800 mt-1">{profile.lastName}</p>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition">
                <Phone size={18} className="text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Phone Number</p>
                  {editing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-800 mt-1">{profile.phone || 'Not provided'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="text-lg font-semibold">Change Password</h3>
              <button onClick={() => setShowChangePassword(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t bg-gray-50">
              <button
                onClick={() => setShowChangePassword(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {changingPassword ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}