const mongoose = require('mongoose');

const MembershipPlanSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    description: {},
    level: {
        type: Number,
        required: true
    },
    includes: {
        type: [String],
        required: true
    },
    validityDays: {
        type: Number,
    },
    whatIsThis:{
        type:String,
    },
    active: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('MembershipPlan', MembershipPlanSchema);