const mongoose = require('mongoose');

const CronJobLogSchema = new mongoose.Schema(
  {
    jobName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['success', 'error'],
      required: true,
    },
    details: {
      type: String,
      default: '',
    },
    executedAt: {
      type: Date,
      default: Date.now,
    },
    vendorsAffected: [
      {
        vendorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Vendor',
        },
        planId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Plan',
        },
        endDate: {
          type: Date,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('CronJobLog', CronJobLogSchema);
