const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const RechargeSchema = new Schema({
    member_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MembershipPlan',
        required: true
    },
    vendor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true
    },
    start_date: {
        type: Date,
    },
    end_date: {
        type: Date,
    },
    amount: {
        type: Number,
        required: true
    },
    trn_no: {
        type: String,
        required: true
    },
    payment_approved: {
        type: Boolean,
        default: false
    },
    isRechargeEnd: {
        type: Boolean,
    },
    cancelReason:{
        type:String
    },
    payment_approved_date: {
        type: Date,
    },
    isCancelPayment:{
        type:Boolean,
        default:false
    }
},{timestamps:true});

module.exports = mongoose.model('Recharge', RechargeSchema);