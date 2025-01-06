const Recharge_Model = require('../model/Recharge.model')
const VendorModel = require('../model/vendor')
const PlansModel = require('../model/Member_ships_model')
const SendEmailService = require('../service/SendEmail.Service')
const ActiveReferral_Model = require('../model/activereferal.js');
const cron = require('node-cron');
const CronJobLog = require('../model/CronJobLogSchema.js');
const SendWhatsAppMessage = require('../utils/SendWhatsappMsg.js');

const FIRST_RECHARGE_COMMISONS = 10
const SECOND_RECHARGE_COMMISONS = 2
exports.DoRecharge = async (req, res) => {
    try {
        const vendor = req.user.id._id;
        const { plan_id, trn_no } = req.body;

        if (!plan_id) {
            return res.status(400).json({ message: "Please select a valid plan." });
        }

        if (!trn_no) {
            return res.status(400).json({ message: "Please enter a valid transaction number." });
        }

        const checkVendor = await VendorModel.findById(vendor);
        if (!checkVendor) {
            return res.status(400).json({ message: "Vendor not found." });
        }

        const checkPlanIsValidOrNot = await PlansModel.findById(plan_id);
        if (!checkPlanIsValidOrNot) {
            return res.status(400).json({ message: "Invalid plan." });
        }

        let isFirstRecharge = false;

        if (checkVendor?.payment_id) {
            isFirstRecharge = true;
        }

        // Calculate end date based on validityDays and whatIsThis (unit)
        const whatIsThis = checkPlanIsValidOrNot.whatIsThis;
        let endDate = new Date();

        switch (whatIsThis) {
            case 'Day':
                endDate.setDate(endDate.getDate() + checkPlanIsValidOrNot.validityDays);
                break;
            case 'Month':
                endDate.setMonth(endDate.getMonth() + checkPlanIsValidOrNot.validityDays);
                break;
            case 'Year':
                endDate.setFullYear(endDate.getFullYear() + checkPlanIsValidOrNot.validityDays);
                break;
            case 'Week':
                endDate.setDate(endDate.getDate() + (checkPlanIsValidOrNot.validityDays * 7));
                break;
            default:
                return res.status(400).json({ message: "Invalid validity unit." });
        }

        const rechargeData = new Recharge_Model({
            vendor_id: vendor,
            member_id: plan_id,
            amount: checkPlanIsValidOrNot?.price,
            trn_no: trn_no,
            end_date: endDate
        });

        const find = await ActiveReferral_Model.findOne({ contactNumber: checkVendor.number });
        if (find) {
            if (checkVendor.recharge === 1) {
                find.isRecharge = true;
                await find.save();
            }
        }

        checkVendor.payment_id = rechargeData?._id;
        checkVendor.recharge += 1;
        checkVendor.plan_status = true;
        checkVendor.member_id = checkPlanIsValidOrNot?._id;

        await checkVendor.save();
        await rechargeData.save();

        const emailService = new SendEmailService();
        const emailData = {
            to: process.env.ADMIN_OTHER_EMAIL,
            text: `<div style="font-family: Arial, sans-serif; line-height: 1.5; color: black;">
                    <h2 style="color: red; text-align: center;">Payment Notification</h2>
                    <p>Dear Admin,</p>
                    <p>A new recharge request has been received. Below are the details:</p>
                    <ul style="list-style-type: none; padding: 0;">
                        <li><strong style="color: red;">Transaction No:</strong> ${trn_no}</li>
                        <li><strong style="color: black;">Plan:</strong> ${checkPlanIsValidOrNot?.title}</li>
                        <li><strong style="color: red;">Amount:</strong> ${checkPlanIsValidOrNot?.price}</li>
                        <li><strong style="color: black;">Start Date:</strong> ${new Date().toDateString()}</li>
                        <li><strong style="color: red;">End Date:</strong> ${endDate.toDateString()}</li>
                    </ul>
                    <h3 style="color: black;">Vendor Information:</h3>
                    <ul style="list-style-type: none; padding: 0;">
                        <li><strong style="color: red;">Name:</strong> ${checkVendor.name}</li>
                        <li><strong style="color: black;">Contact:</strong> ${checkVendor.number}</li>
                    </ul>
                    <p style="text-align: center; color: red;">Thank you for your attention!</p>
                </div>`
        };

        emailData.subject = 'Payment Received Notification';
        await emailService.sendEmail(emailData);

        // Vendor WhatsApp Message
        const vendorMessage = `Dear ${checkVendor.name},\n\nYour recharge request has been received successfully!\n\nDetails:\n- Plan: ${checkPlanIsValidOrNot?.title}\n- Amount: ${checkPlanIsValidOrNot?.price}\n- Start Date: ${new Date().toDateString()}\n- End Date: ${endDate.toDateString()}\n\nYour payment will be approved within 30 minutes. Thank you for choosing us!`;

        // Admin WhatsApp Message
        const adminMessage = `Dear Admin,\n\nA new recharge request has been received.\n\nDetails:\n- Transaction No: ${trn_no}\n- Plan: ${checkPlanIsValidOrNot?.title}\n- Amount: ${checkPlanIsValidOrNot?.price}\n- Vendor Name: ${checkVendor.name}\n- Vendor Contact: ${checkVendor.number}\n\nPlease review and approve the payment within 30 minutes.`;

        await SendWhatsAppMessage(vendorMessage, checkVendor.number);
        await SendWhatsAppMessage(adminMessage, process.env.ADMIN_WHATSAPP_NUMBER);

        return res.status(200).json({
            message: "Recharge successful! Your payment will be approved within 30 minutes. Thank you for your patience!",
            rechargeData
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error. Please try again." });
    }
};

exports.getMyRecharges = async (req, res) => {
    try {
        const userId = req.user.id?._id;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required." });
        }

        const rechargeData = await Recharge_Model.find({ vendor_id: userId })
            .populate('member_id')
            .sort({ createdAt: -1 });

        if (!rechargeData.length) {
            return res.status(404).json({ message: "No recharges found for You." });
        }

        return res.status(200).json({
            message: "Recharges fetched successfully.",
            data: rechargeData,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error. Please try again later." });
    }
};

exports.getApprovedRecharge = async (req, res) => {
    try {
        const recharge_id = req.query?._id;

        if (!recharge_id) {
            return res.status(400).json({
                success: false,
                message: "Recharge ID is required.",
            });
        }


        const rechargeData = await Recharge_Model.findById(recharge_id).populate('vendor_id').populate('member_id');
        if (!rechargeData) {
            return res.status(404).json({
                success: false,
                message: "Recharge not found.",
            });
        }

        const vendor = rechargeData.vendor_id;

        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: "Vendor associated with this recharge not found.",
            });
        }

        const parentReferralId = vendor?.parentReferral_id;

        const rechargeVendor = await VendorModel.findById(vendor._id);
        if (!rechargeVendor) {
            return res.status(404).json({
                success: false,
                message: "Vendor who completed the recharge not found.",
            });
        }


        const referringPerson = parentReferralId
            ? await VendorModel.findById(parentReferralId)
            : null;


        let rechargeAmount = rechargeData?.amount || 0;
        if (isNaN(rechargeAmount)) {
            return res.status(400).json({
                success: false,
                message: "Invalid recharge amount.",
            });
        }

        if (referringPerson) {
            referringPerson.wallet = referringPerson.wallet || 0;

            const commission =
                (Number(rechargeAmount) *
                    (rechargeVendor.recharge > 1
                        ? FIRST_RECHARGE_COMMISONS
                        : FIRST_RECHARGE_COMMISONS)) /
                100;
            console.log("commission", commission);
            if (isNaN(commission)) {
                console.error("Calculated commission is not a valid number:", commission);
                return res
                    .status(500)
                    .json({ message: "Error calculating commission." });
            }

            referringPerson.wallet += commission;


            await referringPerson.save();
            console.log("Updated referring person's wallet:", referringPerson.wallet);
        } else {
            console.log("Referring person not found or no parent referral ID.");
        }

        // Process parent referral IDs
        const parentsOfRechargeVendor = await VendorModel.find({
            Child_referral_ids: { $in: [rechargeVendor._id] },
        });

        const commissionPercentage = 2; // 2% commission
        const commissionToParent = (rechargeAmount * commissionPercentage) / 100;

        console.log("referringPerson?._id", referringPerson?._id);

        const updatedParents = []; // Initialize updatedParents array
        const filterOutReferId = parentsOfRechargeVendor.filter(
            (item) => item._id.toString() !== referringPerson?._id.toString()
        );

        console.log(
            "Remaining parent vendor IDs (excluding referring person):",
            filterOutReferId.map((vendor) => vendor._id)
        );


        const top5Parents = filterOutReferId.slice(-5);
        const checkHereStauts = top5Parents.filter((item) => item.plan_status === true)

        for (const parentVendor of checkHereStauts.reverse()) {
            parentVendor.wallet = parentVendor.wallet || 0;
            parentVendor.wallet += commissionToParent;
            await parentVendor.save();
            updatedParents.push(parentVendor);

            console.log(
                `Updated wallet for parent vendor ${parentVendor._id}: ${parentVendor.wallet}`
            );
        }
        rechargeData.payment_approved = true
        rechargeVendor.higherLevel = rechargeData?.member_id?.level
        rechargeVendor.plan_status = true
        const vendorMessage = `Dear ${rechargeVendor.name},\n\nYour recharge has been successfully approved!\n\nDetails:\n- Plan: ${rechargeData?.member_id?.title}\n- Amount: ${rechargeData?.amount}\n- Start Date: ${new Date().toDateString()}\n- End Date: ${rechargeData.end_date.toDateString()}\n\nThank you for choosing us!`;

        await SendWhatsAppMessage(vendorMessage, rechargeVendor.number);
        await rechargeData.save()
        await rechargeVendor.save()

        res.status(200).json({
            success: true,
            message: "Recharge fetched and processed successfully.",
            data: rechargeData,
            referringPerson: referringPerson,
            updatedParents: updatedParents,
        });
    } catch (error) {
        console.error("Error fetching approved recharge:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching the recharge.",
            error: error.message || "Unexpected error occurred.",
        });
    }
};

exports.getAllRecharge = async (req, res) => {
    try {

        const rechargeData = await Recharge_Model.find().populate('member_id').populate('vendor_id').sort({ createdAt: -1 })
        if (!rechargeData) {
            return res.status(400).json({
                success: false,
                message: "No recharge found",
                error: 'No recharge found'
            })
        }
        res.status(200).json({
            success: true,
            message: "Recharge fetched successfully.",
            data: rechargeData
        });
    } catch (error) {
        console.error("Error fetching approved recharge:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching the recharge.",
            error: error.message || "Unexpected error occurred.",
        });
    }
}

exports.getAllOfAnyIdRecharge = async (req, res) => {
    try {
        const id = req.query?.id
        const rechargeData = await Recharge_Model.find({ vendor_id: id }).populate('member_id').populate('vendor_id').sort({ createdAt: -1 })
        if (!rechargeData) {
            return res.status(400).json({
                success: false,
                message: "No recharge found",
                error: 'No recharge found'
            })
        }
        res.status(200).json({
            success: true,
            message: "Recharge fetched successfully.",
            data: rechargeData
        });
    } catch (error) {
        console.error("Error fetching approved recharge:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching the recharge.",
            error: error.message || "Unexpected error occurred.",
        });
    }
}

exports.cancelRecharge = async (req, res) => {
    try {
        const recharge_id = req.query?._id;
        const { cancelReason, isCancelPayment } = req.body;

        if (!recharge_id) {
            return res.status(400).json({
                success: false,
                message: "Recharge ID is required.",
            });
        }

        const rechargeData = await Recharge_Model.findById(recharge_id).populate('vendor_id');
        if (!rechargeData) {
            return res.status(404).json({
                success: false,
                message: "Recharge not found.",
            });
        }

        if (rechargeData.isCancelPayment) {
            return res.status(400).json({
                success: false,
                message: "Recharge is already cancelled.",
                error: "Recharge is already cancelled.",
            });
        }

        if (rechargeData.payment_approved) {
            return res.status(400).json({
                success: false,
                message: "Recharge is already completed.",
                error: "Recharge is already completed.",
            });
        }

        rechargeData.isCancelPayment = isCancelPayment;
        rechargeData.cancelReason = cancelReason;
        await rechargeData.save();

        // Notify vendor about cancellation
        const vendor = rechargeData.vendor_id;
        if (vendor && vendor.number) {
            const cancelMessage = `Dear ${vendor.name}, your recharge with ID ${recharge_id} has been cancelled for the following reason: ${cancelReason}. For more details, please contact support.`;
            await SendWhatsAppMessage(cancelMessage, vendor.number);
        }

        res.json({
            success: true,
            message: "Recharge cancelled successfully and vendor notified.",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Server error. Please try again later.",
            error: error.message,
        });
    }
};

exports.assignFreePlan = async (req, res) => {
    try {
        const { vendor_id, plan_id } = req.body;

        const checkVendor = await Vendor.findById(vendor_id);
        if (!checkVendor) {
            return res.status(404).json({
                success: false,
                message: "Vendor not found.",
                error: "Vendor not found.",
            });
        }

        // Check if plan exists
        const checkPlan = await PlansModel.findById(plan_id);
        if (!checkPlan) {
            return res.status(404).json({
                success: false,
                message: "Plan not found.",
            });
        }

        const whatIsThis = checkPlan.whatIsThis;
        let endDate = new Date();

        // Calculate end date based on plan validity
        switch (whatIsThis) {
            case 'Day':
                endDate.setDate(endDate.getDate() + checkPlan.validityDays);
                break;
            case 'Month':
                endDate.setMonth(endDate.getMonth() + checkPlan.validityDays);
                break;
            case 'Year':
                endDate.setFullYear(endDate.getFullYear() + checkPlan.validityDays);
                break;
            case 'Week':
                endDate.setDate(endDate.getDate() + (checkPlan.validityDays * 7));
                break;
            default:
                return res.status(400).json({ message: "Invalid validity unit." });
        }

        // Create recharge data
        const rechargeData = new Recharge_Model({
            vendor_id: checkVendor._id,
            member_id: checkPlan._id,
            amount: checkPlan.price,
            trn_no: 'FREE-PLAN',
            payment_approved: true,
            payment_approved_date: new Date(),
            end_date: endDate,
        });

        // Save the recharge data to the database
        await rechargeData.save();

        // Update the vendor with the new plan data
        checkVendor.payment_id = rechargeData._id;
        checkVendor.higherLevel = checkPlan.level;
        checkVendor.plan_status = true;
        checkVendor.isFreePlanActive = true
        checkVendor.member_id = checkPlan._id;

        // Save updated vendor data
        await checkVendor.save();

        // Return success response
        return res.status(200).json({
            success: true,
            message: "Plan assigned successfully.",
            vendor: checkVendor,
            rechargeData: rechargeData,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "An error occurred. Please try again.",
            error: error.message,
        });
    }
};


cron.schedule('0 0 * * *', async () => {
    try {
        console.log('Cron job started to check recharge end dates.');

        const expiredRecharges = await Recharge_Model.find({
            end_date: { $lt: new Date() },
        });

        if (expiredRecharges.length === 0) {
            console.log('No expired recharges found.');
            await CronJobLog.create({
                jobName: 'Check Recharge Expiry',
                status: 'success',
                details: 'No expired recharges found.',
            });
            return;
        }

        const vendorsUpdated = [];

        for (const recharge of expiredRecharges) {
            const { vendor_id, member_id, end_date } = recharge;

            // Update the vendor's plan status and end date
            const vendor = await VendorModel.findByIdAndUpdate(
                vendor_id,
                { plan_status: false },
                { new: true }
            );

            if (vendor) {
                // Notify vendor about expiry
                const expiryMessage = `Dear ${vendor.name}, your recharge plan associated with ID ${vendor.myReferral} has expired on ${end_date}. Please renew to continue enjoying the services.`;
                await SendWhatsAppMessage(expiryMessage, vendor.number);

                vendorsUpdated.push({
                    vendorId: vendor_id,
                    planId: member_id,
                    endDate: end_date,
                });

                console.log(`Updated vendor ID ${vendor_id} with plan_status set to false.`);
            }
        }

        // Save the cron job log with affected vendors and their plan IDs
        await CronJobLog.create({
            jobName: 'Check Recharge Expiry',
            status: 'success',
            details: `Processed ${expiredRecharges.length} expired recharges.`,
            vendorsAffected: vendorsUpdated,
        });

        console.log('Cron job completed successfully.');
    } catch (error) {
        console.error('Error during cron job execution:', error);

        // Log the error details
        await CronJobLog.create({
            jobName: 'Check Recharge Expiry',
            status: 'error',
            details: error.message || 'Unknown error occurred.',
        });
    }
});
