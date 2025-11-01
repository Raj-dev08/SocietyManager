import mongoose from "mongoose";

const billSchema = new mongoose.Schema(
  {
    houseNo: { 
      type: String, 
      required: true // matches flat.houseNo
    },
    societyId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Societies",
      required: true
    },
    amount: { 
        type: Number,
        required: true 
    },
    dueDate: {
        type: Date, 
        required: true 
    },
    paid: { 
        type: Boolean, 
        default: false
    },
    paidBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },
    userIdForPayment: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },
    paymentDate: { 
        type: Date 
    },
    description: { 
        type: String,
        required: true
    } // e.g., "Maintenance November 2025"
  },
  { timestamps: true }
);

const Bills = mongoose.model("Bills", billSchema);

export default Bills;
