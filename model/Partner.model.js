const mongoose = require('mongoose');

const PartnerSchemaBh = new mongoose.Schema(
    {
        BhId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        vendorIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Vendor',
            },
        ],
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

const BhIdSchema = mongoose.model('BhId', PartnerSchemaBh);
module.exports = BhIdSchema;
