const MembershipPlan = require('../model/Member_ships_model');

// Create a new membership plan
exports.createMembershipPlan = async (req, res) => {
    try {
        const { title, price, description,validityDays, level, includes,whatIsThis, active } = req.body;

        if (!title || !price || !level || !includes) {
            return res.status(400).json({ success: false, message: 'Title, price, level, and includes are required' });
        }

        const plan = await MembershipPlan.create({ title,validityDays,whatIsThis, price, description, level, includes, active });
        res.status(201).json({ success: true, message: 'Membership plan created successfully', data: plan });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create membership plan', error: error.message });
    }
};

// Get all membership plans
exports.getAllMembershipPlans = async (req, res) => {
    try {
        const plans = await MembershipPlan.find();
        res.status(200).json({ success: true, data: plans });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch membership plans', error: error.message });
    }
};

// Get a single membership plan by ID
exports.getMembershipPlanById = async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await MembershipPlan.findById(id);

        if (!plan) {
            return res.status(404).json({ success: false, message: 'Membership plan not found' });
        }

        res.status(200).json({ success: true, data: plan });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch membership plan', error: error.message });
    }
};

// Update a membership plan by ID
exports.updateMembershipPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, price, description, level, includes, active } = req.body;

        const updatedPlan = await MembershipPlan.findByIdAndUpdate(
            id,
            { title, price, description, level, includes, active },
            { new: true, runValidators: true }
        );

        if (!updatedPlan) {
            return res.status(404).json({ success: false, message: 'Membership plan not found' });
        }

        res.status(200).json({ success: true, message: 'Membership plan updated successfully', data: updatedPlan });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update membership plan', error: error.message });
    }
};

// Delete a membership plan by ID
exports.deleteMembershipPlan = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedPlan = await MembershipPlan.findByIdAndDelete(id);

        if (!deletedPlan) {
            return res.status(404).json({ success: false, message: 'Membership plan not found' });
        }

        res.status(200).json({ success: true, message: 'Membership plan deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete membership plan', error: error.message });
    }
};

exports.updateMembershipStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { active } = req.body;
        const updatedCategory = await MembershipPlan.findById(id);
        if (!updatedCategory) {
            return res.status(404).json({
                success: false,
                message: 'Membership is not found',
                error: 'Membership is not found'
            })
        }
        updatedCategory.active = active;
        await updatedCategory.save();
        console.log("object",updatedCategory)
        res.status(200).json({
            success: true,
            message: 'Membership status updated successfully',
            data: updatedCategory
        })
    } catch (error) {
        console.log("Internal server error", error)
        res.status(500).json({
            success: false,
            message: 'Failed to update membership toggle',
            error: error.message
        })
    }
}