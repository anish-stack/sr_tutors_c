const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Define Vendor Schema
const vendorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    bhId: {
        type: String,
    },
    isManually: {
        type: Boolean,
        default: false
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    number: {
        type: String,
        // required: [true, 'Phone Number is required'],
        // match: [/^\d{10}$/, 'Please provide a valid 10-digit phone number']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long']
    },
    isFreePlanActive: {
        type: Boolean,
        default: false
    },
    temp_password: {
        type: String
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
    },
    address: {
        area: {
            type: String,

        },
        street_address: {
            type: String,

        },
        landmark: {
            type: String,

        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number],
                default: [0, 0]
            }
        },
        pincode: {
            type: String,

        }
    },
    workMode: {
        type: Boolean,
        default: false
    },
    isShownToUser: {
        type: Boolean,
        default: false
    },
    order_id: {
        type: String,
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    payment_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recharge',
    },
    isActive: {
        type: Boolean,
        default: false
    },
    plan_status: {
        type: Boolean,
        default: false
    },
    member_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MembershipPlan',
    },
    parentReferral_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
    },
    isCopy: {
        type: Boolean,
        default: false
    },
    copyParentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
    },
    Child_referral_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        default: []
    }],
    Level1: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
    }],
    Level2: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
    }],
    Level3: [{

        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
    }],
    Level4: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
    }],
    Level5: [{
        type: mongoose.Schema.Types.ObjectId,

        ref: 'Vendor',
    }],
    Level6: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
    }],
    Level7: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
    }],
    is_referral_applied: {
        type: Boolean,
        default: false
    },
    myReferral: {
        type: String,
        default: null
    },
    referral_code_which_applied: {
        type: String
    },
    my_referral_id: {
        type: String
    },
    level_id: {
        type: Number,
        default: 0
    },
    recharge: {
        type: Number,
        default: 0
    },
    otp_: {
        type: String,
        default: null
    },
    otp_expire_time: {
        type: Date,
        default: null
    },
    password_otp: {
        type: String,
        default: null
    },
    password_otp_expire: {
        type: Date,
        default: null
    },
    partner_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
        ref: 'partner',
    },

    is_top_member: {
        type: Boolean,
        default: false
    },
    VehicleNumber: {
        type: String,
        default: null
    },
    Documents: {
        documentFirst: {
            image: {
                type: String,
                default: 'https://placehold.co/600x400?text=Aadhaar+Front'
            },
            public_id: {
                type: String,

            }
        },
        documentSecond: {
            image: {
                type: String,
                default: 'https://placehold.co/600x400?text=Aadhaar+back'
            },
            public_id: {
                type: String,

            }
        },
        documentThird: {
            image: {
                type: String,
                default: 'https://placehold.co/600x400?text=pancard'
            },
            public_id: {
                type: String,
                default: 'https://placehold.co/600x400?text=pancard'

            }
        }

    },
    dob: {
        type: Date,
        default:new Date()
    },
    higherLevel: {
        type: Number
    },
    documentVerify: {
        type: Boolean,
    },
    wallet: {
        type: Number,
        default: 0
    },

    aadharNumber: {
        type: String,
    },
    panNumber: {
        type: String,
    },
    Profile_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Profile',
    },
    review: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Review',
        default: []
    }
}, { timestamps: true });

vendorSchema.index({ 'address.location': '2dsphere' });
vendorSchema.index({ number: 1 });


vendorSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

vendorSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Vendor', vendorSchema);
