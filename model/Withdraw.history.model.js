const mongoose = require('mongoose');

const WithdrawSchema = new mongoose.Schema(
    {
        vendor_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            required: true, // Ensure the vendor_id is always provided
        },
        amount: {
            type: Number,
            required: true, // Ensure amount is provided
            min: 0, // Amount cannot be negative
        },
        method: {
            type: String,
            enum: ['Bank Transfer', 'UPI', 'Other'], // Restrict to specific methods
            required: true, // Ensure method is provided
        },
        BankDetails: {
            accountNo: {
                type: String,
                required: function () {
                    return this.method === 'Bank Transfer';
                }, // Only required if method is 'Bank Transfer'
            },
            ifsc_code: {
                type: String,
                required: function () {
                    return this.method === 'Bank Transfer';
                }, // Only required if method is 'Bank Transfer'
            },
            bankName: {
                type: String,
                required: function () {
                    return this.method === 'Bank Transfer';
                }, // Only required if method is 'Bank Transfer'
            },
        },
        upi_details: {
            upi_id: {
                type: String,
                required: function () {
                    return this.method === 'UPI';
                }, // Only required if method is 'UPI'
            },
        },
        status: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'], // Restrict status to specific values
            default: 'Pending', // Default status
        },
        cancelReason: {
            type: String,
        },
        trn_no: {
            type: String,
        },
        remark:{
            type: String,
        },
        time_of_payment_done: {
            type: Date,
        },
        requestedAt: {
            type: Date,
            default: Date.now, 
        },
        
        remarks: {
            type: String, // Additional remarks about the transaction
        },
    },
    { timestamps: true } // Automatically add createdAt and updatedAt fields
);

module.exports = mongoose.model('Withdraw', WithdrawSchema);
