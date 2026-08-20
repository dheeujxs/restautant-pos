import mongoose from 'mongoose';

const kotItemSchema = new mongoose.Schema({
  productId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName:      { type: String, required: true },
  quantity:         { type: Number, required: true, min: 1 },
  variant:          { type: String, default: '' },
  modifiers:        { type: [String], default: [] },
  course:           { type: Number, default: 1 },
  kotStation:       { type: String, default: '' },
  dietaryType:      { type: String, enum: ['Veg','Non-Veg','Vegan','Egg'], default: 'Veg' },
  status:           { type: String, enum: ['pending','cooking','done','voided'], default: 'pending' },
  cookingStartedAt: { type: Date, default: null },
  doneAt:           { type: Date, default: null },
  notes:            { type: String, default: '' },
  prepTimeMinutes:  { type: Number, default: 15 },
}, { _id: true });

const kotSchema = new mongoose.Schema({
  kotNumber:       { type: String, required: true, unique: true, index: true },
  orderId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  orderNumber:     { type: String, required: true },
  orderType:       { type: String, enum: ['dine-in','takeaway','delivery'], required: true },
  tableId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Table', default: null },
  tableNumber:     { type: String, default: '' },
  floorName:       { type: String, default: '' },
  covers:          { type: Number, default: 1 },
  waiterId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  waiterName:      { type: String, default: '' },
  kotStation:      { type: String, enum: ['Main Kitchen','Tandoor','Cold Section','Bar','Dessert','Grill','All'], default: 'Main Kitchen' },
  platform:        { type: String, default: '' },
  deliveryOrderId: { type: String, default: '' },
  riderETA:        { type: Date, default: null },
  items:           { type: [kotItemSchema], required: true },
  status:          { type: String, enum: ['new','acknowledged','preparing','partially_ready','ready','served','cancelled'], default: 'new', index: true },
  priority:        { type: String, enum: ['normal','urgent'], default: 'normal' },
  isReprint:       { type: Boolean, default: false },
  kotPrinted:      { type: Boolean, default: false },
  kotPrintedAt:    { type: Date, default: null },
  allergyAlerts:   { type: [String], default: [] },
  notes:           { type: String, default: '' },
  prepStartedAt:   { type: Date, default: null },
  readyAt:         { type: Date, default: null },
  servedAt:        { type: Date, default: null },
  targetReadyAt:   { type: Date, default: null },
  createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },


  // In KOT model
prepStartedAt: {
  type: Date,
},
prepCompletedAt: {
  type: Date,
},
actualPrepTimeMinutes: {
  type: Number,
  default: 0,
},
  
  // ✅ NEW: Priority score for sorting (higher = more urgent)
  priorityScore:   { type: Number, default: 0, index: true },
  
  // ✅ NEW: VIP flag
  isVip:           { type: Boolean, default: false },
  
  // ✅ NEW: Estimated total prep time
  estimatedTotalPrepTime: { type: Number, default: 0 },
}, { timestamps: true });

// ✅ Pre-save middleware to calculate priorityScore
kotSchema.pre('save', function(next) {
  // Calculate total prep time (max of all items)
  this.estimatedTotalPrepTime = Math.max(
    ...this.items.map(i => i.prepTimeMinutes || 15),
    15
  );
  
  // Calculate priority score
  let score = 0;
  
  if (this.isVip) score += 100;        // VIP highest priority
  if (this.priority === 'urgent') score += 50;  // Urgent orders
  
  // New orders get higher priority (less waiting time)
  if (this.createdAt) {
    const ageInMinutes = (Date.now() - this.createdAt) / 60000;
    if (ageInMinutes < 5) score += 20;  // Fresh orders
  }
  
  // More pending items = higher priority
  const pendingCount = this.items.filter(i => i.status === 'pending').length;
  score += pendingCount * 5;
  
  // Less prep time items get slight boost (faster to complete)
  const avgPrepTime = this.items.reduce((s, i) => s + (i.prepTimeMinutes || 15), 0) / this.items.length;
  if (avgPrepTime < 10) score += 10;
  
  this.priorityScore = score;
  next();
});

kotSchema.virtual('elapsedMinutes').get(function () {
  return Math.floor((Date.now() - this.createdAt) / 60000);
});

kotSchema.virtual('isDelayed').get(function () {
  return this.elapsedMinutes > 20 && !['ready','served','cancelled'].includes(this.status);
});

kotSchema.set('toJSON', { virtuals: true });
kotSchema.set('toObject', { virtuals: true });

export default mongoose.model('KOT', kotSchema);