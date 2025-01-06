const mongoose = require('mongoose');

const ActiveReferralSchema = new mongoose.Schema({
    contactNumber: {
        type: String,
        required: true,
        trim: true, // Removes unnecessary spaces
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    state: {
        type: String,
        required: true,
        trim: true,
    },
    isRecharge: {
        type: Boolean,
        default: false, // Default value for the recharge status
    },
    vendor_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Vendor'
    },
    isRegistered: {
        type: Boolean, // Changed to Boolean for clarity
        default: false, // Default value for registration status
    },
}, { timestamps: true }); // Adds createdAt and updatedAt fields automatically

const ActiveReferral = mongoose.model('ActiveReferral', ActiveReferralSchema);

module.exports = ActiveReferral;
