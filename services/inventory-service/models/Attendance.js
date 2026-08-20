// models/Attendance.js - ✅ CORRECT - Model only
import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    staffName: {
      type: String,
      required: true,
    },
    employeeId: {
      type: String,
      required: true,
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
    },
    punchIn: {
      time: {
        type: Date,
        required: true,
      },
      location: {
        type: String,
        default: '',
      },
      notes: {
        type: String,
        default: '',
      },
    },
    punchOut: {
      time: Date,
      location: String,
      notes: String,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
    },
    approvedByName: String,
    approvedAt: Date,
    rejectionReason: String,
    totalHours: {
      type: Number,
      default: 0,
    },
    overtime: {
      type: Number,
      default: 0,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    lateMinutes: {
      type: Number,
      default: 0,
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate entries per staff per day
attendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });

// Calculate total hours before saving
attendanceSchema.pre('save', function(next) {
  if (this.punchIn.time && this.punchOut?.time) {
    const diff = this.punchOut.time.getTime() - this.punchIn.time.getTime();
    this.totalHours = Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
    
    // Calculate overtime (if working hours > 8)
    if (this.totalHours > 8) {
      this.overtime = Math.round((this.totalHours - 8) * 100) / 100;
    }
  }
  next();
});

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;