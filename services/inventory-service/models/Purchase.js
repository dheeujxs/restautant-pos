import mongoose from "mongoose";

const purchaseItemSchema = new mongoose.Schema(
  {
    ingredientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ingredient",
      required: true
    },
    ingredientName: { type: String, required: true },
    quantity: {
      type: Number,
      required: true,
      min: 0.001
    },
    unit: {
      type: String,
      required: true
    },
    costPrice: {
      type: Number,
      required: true,
      min: 0
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: true }
);

const purchaseSchema = new mongoose.Schema(
  {
    purchaseNumber: { type: String, unique: true, sparse: true },

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true
    },
    supplierName: { type: String, default: "" },

    purchaseDate: { type: Date, default: Date.now },

    invoiceNumber: { type: String, default: "" },

    items: [purchaseItemSchema],

    totalAmount: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ["pending", "received", "cancelled"],
      default: "pending"
    },

    paymentStatus: {
      type: String,
      enum: ["paid", "unpaid", "partial"],
      default: "unpaid"
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "credit", "bank"],
      default: "cash"
    },

    notes: { type: String, default: "" },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    
    receivedAt: { type: Date, default: null },
    receivedBy: { type: String, default: "" }
  },
  { timestamps: true }
);

// Generate purchase number before saving
purchaseSchema.pre('save', async function(next) {
  if (!this.purchaseNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const count = await mongoose.model('Purchase').countDocuments() + 1;
    this.purchaseNumber = `PO-${year}${month}-${count.toString().padStart(4, '0')}`;
  }
  next();
});

purchaseSchema.index({
  purchaseNumber: "text",
  invoiceNumber: "text",
  supplierName: "text"
});

export default mongoose.model("Purchase", purchaseSchema);