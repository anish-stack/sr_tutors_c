const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },
    icon: {
        type: String,
        required: [true, 'Icon is required']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);