const Withdraw = require('../model/Withdraw.history.model'); // Import the Withdraw model
const Vendor = require('../model/vendor');
const SendWhatsAppMessage = require('../utils/SendWhatsappMsg.js');


exports.createWithdrawal = async (req, res) => {
    try {
        const userId = req.user.id;

        const { amount, method, BankDetails, upi_details } = req.body;
        console.log('Request Body:', req.body);

        // Validate request fields
        if (!amount || !method) {
            return res.status(400).json({ success: false, message: 'Amount and method are required.' });
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Amount must be a valid positive number.' });
        }
        console.log(parsedAmount);

        if (!['Bank Transfer', 'UPI'].includes(method)) {
            return res.status(400).json({ success: false, message: 'Invalid withdrawal method. Choose Bank Transfer or UPI.' });
        }

        // Fetch vendor details
        const vendor = await Vendor.findById(userId);
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found.' });
        }

        // Validate amount against vendor's wallet balance
        if (parsedAmount > vendor.wallet) {
            return res.status(400).json({ success: false, message: 'Insufficient wallet balance.' });
        }

        // Validate method-specific details
        if (method === 'Bank Transfer' && (!BankDetails || !BankDetails.accountNo || !BankDetails.ifsc_code || !BankDetails.bankName)) {
            return res.status(400).json({ success: false, message: 'Complete bank details are required for Bank Transfer.' });
        }

        if (method === 'UPI' && (!upi_details || !upi_details.upi_id)) {
            return res.status(400).json({ success: false, message: 'Valid UPI details are required for UPI withdrawal.' });
        }

        // Deduct the amount from vendor's wallet
        vendor.wallet -= parsedAmount;

        // Create withdrawal request
        const newWithdrawal = new Withdraw({
            vendor_id: userId,
            amount: parsedAmount,
            method,
            BankDetails: method === 'Bank Transfer' ? BankDetails : undefined,
            upi_details: method === 'UPI' ? upi_details : undefined,
            status: 'Pending', // Default status is 'Pending'
        });

        // Save vendor and withdrawal updates
        await vendor.save();
        await newWithdrawal.save();

        // Send notification to the vendor
        const vendorMessage = `Dear ${vendor.name}, your withdrawal request of ₹${parsedAmount.toFixed(2)} via ${method} has been successfully submitted. Your request is currently under review, and the status is pending. Please wait while we process your request.`;
        await SendWhatsAppMessage(vendorMessage, vendor.number);

        // Send notification to the admin
        const adminMessage = `Admin Alert: A new withdrawal request of ₹${parsedAmount.toFixed(2)} has been created by vendor ${vendor.name} (${vendor.number}) using ${method}. Please review and process it.`;
        const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
        if (adminNumber) {
            await SendWhatsAppMessage(adminMessage, adminNumber);
        }

        res.status(201).json({
            success: true,
            message: 'Withdrawal request created successfully. Notifications sent to vendor and admin.',
            withdrawal: newWithdrawal,
        });
    } catch (error) {
        console.error('Error creating withdrawal:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};




exports.approveWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { trn_no, time_of_payment_done } = req.body;

        const withdrawal = await Withdraw.findById(id).populate('vendor_id');
        if (!withdrawal) {
            return res.status(404).json({ success: false, message: 'Withdrawal not found.' });
        }

        // Ensure withdrawal is in a valid state for approval
        if (withdrawal.status !== 'Pending') {
            return res.status(400).json({ success: false, message: 'Only pending withdrawals can be approved.' });
        }

        // Check if the vendor has enough balance in the wallet
        if (withdrawal.vendor_id.wallet < withdrawal.amount) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient wallet balance for this withdrawal.'
            });
        }

        // Update withdrawal status and vendor wallet
        withdrawal.status = 'Approved';
        withdrawal.trn_no = trn_no;
        withdrawal.time_of_payment_done = time_of_payment_done || new Date();
        withdrawal.vendor_id.wallet -= withdrawal.amount;

        // Save withdrawal and vendor updates
        await withdrawal.vendor_id.save(); // Save vendor wallet update
        await withdrawal.save(); // Save withdrawal status update

        // Send WhatsApp notification to the vendor
        const vendorMessage = `Dear ${withdrawal.vendor_id.name}, your withdrawal request of ₹${withdrawal.amount.toFixed(2)} via ${withdrawal.method} has been approved successfully. Transaction No: ${trn_no}. Please wait for further updates.`;
        await SendWhatsAppMessage(vendorMessage, withdrawal.vendor_id.number);

        // Send WhatsApp notification to the admin
        const adminMessage = `A withdrawal request of ₹${withdrawal.amount.toFixed(2)} from vendor ${withdrawal.vendor_id.name} has been approved. Transaction No: ${trn_no}.`;
        const adminNumber = 'ADMIN_PHONE_NUMBER';
        await SendWhatsAppMessage(adminMessage, adminNumber);

        res.status(200).json({
            success: true,
            message: 'Withdrawal approved successfully.',
            withdrawal,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};



exports.rejectWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { cancelReason } = req.body;

        // Find the withdrawal request by ID
        const withdrawal = await Withdraw.findById(id).populate('vendor_id');
        if (!withdrawal) {
            return res.status(404).json({ success: false, message: 'Withdrawal not found.' });
        }

        // Check if the withdrawal status is 'Pending'
        if (withdrawal.status !== 'Pending') {
            return res.status(400).json({ success: false, message: 'Only pending withdrawals can be rejected.' });
        }

        // Revert the amount back to the vendor's wallet
        const vendor = withdrawal.vendor_id;
        if (vendor) {
            vendor.wallet += withdrawal.amount;
            await vendor.save();
        }

        // Update withdrawal status and add cancel reason
        withdrawal.status = 'Rejected';
        withdrawal.cancelReason = cancelReason;

        await withdrawal.save();

        res.status(200).json({
            success: true,
            message: 'Withdrawal rejected successfully, and the amount has been reverted to the vendor\'s wallet.',
            withdrawal,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};


exports.cancelWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { cancelReason } = req.body;

        // Find the withdrawal request by ID
        const withdrawal = await Withdraw.findById(id).populate('vendor_id');
        if (!withdrawal) {
            return res.status(404).json({ success: false, message: 'The requested withdrawal could not be found.' });
        }

        // Check if the withdrawal status is 'Pending'
        if (withdrawal.status !== 'Pending') {
            return res.status(400).json({
                success: false,
                message: 'This withdrawal request is already processed and cannot be cancelled.'
            });
        }

        // Revert the amount back to the vendor's wallet
        const vendor = withdrawal.vendor_id;
        if (vendor) {
            vendor.wallet += withdrawal.amount;
            await vendor.save();
        }

        // Update withdrawal status and add cancel reason
        withdrawal.status = 'Cancelled';
        withdrawal.cancelReason = cancelReason;

        await withdrawal.save();

        res.status(200).json({
            success: true,
            message: `The withdrawal request has been successfully cancelled. ${withdrawal.amount} has been added back to your wallet.`,
            withdrawal,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'An unexpected error occurred while cancelling the withdrawal request. Please try again later.'
        });
    }
};


exports.cancelWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { cancelReason } = req.body;

        // Find the withdrawal request by ID
        const withdrawal = await Withdraw.findById(id).populate('vendor_id');
        if (!withdrawal) {
            return res.status(404).json({ success: false, message: 'The requested withdrawal could not be found.' });
        }

        // Check if the withdrawal status is 'Pending'
        if (withdrawal.status !== 'Pending') {
            return res.status(400).json({
                success: false,
                message: 'This withdrawal request is already processed and cannot be cancelled.'
            });
        }

        // Revert the amount back to the vendor's wallet
        const vendor = withdrawal.vendor_id;
        if (vendor) {
            vendor.wallet += withdrawal.amount;
            await vendor.save();
        }

        // Update withdrawal status and add cancel reason
        withdrawal.status = 'Cancelled';
        withdrawal.cancelReason = cancelReason;

        await withdrawal.save();

        res.status(200).json({
            success: true,
            message: `The withdrawal request has been successfully cancelled. ${withdrawal.amount} has been added back to your wallet.`,
            withdrawal,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'An unexpected error occurred while cancelling the withdrawal request. Please try again later.'
        });
    }
};


exports.getAllWithdrawals = async (req, res) => {
    try {
        const { status } = req.query; // Optional filter by status

        const query = status ? { status } : {};
        const withdrawals = await Withdraw.find(query).populate('vendor_id', 'name email myReferral').sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: 'Withdrawals fetched successfully.',
            withdrawals,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};


exports.getWithdrawalById = async (req, res) => {
    try {
        const user = req.user.id._id

        const withdrawal = await Withdraw.find({ vendor_id: user })
            .populate('vendor_id')
            .sort({ createdAt: -1 });


        // If withdrawal is not found
        if (!withdrawal) {
            return res.status(404).json({ success: false, message: 'Withdrawal not found.' });
        }

        res.status(200).json({
            success: true,
            message: 'Withdrawal details fetched successfully.',
            withdrawal,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};


exports.getPendingWithdrawals = async (req, res) => {
    try {
        // Find all withdrawals with status 'Pending'
        const pendingWithdrawals = await Withdraw.find({ status: 'Pending' }).populate('vendor_id');

        if (!pendingWithdrawals || pendingWithdrawals.length === 0) {
            return res.status(404).json({ success: false, message: 'No pending withdrawals found.' });
        }

        res.status(200).json({
            success: true,
            message: 'Pending withdrawal requests fetched successfully.',
            withdrawals: pendingWithdrawals,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error while fetching pending withdrawals.' });
    }
};



exports.getWithdrawalQueryById = async (req, res) => {
    try {
        const user = req.query.id

        const withdrawal = await Withdraw.find({ vendor_id: user })
            .populate('vendor_id')
            .sort({ createdAt: -1 });


        // If withdrawal is not found
        if (!withdrawal) {
            return res.status(404).json({ success: false, message: 'Withdrawal not found.' });
        }

        res.status(200).json({
            success: true,
            message: 'Withdrawal details fetched successfully.',
            withdrawal,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};