// pages/super-admin/SuperAdminUpdateStaff.tsx - COMPLETE FIXED VERSION

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { superAdminApi } from '../../services/api';
import {
  Sparkles, Loader2, User, Phone, Mail,
  ChevronUp, ChevronDown, ArrowLeft, RefreshCw,
  AlertCircle, CheckCircle, Key, Shield, Users,
  UserCog, Eye, Building2, MapPin, Store, Save,
  Trash2, Lock, MoveHorizontal, History, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import moment from 'moment';

// ─── Types ────────────────────────────────────────────────────────────────────
interface IRole {
  _id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
}

interface IRestaurant {
  _id: string;
  name: string;
}

interface IBranch {
  _id: string;
  name: string;
  restaurantId: string;
  code?: string;
}

interface StaffFormData {
  name: string;
  phoneNumber: string;
  email: string;
  role: string;
  status: string;
  restaurantId: string;
  branchId: string;
  canLoginKitchenPortal: boolean;
}

// ─── Design tokens ───────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: '#374151' };
const reqStyle: React.CSSProperties = { color: '#ef4444', marginLeft: 2 };
const errText: React.CSSProperties = { fontSize: 11, color: '#ef4444' };

const inputBase = (err = false): React.CSSProperties => ({
  height: 40, width: '100%', boxSizing: 'border-box',
  border: `1px solid ${err ? '#fca5a5' : '#e5e7eb'}`,
  borderRadius: 8, padding: '0 12px', fontSize: 14,
  background: '#fff', color: '#111827', outline: 'none',
  transition: 'border-color 0.15s', fontFamily: 'inherit',
});

const inputDisabled = (): React.CSSProperties => ({
  ...inputBase(false),
  background: '#f9fafb',
  cursor: 'not-allowed',
  color: '#6b7280',
  borderColor: '#e5e7eb',
});

const selectBase = (err = false): React.CSSProperties => ({
  ...inputBase(err), appearance: 'none', cursor: 'pointer', paddingRight: 32,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
});

// ─── Section Component ────────────────────────────────────────────────────────
function Section({ icon: Icon, iconColor = '#8b5cf6', title, children, defaultOpen = true }: {
  icon: React.ElementType; iconColor?: string; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      <button type="button" onClick={() => setOpen(p => !p)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', background: '#fff', borderBottom: open ? '1px solid #f3f4f6' : 'none', cursor: 'pointer', border: 'none', textAlign: 'left' }}>
        <Icon size={16} color={iconColor} />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', flex: 1 }}>{title}</span>
        {open ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
      </button>
      {open && <div style={{ padding: '20px 20px 24px' }}>{children}</div>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SuperAdminUpdateStaff() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [form, setForm] = useState<StaffFormData>({
    name: '',
    phoneNumber: '',
    email: '',
    role: '',
    status: 'active',
    restaurantId: '',
    branchId: '',
    canLoginKitchenPortal: true,
  });
  const [roles, setRoles] = useState<IRole[]>([]);
  const [restaurants, setRestaurants] = useState<IRestaurant[]>([]);
  const [branches, setBranches] = useState<IBranch[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [staffData, setStaffData] = useState<any>(null);
  
  // Branch Transfer State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [branchHistory, setBranchHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchMasterData();
    fetchStaffDetails();
  }, [id]);

  // ─── Fetch Master Data ──────────────────────────────────────────────────────
  const fetchMasterData = async () => {
    try {
      // Fetch roles
      const rolesResponse = await superAdminApi.get('/roles?isActive=true&limit=100');
      let rolesData: IRole[] = [];
      if (rolesResponse.data?.success) {
        const data = rolesResponse.data.data;
        if (Array.isArray(data)) {
          rolesData = data;
        } else if (data?.roles) {
          rolesData = data.roles;
        }
      }
      if (rolesData.length === 0) {
        rolesData = [
          { _id: 'chef', name: 'chef', description: 'Head Chef', color: '#8B5CF6', icon: 'ChefHat' },
          { _id: 'cook', name: 'cook', description: 'Line Cook', color: '#3B82F6', icon: 'Utensils' },
          { _id: 'helper', name: 'helper', description: 'Kitchen Helper', color: '#6B7280', icon: 'User' },
          { _id: 'section_chef', name: 'section_chef', description: 'Section Chef', color: '#6366F1', icon: 'Shield' },
          { _id: 'kot_staff', name: 'kot_staff', description: 'KOT Staff', color: '#10B981', icon: 'Eye' },
          { _id: 'cashier', name: 'cashier', description: 'Cashier', color: '#F59E0B', icon: 'Wallet' },
          { _id: 'waiter', name: 'waiter', description: 'Waiter', color: '#06B6D4', icon: 'Users' },
        ];
      }
      setRoles(rolesData);

      // Fetch restaurants
      const restaurantsResponse = await superAdminApi.get('/super-admin/restaurants?limit=100');
      let restaurantsData: IRestaurant[] = [];
      if (restaurantsResponse.data?.success) {
        const data = restaurantsResponse.data.data;
        if (data?.restaurants) {
          restaurantsData = data.restaurants;
        } else if (Array.isArray(data)) {
          restaurantsData = data;
        }
      }
      setRestaurants(restaurantsData);
    } catch (error) {
      console.error('Error fetching master data:', error);
      toast.error('Failed to load data');
    }
  };

  // ─── Fetch Staff Details ──────────────────────────────────────────────────
  const fetchStaffDetails = async () => {
    try {
      const response = await superAdminApi.get(`/super-admin/staff/${id}`);
      if (response.data.success) {
        const staff = response.data.data;
        setStaffData(staff);
        setForm({
          name: staff.name || '',
          phoneNumber: staff.phoneNumber || '',
          email: staff.email || '',
          role: staff.role || '',
          status: staff.status || 'active',
          restaurantId: staff.restaurantId || '',
          branchId: staff.branchId || '',
          canLoginKitchenPortal: staff.canLoginKitchenPortal !== false,
        });
        
        // ✅ FIX: Fetch branches for the restaurant directly
        if (staff.restaurantId) {
          await fetchBranchesForRestaurant(staff.restaurantId);
        }
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to load staff details');
      navigate('/super-admin/staff');
    } finally {
      setFetching(false);
    }
  };

  // ─── Fetch Branches for Restaurant ──────────────────────────────────────
  const fetchBranchesForRestaurant = async (restaurantId: string) => {
    try {
      console.log('📋 Fetching branches for restaurant:', restaurantId);
      const response = await superAdminApi.get(`/super-admin/branches?restaurantId=${restaurantId}&limit=100`);
      console.log('📋 Branches response:', response.data);
      
      if (response.data?.success) {
        const branchesData = response.data.data?.branches || [];
        setBranches(branchesData);
        console.log('📋 Branches loaded:', branchesData.length);
      } else {
        setBranches([]);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranches([]);
    }
  };

  // ─── Fetch Branch History ──────────────────────────────────────────────────
  const fetchBranchHistory = async () => {
    try {
      const response = await superAdminApi.get(`/super-admin/staff/${id}/branch-history`);
      if (response.data.success) {
        setBranchHistory(response.data.data.history || []);
      }
    } catch (error) {
      console.error('Error fetching branch history:', error);
      toast.error('Failed to load branch history');
    }
  };

  const upd = <K extends keyof StaffFormData>(key: K, value: StaffFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  // ─── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.phoneNumber.trim()) e.phoneNumber = 'Phone number is required';
    else if (!/^[0-9]{10}$/.test(form.phoneNumber)) e.phoneNumber = 'Please enter a valid 10-digit phone number';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Please enter a valid email address';
    if (!form.role) e.role = 'Role is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Update Staff ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    
    try {
      const payload: any = {
        name: form.name,
        phoneNumber: form.phoneNumber,
        email: form.email || undefined,
        role: form.role,
        status: form.status,
        canLoginKitchenPortal: form.canLoginKitchenPortal,
      };
      
      const response = await superAdminApi.put(`/super-admin/staff/${id}`, payload);
      
      if (response.data.success) {
        toast.success('Staff updated successfully!');
        navigate('/super-admin/staff');
      }
    } catch (error: any) {
      console.error('API Error:', error.response?.data);
      toast.error(error.response?.data?.error || 'Failed to update staff');
    } finally {
      setLoading(false);
    }
  };

  // ─── Delete Staff ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${form.name}? This action cannot be undone.`)) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await superAdminApi.delete(`/super-admin/staff/${id}`);
      if (response.data.success) {
        toast.success('Staff deleted successfully!');
        navigate('/super-admin/staff');
      }
    } catch (error: any) {
      console.error('Delete Error:', error.response?.data);
      toast.error(error.response?.data?.error || 'Failed to delete staff');
    } finally {
      setLoading(false);
    }
  };

  // ─── Handle Branch Transfer ───────────────────────────────────────────────
  const handleBranchTransfer = async (newBranchId: string, reason: string, notes: string) => {
    if (!newBranchId) {
      toast.error('Please select a branch');
      return;
    }
    
    try {
      setLoading(true);
      
      console.log('🔄 Transferring staff to branch:', newBranchId);
      
      const response = await superAdminApi.post(`/super-admin/staff/${id}/transfer-branch`, {
        newBranchId,
        reason,
        notes,
      });
      
      console.log('📥 Transfer response:', response.data);
      
      if (response.data.success) {
        toast.success(response.data.message || 'Branch transferred successfully!');
        await fetchStaffDetails();
        setShowTransferModal(false);
      }
    } catch (error: any) {
      console.error('Branch transfer error:', error);
      toast.error(error.response?.data?.error || 'Failed to transfer branch');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={40} color="#8b5cf6" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const currentBranchName = branches.find(b => b._id === form.branchId)?.name || staffData?.branchName || 'Main Branch';

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus, textarea:focus { border-color: #8b5cf6 !important; box-shadow: 0 0 0 3px rgba(139,92,246,0.12); }
      `}</style>

      {/* Navbar */}
      <div style={{ padding: '0 24px', height: 56, background: 'white', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={() => navigate('/super-admin/staff')}
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
            Back to Staff
          </button>
          
          <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />
          
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
              Update Staff Member
            </h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
              {staffData?.employeeId || 'Editing staff details'}
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 10 }}>
          {staffData?.employeeId && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 16px',
              height: 36,
              borderRadius: 8,
              background: '#f3f0ff',
              border: '1px solid #c4b5fd',
              fontSize: 13,
              fontWeight: 600,
              color: '#7c3aed'
            }}>
              <Key size={15} />
              {staffData.employeeId}
            </div>
          )}
          
          <button
            onClick={handleDelete}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 20px',
              height: 36,
              borderRadius: 8,
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#dc2626',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 24px 40px' }}>

        {errors.submit && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '11px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} color="#dc2626" /> {errors.submit}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Basic Information Section */}
          <Section icon={User} title="Basic Information" iconColor="#8b5cf6">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Full Name <span style={reqStyle}>*</span></label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={e => upd('name', e.target.value)} 
                  placeholder="Enter full name" 
                  style={inputBase(!!errors.name)} 
                />
                {errors.name && <span style={errText}>{errors.name}</span>}
              </div>

              <div>
                <label style={labelStyle}>Phone Number <span style={reqStyle}>*</span></label>
                <input 
                  type="tel" 
                  value={form.phoneNumber} 
                  onChange={e => upd('phoneNumber', e.target.value)} 
                  placeholder="10-digit mobile number" 
                  style={inputBase(!!errors.phoneNumber)} 
                />
                {errors.phoneNumber && <span style={errText}>{errors.phoneNumber}</span>}
              </div>

              <div>
                <label style={labelStyle}>Email Address</label>
                <input 
                  type="email" 
                  value={form.email} 
                  onChange={e => upd('email', e.target.value)} 
                  placeholder="staff@example.com" 
                  style={inputBase(!!errors.email)} 
                />
                {errors.email && <span style={errText}>{errors.email}</span>}
              </div>
            </div>
          </Section>

          {/* Role Assignment Section */}
          <Section icon={Shield} title="Role Assignment" iconColor="#8b5cf6">
            <div>
              <label style={labelStyle}>Select Role <span style={reqStyle}>*</span></label>
              <select 
                value={form.role} 
                onChange={e => upd('role', e.target.value)} 
                style={selectBase(!!errors.role)}
              >
                <option value="">Select a role</option>
                {roles.map(role => (
                  <option key={role._id} value={role.name}>
                    {role.name} {role.description && `- ${role.description}`}
                  </option>
                ))}
              </select>
              {errors.role && <span style={errText}>{errors.role}</span>}
            </div>
          </Section>

          {/* Restaurant & Branch Section */}
          <Section icon={Store} title="Restaurant & Branch" iconColor="#f97316">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ ...labelStyle, color: '#6b7280' }}>
                  Restaurant <Lock size={12} style={{ display: 'inline', marginLeft: 4 }} />
                </label>
                <input 
                  type="text" 
                  value={restaurants.find(r => r._id === form.restaurantId)?.name || staffData?.restaurantName || 'N/A'} 
                  disabled
                  style={inputDisabled()} 
                />
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  Restaurant cannot be changed (Employee ID contains restaurant code)
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={labelStyle}>
                    Branch 
                    <span style={{ fontSize: 11, color: '#8b5cf6', marginLeft: 6 }}>
                      (Can be transferred)
                    </span>
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => {
                        setShowHistoryModal(true);
                        fetchBranchHistory();
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid #e5e7eb',
                        background: '#fff',
                        color: '#6b7280',
                        fontSize: 11,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <History size={13} /> History
                    </button>
                    <button
                      onClick={() => setShowTransferModal(true)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid #8b5cf6',
                        background: '#f5f3ff',
                        color: '#7c3aed',
                        fontSize: 11,
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <MoveHorizontal size={13} /> Transfer
                    </button>
                  </div>
                </div>
                <input 
                  type="text" 
                  value={currentBranchName} 
                  disabled
                  style={inputDisabled()} 
                />
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  {branches.length} branch{branches.length !== 1 ? 'es' : ''} available for this restaurant
                </p>
              </div>
            </div>
          </Section>

          {/* Account Status Section */}
          <Section icon={UserCog} title="Account Status" iconColor="#6b7280">
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="status"
                  value="active"
                  checked={form.status === 'active'}
                  onChange={e => upd('status', e.target.value)}
                  style={{ width: 16, height: 16, accentColor: '#8b5cf6' }}
                />
                <span style={{ fontSize: 14 }}>Active</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="status"
                  value="inactive"
                  checked={form.status === 'inactive'}
                  onChange={e => upd('status', e.target.value)}
                  style={{ width: 16, height: 16, accentColor: '#8b5cf6' }}
                />
                <span style={{ fontSize: 14 }}>Inactive</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="status"
                  value="suspended"
                  checked={form.status === 'suspended'}
                  onChange={e => upd('status', e.target.value)}
                  style={{ width: 16, height: 16, accentColor: '#8b5cf6' }}
                />
                <span style={{ fontSize: 14 }}>Suspended</span>
              </label>
            </div>
          </Section>

          {/* Portal Access Section */}
          <Section icon={Key} title="Portal Access" iconColor="#ef4444">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="checkbox"
                id="portalAccess"
                checked={form.canLoginKitchenPortal}
                onChange={(e) => upd('canLoginKitchenPortal', e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#8b5cf6', cursor: 'pointer' }}
              />
              <label htmlFor="portalAccess" style={{ fontSize: 14, color: '#374151', cursor: 'pointer' }}>
                Allow Staff Portal Access
              </label>
            </div>
          </Section>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 4 }}>
            <button
              onClick={() => navigate('/super-admin/staff')}
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
              disabled={loading}
              style={{ 
                height: 40, 
                padding: '0 28px', 
                borderRadius: 8, 
                border: 'none', 
                background: loading ? '#c4b5fd' : 'linear-gradient(135deg,#8b5cf6,#7c3aed)', 
                color: '#fff', 
                fontSize: 14, 
                fontWeight: 600, 
                cursor: loading ? 'not-allowed' : 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                boxShadow: '0 2px 8px rgba(139,92,246,0.35)'
              }}
            >
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Updating…</> : <><Save size={16} /> Update Staff</>}
            </button>
          </div>

        </div>
      </div>

      {/* ─── Branch Transfer Modal ───────────────────────────────────────── */}
      {showTransferModal && (
        <BranchTransferModal
          staff={staffData}
          branches={branches}
          currentBranchId={form.branchId}
          currentBranchName={currentBranchName}
          onClose={() => setShowTransferModal(false)}
          onTransfer={handleBranchTransfer}
          loading={loading}
        />
      )}

      {/* ─── Branch History Modal ────────────────────────────────────────── */}
      {showHistoryModal && (
        <BranchHistoryModal
          staff={staffData}
          history={branchHistory}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  );
}

// ─── Branch Transfer Modal ──────────────────────────────────────────────
function BranchTransferModal({ 
  staff, 
  branches, 
  currentBranchId, 
  currentBranchName,
  onClose, 
  onTransfer, 
  loading 
}: any) {
  const [selectedBranch, setSelectedBranch] = useState('');
  const [reason, setReason] = useState('other');
  const [notes, setNotes] = useState('');

  const reasons = [
    { value: 'promotion', label: '🚀 Promotion' },
    { value: 'relocation', label: '📍 Relocation' },
    { value: 'staff_shortage', label: '👥 Staff Shortage' },
    { value: 'new_branch', label: '🏗️ New Branch Opening' },
    { value: 'performance', label: '⭐ Performance' },
    { value: 'other', label: '📝 Other' },
  ];

  // ✅ Filter available branches properly
  const availableBranches = branches.filter((b: any) => {
    const branchId = b._id || b.id;
    return branchId !== currentBranchId;
  });

  console.log('🔍 Current branch ID:', currentBranchId);
  console.log('🔍 All branches:', branches);
  console.log('🔍 Available branches:', availableBranches);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Transfer Branch</h2>
            <p className="text-sm text-gray-500">{staff?.name} - {staff?.employeeId}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Branch
            </label>
            <input
              type="text"
              value={currentBranchName || 'Main Branch'}
              disabled
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select New Branch <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select a branch</option>
              {availableBranches.length > 0 ? (
                availableBranches.map((branch: any) => (
                  <option key={branch._id || branch.id} value={branch._id || branch.id}>
                    {branch.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>No other branches available</option>
              )}
            </select>
            {availableBranches.length === 0 && (
              <p className="text-sm text-yellow-600 mt-2">
                ⚠️ No other branches available for transfer.
                {branches.length === 0 && ' No branches found for this restaurant.'}
                {branches.length > 0 && ' Staff is already in the only branch.'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Transfer
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {reasons.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any additional notes about this transfer..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onTransfer(selectedBranch, reason, notes)}
              disabled={!selectedBranch || loading || availableBranches.length === 0}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Transfer Branch'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Branch History Modal ──────────────────────────────────────────────
function BranchHistoryModal({ staff, history, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Branch Transfer History</h2>
            <p className="text-sm text-gray-500">{staff?.name} - {staff?.employeeId}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MoveHorizontal className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>No branch transfer history</p>
              <p className="text-xs text-gray-400 mt-1">Staff has always been in the same branch</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((transfer: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {transfer.transferredToName || transfer.branchName}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                          #{index + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <span className="text-gray-700">From:</span>
                        <span className="font-medium">{transfer.transferredFromName || 'Initial'}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-purple-600 font-medium">To: {transfer.transferredToName || transfer.branchName}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          {transfer.reason || 'Other'}
                        </span>
                        {transfer.notes && (
                          <span className="text-xs text-gray-500">📝 {transfer.notes}</span>
                        )}
                        <span className="text-xs text-gray-400">
                          By: {transfer.transferredByName || 'System'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-xs font-medium text-gray-600">
                        {moment(transfer.transferDate).format('DD MMM YYYY')}
                      </p>
                      <p className="text-xs text-gray-400">
                        {moment(transfer.transferDate).format('hh:mm A')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}