const Enquiry = require('../model/Enquiry.model');

// Create a new enquiry
exports.createEnquiry = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        const newEnquiry = new Enquiry({ name, email, subject, message });
        await newEnquiry.save();
        res.status(201).json({ success: true, data: newEnquiry });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get all enquiries
exports.getAllEnquiries = async (req, res) => {
    try {
        console.log("object")
        const enquiries = await Enquiry.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: enquiries });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get a single enquiry by ID
exports.getEnquiryById = async (req, res) => {
    try {
        const enquiry = await Enquiry.findById(req.params.id);
        if (!enquiry) {
            return res.status(404).json({ success: false, message: 'Enquiry not found' });
        }
        res.status(200).json({ success: true, data: enquiry });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Update an enquiry by ID
exports.updateEnquiry = async (req, res) => {
    try {
        const updatedEnquiry = await Enquiry.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedEnquiry) {
            return res.status(404).json({ success: false, message: 'Enquiry not found' });
        }
        res.status(200).json({ success: true, data: updatedEnquiry });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Delete an enquiry by ID
exports.deleteEnquiry = async (req, res) => {
    try {
        const deletedEnquiry = await Enquiry.findByIdAndDelete(req.params.id);
        if (!deletedEnquiry) {
            return res.status(404).json({ success: false, message: 'Enquiry not found' });
        }
        res.status(200).json({ success: true, message: 'Enquiry deleted' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
