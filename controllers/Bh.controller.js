const BhModel = require('../model/Partner.model');
const crypto = require('crypto');
const vendor = require('../model/vendor');

function generateBhId() {
    const randomNum = crypto.randomInt(100000, 999999);
    return `BH${randomNum}`;
}

// Create BH ID
exports.createBhId = async (req, res) => {
    try {
        const newBhId = generateBhId();

        // Save to the database
        const newBhRecord = new BhModel({
            BhId: newBhId,
        });

        await newBhRecord.save();

        res.status(201).json({
            success: true,
            message: 'BH ID created successfully',
            data: newBhRecord,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating BH ID',
            error: error.message,
        });
    }
};

// Update BH ID
exports.updateBhId = async (req, res) => {
    try {
        const { id } = req.params; // ID from request parameters
        const updateData = req.body; // Data to update

        const updatedRecord = await BhModel.findByIdAndUpdate(id, updateData, {
            new: true, // Return the updated document
        });

        if (!updatedRecord) {
            return res.status(404).json({
                success: false,
                message: 'BH ID not found',
            });
        }

        res.status(200).json({
            success: true,
            message: 'BH ID updated successfully',
            data: updatedRecord,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating BH ID',
            error: error.message,
        });
    }
};

// Delete BH ID
exports.deleteBhId = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedRecord = await BhModel.findByIdAndDelete(id);

        if (!deletedRecord) {
            return res.status(404).json({
                success: false,
                message: 'BH ID not found',
            });
        }

        res.status(200).json({
            success: true,
            message: 'BH ID deleted successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting BH ID',
            error: error.message,
        });
    }
};

// Toggle Status
exports.toggleStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const record = await BhModel.findById(id);

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'BH ID not found',
            });
        }

        // Toggle the `status` field
        record.status = !record.status;
        await record.save();

        res.status(200).json({
            success: true,
            message: 'BH status toggled successfully',
            data: record,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error toggling status',
            error: error.message,
        });
    }
};


exports.checkBhId = async (req, res) => {
    try {
        const { bh } = req.body;
        // Check if BH ID exists
        const bhId = await BhModel.findOne({ BhId: bh });
        if (!bhId) {
            return res.status(404).json({
                success: false,
                message: 'BH ID not found',
            });
        }

        // Check if BH ID is active
        if (bhId.isActive) {
           
            const findDetails = await vendor.findOne({ myReferral: bhId.BhId })

            if (findDetails.isActive === false) {
                return res.status(200).json({
                    success: false,
                    message: 'This BH ID has been blocked by the admin due to suspicious activity. Please contact support for assistance.',
                });
            }
            
            if (findDetails) {
                return res.status(200).json({
                    success: true,
                    message: `BH ID found With Name ${findDetails.name} and is active`,
                    data: findDetails.name,
                });
            }else{
                return res.status(200).json({
                    success: false,
                    message: 'BH ID is not active',
                });
            }

        } else {
            return res.status(200).json({
                success: false,
                message: 'BH ID is not active',
            });
        }
    } catch (error) {
        // Handle unexpected errors
        return res.status(500).json({
            success: false,
            message: 'An error occurred while checking BH ID',
            error: error.message,
        });
    }
};
