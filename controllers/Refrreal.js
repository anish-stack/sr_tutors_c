const ActiveReferral = require('../model/activereferal')
const vendor = require('../model/vendor')

exports.doReffer = async (req, res) => {
    try {
        const userid = req.user?.id?._id
        const { contactNumber, state, name } = req.body

        if (!contactNumber || !state || !name) {
            return res.status(400).json({ message: "Please fill all the fields" })
        }
        const user = await ActiveReferral.findOne({ contactNumber: contactNumber })
        if (user) {
            return res.status(400).json({ message: "You have already referred this number" })
        }

        const checkVendors = await vendor.findOne({ number: contactNumber })
        if(checkVendors){
            return res.status(400).json({ message: "Vendor already exists With This Number" })
        }
        const createActiveReferral = new ActiveReferral({
            contactNumber: contactNumber,
            state: state,
            name: name,
            vendor_id: userid

        })

        await createActiveReferral.save()
        res.status(200).json({ message: "Referral done successfully" })

    } catch (error) {
        console.log(error)
    }
}


exports.getMyReferral = async (req, res) => {
    try {
        const user = req.user?.id?._id

        const referral = await ActiveReferral.find({ vendor_id: user })
        if (referral.length === 0) {
            return res.status(400).json({ message: "No referrals found" })
        }
        res.status(200).json({
            message: "Referrals found successfully",
            success: true,
            data: referral
        })

    } catch (error) {
        console.log(error?.message)
        res.status(501).json({
            message: "Referrals not found ",
            success: false,
            error: error?.message
        })
    }
}

exports.getAllReferal = async(req,res) => {
    try {
        const referral = await ActiveReferral.find().populate('vendor_id').sort({createdAt:-1})
        if (referral.length === 0) {
            return res.status(400).json({ message: "No referrals found" })
        }
        res.status(200).json({
            message: "Referrals found successfully",
            success: true,
            data: referral
        })

    } catch (error) {
        console.log(error?.message)
        res.status(501).json({
            message: "Referrals not found ",
            success: false,
            error: error?.message
        })
    }
}

exports.GetRefrealDetailsBy = async (req, res) => {
    try {
        const { id } = req.query
        console.log(id)
        const details = await vendor.find({ referral_code_which_applied: id })
        if (details.length === 0) {
            return res.status(400).json({ message: "No referrals found" })
        }
        res.status(200).json({
            message: "Referrals found successfully",
            success: true,
            count: details.length || 0,
            data: details
        })
    } catch (error) {
        res.status(501).json({
            message: "Referrals not found ",
            success: false,
            error: error?.message
        })
    }
}

//count commsion and payout

