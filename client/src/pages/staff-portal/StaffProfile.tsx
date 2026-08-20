// pages/staff-portal/StaffProfile.tsx - CLEAN (No localStorage)

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, Calendar, Clock, Key,
  Edit2, Save, X, Loader2, Shield, Building, CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import { staffApi } from '../../services/api';
import { staffStorage } from '../../utils/storage';
import { useAuth } from '../../utils/AuthContext';

interface StaffProfile {
  _id: string;
  name: string;
  email?: string;
  phoneNumber: string;
  employeeId: string;
  role: string;
  roleName?: string;
  permissions: string[];
  canLoginKitchenPortal: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export default function StaffProfile() {
  const navigate = useNavigate();
  const { user, isStaff, refreshUser } = useAuth();
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
  });

  useEffect(() => {
    const staffToken = staffStorage.getToken();
    if (!staffToken || !isStaff) {
      toast.error('Please login again');
      navigate('/staff-portal/login');
      return;
    }
    fetchProfile();
  }, [isStaff]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await staffApi.get('/staff-portal/profile');
      
      if (response.data.success) {
        const data = response.data.data;
        setProfile(data);
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phoneNumber: data.phoneNumber || '',
        });
      } else {
        toast.error(response.data.error || 'Failed to load profile');
      }
    } catch (error: any) {
      console.error('❌ Error fetching profile:', error);
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        staffStorage.clear();
        navigate('/staff-portal/login');
      } else {
        toast.error(error.response?.data?.error || 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await staffApi.patch('/staff-portal/profile', formData);
      
      if (response.data.success) {
        toast.success('Profile updated successfully!');
        setProfile(response.data.data);
        await refreshUser(); // Refresh AuthContext
        setEditing(false);
      } else {
        toast.error(response.data.error || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getRoleName = (role: any): string => {
    if (!role) return 'Staff';
    if (typeof role === 'string') return role;
    if (role && typeof role === 'object' && typeof role.name === 'string') return role.name;
    return 'Staff';
  };

  const getRoleBadge = (role: any) => {
    const roleName = getRoleName(role);
    const colors: Record<string, string> = {
      chef: 'bg-orange-100 text-orange-700 border-orange-200',
      cook: 'bg-purple-100 text-purple-700 border-purple-200',
      waiter: 'bg-blue-100 text-blue-700 border-blue-200',
      cashier: 'bg-green-100 text-green-700 border-green-200',
      manager: 'bg-red-100 text-red-700 border-red-200',
      admin: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[roleName?.toLowerCase()] || 'bg-gray-100 text-gray-700';
  };

  const getRoleIcon = (role: any) => {
    const roleName = getRoleName(role);
    const icons: Record<string, string> = {
      chef: '👨‍🍳',
      cook: '🍳',
      waiter: '👨‍💼',
      cashier: '💰',
      manager: '👔',
      admin: '👑',
    };
    return icons[roleName?.toLowerCase()] || '👤';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (name: string) => {
    if (!name) return 'S';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Unable to load profile</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchProfile();
            }}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const displayRole = getRoleName(profile.role);

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <User size={24} className="text-orange-500" />
              My Profile
            </h1>
            <p className="text-gray-500 text-sm mt-1">Manage your personal information</p>
          </div>
          <div className="flex gap-2">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition"
              >
                <Edit2 size={16} /> Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                >
                  <X size={16} /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 border-b border-gray-100">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center text-white text-3xl font-bold">
                {getInitials(profile.name)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold text-gray-800">{profile.name}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadge(profile.role)} flex items-center gap-1`}>
                    {getRoleIcon(profile.role)} {displayRole}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    profile.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {profile.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Employee ID: {profile.employeeId}</p>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Personal Information</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User size={18} className="text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-400">Full Name</p>
                      {editing ? (
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                        />
                      ) : (
                        <p className="font-medium text-gray-800">{profile.name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail size={18} className="text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-400">Email</p>
                      {editing ? (
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                          placeholder="Enter email"
                        />
                      ) : (
                        <p className="font-medium text-gray-800">{profile.email || 'Not provided'}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone size={18} className="text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-400">Phone Number</p>
                      {editing ? (
                        <input
                          type="tel"
                          value={formData.phoneNumber}
                          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                        />
                      ) : (
                        <p className="font-medium text-gray-800">{profile.phoneNumber}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Work Information</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Building size={18} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400">Role</p>
                      <p className="font-medium text-gray-800 capitalize">{displayRole}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield size={18} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400">Permissions</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {profile.permissions && profile.permissions.slice(0, 5).map((perm, idx) => (
                          <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {perm.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {profile.permissions && profile.permissions.length > 5 && (
                          <span className="text-xs text-gray-400">+{profile.permissions.length - 5} more</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar size={18} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400">Joined</p>
                      <p className="font-medium text-gray-800">{formatDate(profile.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock size={18} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400">Last Updated</p>
                      <p className="font-medium text-gray-800">{formatDate(profile.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Account Access</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Key size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Kitchen Portal Access</p>
                    <p className="font-medium text-gray-800">
                      {profile.canLoginKitchenPortal ? '✅ Enabled' : '❌ Disabled'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <CreditCard size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Account Status</p>
                    <p className={`font-medium ${profile.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                      {profile.status === 'active' ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}