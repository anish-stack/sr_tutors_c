const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    number: {
        type: Number,
        required: [true, 'Number rating is required'],
    },
    text: {
        type: String,
        required: [true, 'Review text is required'],
        trim: true
    },
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: [true, 'Vendor ID is required']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
