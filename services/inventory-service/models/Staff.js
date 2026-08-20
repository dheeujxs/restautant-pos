// models/Staff.js - COMPLETE UPDATED VERSION

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
    },
    employeeId: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    pin: {
      type: Number,
      min: 1000,
      max: 9999,
    },

    // ✅ Restaurant (CANNOT BE CHANGED)
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Restaurant ID is required'],
    },
    restaurantName: {
      type: String,
      required: true,
    },
    restaurantCode: {
      type: String,
      required: true,
      uppercase: true,
      maxlength: 4,
    },
    
    // ✅ Branch (CAN BE CHANGED via transfer)
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    branchName: {
      type: String,
      default: 'All Branches',
    },

    // ✅ Branch Transfer History
    branchTransferHistory: [{
      fromBranchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        default: null,
      },
      fromBranchName: {
        type: String,
        default: 'All Branches',
      },
      toBranchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        default: null,
      },
      toBranchName: {
        type: String,
        default: 'All Branches',
      },
      transferredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
      },
      transferredByName: {
        type: String,
        default: 'System',
      },
      reason: {
        type: String,
        enum: ['promotion', 'relocation', 'staff_shortage', 'new_branch', 'performance', 'other'],
        default: 'other',
      },
      notes: {
        type: String,
        trim: true,
        maxlength: 500,
      },
      transferDate: {
        type: Date,
        default: Date.now,
      },
    }],

    lastBranchTransferAt: {
      type: Date,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    createdByName: {
      type: String,
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
    },
    roles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
    }],
    roleName: {
      type: String,
      trim: true,
    },
    
    // ✅ PERMISSIONS - Custom permissions for this staff member
    permissions: {
      type: [String],
      default: [],
      validate: {
        validator: function(perms) {
          return Array.isArray(perms);
        },
        message: 'Permissions must be an array',
      },
    },
    
    canLoginKitchenPortal: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    profileImage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Compound unique index: employeeId + restaurantId
staffSchema.index({ employeeId: 1, restaurantId: 1 }, { unique: true });
staffSchema.index({ restaurantId: 1, branchId: 1 });
staffSchema.index({ 'branchTransferHistory.transferDate': -1 });

// ✅ Generate restaurant code from name
staffSchema.statics.generateRestaurantCode = function(restaurantName) {
  if (!restaurantName) return 'XX';
  
  const words = restaurantName.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/);
  let code = '';
  
  if (words.length > 0 && words[0].length >= 2) {
    code = words[0].substring(0, 2).toUpperCase();
  } else if (words.length > 0 && words[0].length === 1) {
    code = words[0].charAt(0).toUpperCase() + 'X';
  } else {
    code = 'XX';
  }
  
  while (code.length < 2) {
    code += 'X';
  }
  
  return code;
};

// ✅ Generate restaurant-wise employee ID with restaurant code
staffSchema.statics.generateEmployeeId = async function(restaurantId, restaurantName) {
  const year = new Date().getFullYear();
  const restaurantCode = this.generateRestaurantCode(restaurantName);
  
  const lastStaff = await this.findOne({ restaurantId })
    .sort({ employeeId: -1 })
    .lean();
  
  let nextNumber = 1;
  
  if (lastStaff && lastStaff.employeeId) {
    const parts = lastStaff.employeeId.split('-');
    if (parts.length === 4) {
      const lastNumber = parseInt(parts[3]);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
  }
  
  const paddedNumber = String(nextNumber).padStart(4, '0');
  return `${restaurantCode}-EMP-${year}-${paddedNumber}`;
};

// Hash password before saving
staffSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Hash pin if modified
staffSchema.pre('save', async function (next) {
  if (!this.isModified('pin') || !this.pin) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.pin = await bcrypt.hash(this.pin.toString(), salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
staffSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Compare pin method
staffSchema.methods.comparePin = async function (candidatePin) {
  if (!this.pin) return false;
  return bcrypt.compare(candidatePin.toString(), this.pin);
};

// ✅ Get all roles and combined permissions
staffSchema.methods.getAllRolesAndPermissions = async function() {
  try {
    const Role = mongoose.model('Role');
    let allRoles = [];
    let allPermissions = [];
    let roleIds = [];
    
    // Get permissions from the staff's own permissions field
    if (this.permissions && Array.isArray(this.permissions)) {
      allPermissions = [...this.permissions];
    }
    
    if (this.role) {
      if (typeof this.role === 'object' && this.role._id) {
        roleIds.push(this.role._id.toString());
        if (this.role.name) allRoles.push(this.role.name);
        if (this.role.permissions) {
          allPermissions = [...allPermissions, ...this.role.permissions];
        }
      } else if (typeof this.role === 'string') {
        roleIds.push(this.role);
      } else if (this.role && this.role.toString) {
        roleIds.push(this.role.toString());
      }
    }
    
    if (this.roles && Array.isArray(this.roles) && this.roles.length > 0) {
      this.roles.forEach(role => {
        if (typeof role === 'object' && role._id) {
          roleIds.push(role._id.toString());
          if (role.name) allRoles.push(role.name);
          if (role.permissions) {
            allPermissions = [...allPermissions, ...role.permissions];
          }
        } else if (typeof role === 'string') {
          roleIds.push(role);
        } else if (role && role.toString) {
          roleIds.push(role.toString());
        }
      });
    }
    
    roleIds = [...new Set(roleIds)];
    
    // If we have role IDs, fetch role permissions from database
    if (roleIds.length > 0) {
      const validRoleIds = roleIds.filter(id => {
        return id && typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/);
      });
      
      if (validRoleIds.length > 0) {
        const roles = await Role.find({ _id: { $in: validRoleIds } });
        roles.forEach(role => {
          if (!allRoles.includes(role.name)) allRoles.push(role.name);
          if (role.permissions && Array.isArray(role.permissions)) {
            allPermissions = [...allPermissions, ...role.permissions];
          }
        });
      }
    }
    
    // Deduplicate permissions and roles
    allPermissions = [...new Set(allPermissions)];
    allRoles = [...new Set(allRoles)];
    
    // Sort roles by priority
    const rolePriority = {
      admin: 100,
      manager: 90,
      chef: 80,
      cook: 70,
      section_chef: 65,
      kot_staff: 60,
      cashier: 50,
      waiter: 40,
      helper: 30,
    };
    
    allRoles.sort((a, b) => {
      const priorityA = rolePriority[a.toLowerCase()] || 0;
      const priorityB = rolePriority[b.toLowerCase()] || 0;
      return priorityB - priorityA;
    });
    
    if (allRoles.length === 0) {
      allRoles = ['Staff'];
    }
    
    return { roles: allRoles, permissions: allPermissions };
  } catch (error) {
    console.error('Error getting roles and permissions:', error);
    return { roles: ['Staff'], permissions: [] };
  }
};

const Staff = mongoose.model('Staff', staffSchema);
export default Staff;