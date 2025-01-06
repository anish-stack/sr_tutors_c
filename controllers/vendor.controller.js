const Vendor_Model = require('../model/vendor.js');
const ActiveReferral_Model = require('../model/activereferal.js');
const UploadService = require('../service/cloudinary.service.js');
const OtpService = require('../service/Otp_Send.Service.js');
const SendEmailService = require('../service/SendEmail.Service.js');
const crypto = require('crypto');
const sendToken = require('../utils/SendToken.js');
const BhIdSchema = require('../model/Partner.model.js');
const SendWhatsAppMessage = require('../utils/SendWhatsappMsg.js');
const Bull = require('bull');
// Register a vendor and send a verification email

// const fileUploadQueue = new Bull('file-upload-queue', {
//     redis: { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT },
// });


exports.registerVendor = async (req, res) => {
    try {

        const {
            dob,
            name, VehicleNumber, email, number, password, category,
            aadharNumber,
            panNumber,
            address, referral_code_which_applied, is_referral_applied = false
        } = req.body;

        const files = req.files || [];
        if (!name || !email || !number || !password || !category) {
            console.log("Please enter all fields")
            return res.status(400).json({ success: false, message: 'Please enter all fields' });
        }

        if (dob) {
            const dobDate = new Date(dob);
            const currentDate = new Date();
            const age = currentDate.getFullYear() - dobDate.getFullYear();
            const isBeforeBirthday = currentDate < new Date(dobDate.setFullYear(currentDate.getFullYear()));

            if (age < 18 || (age === 18 && isBeforeBirthday)) {
                console.log("Vendor must be at least 18 years old")
                return res.status(400).json({ success: false, message: 'Vendor must be at least 18 years old' });
            }
        }


        if (!/^\d{10}$/.test(number)) {
            console.log("Please provide a valid 10-digit phone number")
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid 10-digit phone number',
            });
        }



        if (!address || !address.location || !address.location.coordinates) {
            console.log("Address or location coordinates are missing")

            return res.status(400).json({
                success: false,
                message: 'Address or location coordinates are missing',
            });
        }

        let coordinatesArray = [0, 0];
        if (address?.location?.coordinates) {
            try {
                if (typeof address.location.coordinates === "string") {
                    coordinatesArray = JSON.parse(address.location.coordinates).map(coord => parseFloat(coord));
                } else if (Array.isArray(address.location.coordinates)) {
                    coordinatesArray = address.location.coordinates.map(coord => parseFloat(coord));
                }
                if (!Array.isArray(coordinatesArray) || coordinatesArray.length !== 2 || coordinatesArray.some(isNaN)) {
                    throw new Error("Invalid coordinates format");
                }
            } catch (error) {
                console.error("Coordinates parsing failed. Falling back to default coordinates.");
            }
        }
        address.location.coordinates = coordinatesArray;


        const existingVendor = await Vendor_Model.findOne({ $or: [{ email }, { number }] });
        if (existingVendor) {
            if (existingVendor.isEmailVerified === true) {
                return res.status(400).json({ success: false, message: 'Vendor already exists, and the mobile number has been successfully verified.' });
            } else {
                const otpServiceR = new OtpService();
                const { otp, expiryTime } = otpServiceR.generateOtp();

                const message = `Hi ${name},\n\nYour OTP is: ${otp}.\n\nAt Olyox, we simplify your life with services like taxi booking, food delivery, and more.\n\nThank you for choosing Olyox!`;
                await SendWhatsAppMessage(message, number)
                existingVendor.otp_ = otp;
                existingVendor.otp_expire_time = expiryTime;
                await existingVendor.save();
                return res.status(201).json({
                    success: true,
                    message: 'Vendor already exists, but the mobile number has not been verified.',
                    data: existingVendor,
                    type: 'email',
                    email: existingVendor.email,
                    number: existingVendor.number,
                    time: existingVendor.otp_expire_time,
                });
            }
        }

        const imageFileOne = files.find(file => file.fieldname === 'aadharfront');
        const imageFileTwo = files.find(file => file.fieldname === 'aadharback');
        const imageFileThree = files.find(file => file.fieldname === 'pancard');


        const defaultImage = {
            secure_url: 'https://placehold.co/600x400',
            public_id: 'default-image',
        };


        // let uploadImageOne = defaultImage;
        // let uploadImageTwo = defaultImage;
        // let uploadImageThree = defaultImage;

        // try {
        //     if (imageFileOne) {
        //         uploadImageOne = await UploadService.uploadFromBuffer(imageFileOne?.buffer);
        //     }
        // } catch (error) {

        //     console.error('Error uploading Aadhar Front:', error);
        // }

        // try {
        //     if (imageFileTwo) {
        //         uploadImageTwo = await UploadService.uploadFromBuffer(imageFileTwo?.buffer);
        //     }
        // } catch (error) {
        //     console.error('Error uploading Aadhar Back:', error);
        // }

        // try {
        //     if (imageFileThree) {
        //         uploadImageThree = await UploadService.uploadFromBuffer(imageFileThree?.buffer);
        //     }
        // } catch (error) {
        //     console.error('Error uploading Pancard:', error);
        // }


        // Generate codes
        const otpService = new OtpService();
        const { otp, expiryTime } = otpService.generateOtp();
        const genreateOrder = crypto.randomBytes(16).toString('hex');
        function generateBhId() {
            const randomNum = crypto.randomInt(100000, 999999);
            return `BH${randomNum}`;
        }



        const genreateReferral = generateBhId()
        const insertBh = new BhIdSchema({
            BhId: genreateReferral,
        })

        let checkReferral = null;
        let checkReferralFromBh = null;

        if (referral_code_which_applied) {
            checkReferral = await Vendor_Model.findOne({ myReferral: referral_code_which_applied });
        } else {
            checkReferralFromBh = await BhIdSchema.findOne({ BhId: referral_code_which_applied });
        }

        const vendor = new Vendor_Model({
            name,
            email,
            number,
            password,
            VehicleNumber,
            parentReferral_id: checkReferral?._id,
            category,
            address,
            aadharNumber,
            panNumber,
            myReferral: genreateReferral,
            // Documents: {
            //     documentFirst: {

            //         image: uploadImageOne.secure_url,
            //         public_id: uploadImageOne.public_id,
            //     },
            //     documentSecond: {
            //         image: uploadImageTwo.secure_url,
            //         public_id: uploadImageTwo.public_id,
            //     },
            //     documentThird: {
            //         image: uploadImageThree.secure_url,
            //         public_id: uploadImageThree.public_id,
            //     },
            // },
            referral_code_which_applied,
            is_referral_applied,
            otp_: otp,
            dob,
            order_id: genreateOrder,
            otp_expire_time: expiryTime,

        });


        async function addChildToAllParents(vendorId, parentReferralId) {
            if (!parentReferralId) return;

            const parentReferral = await Vendor_Model.findById(parentReferralId);
            if (parentReferral) {
                if (!parentReferral.Child_referral_ids.includes(vendorId)) {
                    parentReferral.Child_referral_ids.push(vendorId);
                    await parentReferral.save();
                }

                if (parentReferral.parentReferral_id) {
                    await addChildToAllParents(vendorId, parentReferral.parentReferral_id);
                }
            }
        }
        if (checkReferral) {
            checkReferral.Level1.push(vendor._id);
            await checkReferral.save();

            let currentVendor = checkReferral;

            const maxLevel = vendor.higherLevel || 5
            for (let level = 2; level <= maxLevel; level++) {
                if (!currentVendor.parentReferral_id) {
                    console.log(`No parent referral ID for Vendor ID: ${currentVendor._id}`);
                    break;
                }

                const higherLevelVendor = await Vendor_Model.findById(currentVendor.parentReferral_id);

                if (higherLevelVendor) {
                    const levelKey = `Level${level}`;


                    // Ensure the level array is initialized
                    if (!Array.isArray(higherLevelVendor[levelKey])) {
                        higherLevelVendor[levelKey] = [];
                    }

                    higherLevelVendor[levelKey].push(vendor._id);


                    console.log(`Added Vendor ID ${vendor._id} to ${levelKey} of Vendor ID: ${higherLevelVendor._id}`);

                    // Save the updated higher-level vendor
                    try {
                        await higherLevelVendor.save();
                    } catch (saveError) {
                        console.error(`Error saving ${levelKey} for Vendor ID: ${higherLevelVendor._id}, saveError`);
                    }

                    currentVendor = higherLevelVendor; // Move up the hierarchy
                } else {
                    console.error(`Parent Vendor with ID ${currentVendor.parentReferral_id} not found`);
                    break;
                }
            }
        }


        if (checkReferral && checkReferral.isActive) {
            checkReferral.Child_referral_ids.push(vendor._id);
            await addChildToAllParents(vendor._id, checkReferral.parentReferral_id);
            await checkReferral.save();
        }

        if (checkReferralFromBh) {
            checkReferralFromBh.vendorIds.push(vendor._id);
            await checkReferralFromBh.save();
        }

        const find = await ActiveReferral_Model.findOne({ contactNumber: number })

        if (find) {
            find.isRegistered = true
            await find.save()
        }

        const message = `Hi ${name},\n\nYour OTP is: ${otp}.\n\nAt Olyox, we simplify your life with services like taxi booking, food delivery, and more.\n\nThank you for choosing Olyox!`;

        await SendWhatsAppMessage(message, number)


        await insertBh.save();
        await vendor.save();
        // fileUploadQueue.add({ userId: vendor._id, fileFirst: imageFileOne, fileSecond: imageFileTwo, fileThird: imageFileThree }, {
        //     attempts: 3,
        //     backoff: {
        //         type: 'exponential', 
        //         delay: 5000,
        //     },
        // });

        res.status(201).json({
            success: true,
            message: 'Vendor registered successfully',
            data: vendor,
            type: 'email',
            email: vendor.email,
            number: vendor.number,
            time: vendor.otp_expire_time,
        });
    } catch (error) {
        console.error('Error registering vendor:', error);
        res.status(500).json({
            success: false,
            message: 'Vendor registration failed',
            error: error,
        });
    }
};

exports.verifyDocument = async (req, res) => {
    try {
        const id = req.query.id;
        const vendor = await Vendor_Model.findById(id);

        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found',
            });
        }


        vendor.documentVerify = !vendor.documentVerify;
        await vendor.save();


        const message = vendor.documentVerify
            ? `Hello ${vendor.name}, your documents have been successfully verified. Thank you for completing the process!`
            : `Hello ${vendor.name}, your document verification has been revoked. Please contact support if you believe this is an error.`;

        await SendWhatsAppMessage(message, vendor?.number);

        return res.status(200).json({
            success: true,
            message: 'Vendor document verification status updated successfully',
            data: vendor,
        });
    } catch (error) {
        // Handle any errors and send a failure response
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while updating the document verification status',
        });
    }
};


exports.verifyVendorEmail = async (req, res) => {
    try {
        const { email, otp, type } = req.body;


        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email, OTP are required.',
            });
        }


        const vendor = await Vendor_Model.findOne({ email }).populate('member_id').populate('category');
        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found. Please check the email and try again.',
            });
        }

        if (type === 'email') {

            if (vendor.isEmailVerified) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already verified.',
                });
            }

            if (vendor.otp_ !== otp) {
                return res.status(401).json({
                    success: false,
                    message: 'The provided OTP is invalid. Please check and try again.',
                });
            }

            if (vendor.otp_expire_time && new Date() > vendor.otp_expire_time) {
                return res.status(401).json({
                    success: false,
                    message: 'The OTP has expired. Please request a new OTP.',
                });
            }


            vendor.isEmailVerified = true;
            vendor.isActive = true;

            vendor.otp_ = null;
            vendor.otp_expire_time = null;
            const emailService = new SendEmailService();

            const emailData = {
                to: email,
                text: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #4CAF50; text-align: center;">Welcome to Olyox Pvt Ltd!</h2>
            <p>Dear <strong>${vendor.name || 'Vendor'}</strong>,</p>
            <p>Congratulations on completing your onboarding process with us!</p>
            <p><strong>Here are your details:</strong></p>
            <ul style="list-style: none; padding: 0;">
                <li><strong>Vendor BH ID:</strong> ${vendor.myReferral}</li>
                <li><strong>Plan:</strong> ${vendor?.member_id?.title || 'Not Assigned'}</li>
                <li><strong>Category:</strong> ${vendor.category?.title || 'Not Specified'}</li>
                <li><strong>Mobile Number:</strong> ${vendor.number || 'Not Provided'}</li>
            </ul>
            <p style="color: #e74c3c;"><strong>Note:</strong> Please ensure to recharge your ID from your dashboard to continue enjoying our services.</p>
            <p style="text-align: center;">
                <a href="${process.env.FrontEndUrl}/login" 
                   style="display: inline-block; padding: 10px 20px; color: #fff; background-color: #4CAF50; text-decoration: none; border-radius: 5px;">
                   Go to Dashboard
                </a>
            </p>
                     <p>Best Regards,<br>Olyox Pvt Ltd</p>

        </div>
`,
            };
            emailData.subject = 'onboarding complete';
            // await emailService.sendEmail(emailData);
            const message = `🌟 *Welcome to Olyox Pvt Ltd!* 🌟

Dear *${vendor.name || 'Valued Vendor'}*,

_We're thrilled to have you join our network!_

Here's a snapshot of your details with us:
- 🆔 *Vendor BH ID:* ${vendor.myReferral || 'Pending Assignment'}
- 🗂️ *Category:* ${vendor.category?.title || 'To Be Specified'}

Feel free to reach out if you have any questions or need assistance. We're here to support you every step of the way! 🎉

Warm regards,
The Olyox Team`;


            await SendWhatsAppMessage(message, vendor.number)
            await vendor.save();

            return res.status(200).json({
                success: true,
                BHID: vendor.myReferral,
                message: 'Mobile Number has been verified successfully.',
            });

        } else if (type === 'password') {
            // Handle password OTP verification
            if (vendor.password_otp !== otp) {
                return res.status(401).json({
                    success: false,
                    message: 'The provided OTP is invalid. Please check and try again.',
                });
            }

            if (vendor.password_otp_expire && new Date() > vendor.password_otp_expire) {
                return res.status(401).json({
                    success: false,
                    message: 'The OTP has expired. Please request a new OTP.',
                });
            }

            // Clear password OTP and update password if temporary password exists
            vendor.password_otp = null;
            vendor.password_otp_expire = null;

            if (vendor.temp_password) {
                vendor.password = vendor.temp_password;
                vendor.temp_password = null;
            }

            await vendor.save();

            return res.status(200).json({
                success: true,
                BHID: vendor.myReferral,
                message: 'Password OTP verified successfully. Your password has been updated.',
            });

        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid type. Please provide a valid type (email or password).',
            });
        }

    } catch (error) {
        console.error('Error verifying vendor email:', error);

        // Provide a user-friendly error message
        return res.status(500).json({
            success: false,
            message: 'An unexpected error occurred while verifying your email or OTP. Please try again later.',
        });
    }
};


exports.resendOtp = async (req, res) => {
    try {
        const { type, email } = req.body;

        // Find vendor by email
        const vendor = await Vendor_Model.findOne({ email });
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }

        const otpService = new OtpService();
        const { otp, expiryTime } = otpService.generateOtp();
        let message = '';

        if (type === 'email') {
            if (vendor.isEmailVerified) {
                return res.status(400).json({ success: false, message: 'Email already verified' });
            }

            vendor.otp_ = otp;
            vendor.otp_expire_time = expiryTime;
            message = `Hi ${vendor.name},\n\nYour OTP is: ${otp}.\n\nAt Olyox, we simplify your life with services like taxi booking, food delivery, and more.\n\nThank you for choosing Olyox!`;

        } else if (type === 'password') {
            vendor.password_otp = otp;
            vendor.password_otp_expire = expiryTime;
            message = `Hi ${vendor.name},\n\nYour OTP to reset your password is: ${otp}.\n\nThank you for choosing Olyox!`;
        } else {
            return res.status(400).json({ success: false, message: 'Invalid type provided' });
        }

        // Save vendor with updated OTP
        await vendor.save();

        // Send WhatsApp message
        try {
            await SendWhatsAppMessage(message, vendor?.number);
        } catch (error) {
            console.error('Error sending WhatsApp message:', error);
            return res.status(500).json({ success: false, message: 'Failed to send WhatsApp message' });
        }

        // Send appropriate response
        const successMessage =
            type === 'email'
                ? 'OTP sent successfully for email verification'
                : 'Password change OTP sent successfully';

        return res.status(200).json({ success: true, message: successMessage });
    } catch (error) {
        console.error('Error resending OTP:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


const jwt = require("jsonwebtoken");

exports.loginVendor = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log("Login request received with email:", email);

        // Step 1: Validate input
        if (!email || !password) {
            console.error("Missing email or password:", { email, password });
            return res.status(400).json({
                success: false,
                message: "Please provide both email and password.",
            });
        }

        // Step 2: Find the vendor by myReferral or number
        let vendor = await Vendor_Model.findOne({ myReferral: email })
            .populate("category")
            .populate("member_id")
            .populate("payment_id")
            .populate("copyParentId");

        if (!vendor) {
            vendor = await Vendor_Model.findOne({ number: email })
                .populate("category")
                .populate("member_id")
                .populate("payment_id")
                .populate("copyParentId");
        }

        if (!vendor) {
            console.warn("Vendor not found for email/number:", email);
            return res.status(404).json({
                success: false,
                message: "Vendor not found. Please check your email or number and try again.",
            });
        }

        console.log("Vendor data found:", { vendorId: vendor._id, email });

        // Step 3: Check if the account is blocked
        if (vendor.isActive === false) {
            console.warn("Blocked vendor attempted login:", { vendorId: vendor._id, email });
            return res.status(403).json({
                success: false,
                message: "Your account has been blocked. Please contact the admin for assistance.",
            });
        }

        // Step 4: Verify the password
        const isPasswordMatch = await vendor.comparePassword(password);
        if (!isPasswordMatch) {
            console.warn("Invalid password attempt for vendor:", { vendorId: vendor._id, email });
            return res.status(401).json({
                success: false,
                message: "Invalid credentials. Please try again.",
            });
        }

        console.log("Password verified for vendor:", { vendorId: vendor._id, email });

        // Step 5: Generate JWT token
        const token = jwt.sign({ id: vendor._id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_TIME,
        });

        // Step 6: Set token in cookie and respond
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
           
        };

        res.status(200)
            .cookie("token", token, cookieOptions)
            .json({
                success: true,
                message: "Login successful.",
                token,
                vendor,
            });

        console.log("Successful login response sent:", { vendorId: vendor._id, email });
    } catch (error) {
        console.error("Error logging in vendor:", error.message, error.stack);
        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};



// Vendor logout (simple session-based logout example)
exports.logoutVendor = async (req, res) => {
    try {

        res.status(200).json({ success: true, message: 'Logout successful' });
    } catch (error) {
        console.error('Error logging out vendor:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


exports.getSingleProvider = async (req, res) => {
    try {
        // console.log("i am hit")
        const { id } = req.params;
        const provider = await Vendor_Model.findById(id)
            .select('-password')
            .populate('category')
            .populate('member_id')
            .populate('payment_id')
            .populate('payment_id')
            .populate('copyParentId')
            .populate({
                path: 'Level1',
                populate: [
                    { path: 'Child_referral_ids' },
                    { path: 'category' },
                    { path: 'payment_id' },
                    { path: 'member_id' }
                ],
            })
            .populate({
                path: 'Level2',
                populate: [
                    { path: 'Child_referral_ids' },
                    { path: 'category' },
                    { path: 'payment_id' },
                    { path: 'member_id' }
                ],
            })
            .populate({
                path: 'Level3',
                populate: [
                    { path: 'Child_referral_ids' },
                    { path: 'category' },
                    { path: 'payment_id' },
                    { path: 'member_id' }
                ],
            })
            .populate({
                path: 'Level4',
                populate: [
                    { path: 'Child_referral_ids' },
                    { path: 'category' },
                    { path: 'payment_id' },
                    { path: 'member_id' }
                ],
            })
            .populate({
                path: 'Level5',
                populate: [
                    { path: 'Child_referral_ids' },
                    { path: 'category' },
                    { path: 'payment_id' },
                    { path: 'member_id' }
                ],
            })
            .populate({
                path: 'Level6',
                populate: [
                    { path: 'Child_referral_ids' },
                    { path: 'category' },
                    { path: 'payment_id' },
                    { path: 'member_id' }
                ],
            })
            .populate({
                path: 'Level7',
                populate: [
                    { path: 'Child_referral_ids' },
                    { path: 'category' },
                    { path: 'payment_id' },
                    { path: 'member_id' }
                ],
            });


        if (!provider) {
            return res.status(400).json({
                success: false,
                message: 'Provider not founded by id',
                error: 'Provider not founded by id'
            })
        }
        res.status(200).json({
            success: true,
            message: 'Provider founded by id',
            data: provider
        })
    } catch (error) {
        console.log("Internal server error", error)
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            message: error.message
        })
    }
}
exports.getCopyOfProvider = async (req, res) => {
    try {
        // console.log("i am hit")
        const { id } = req.params;
        const provider = await Vendor_Model.find({ copyParentId: id })
            .select('-password')
            .populate('category')
            .populate('member_id')
            .populate('payment_id')
            .populate('payment_id')
            .populate('copyParentId')
            .populate({
                path: 'Level1',
                populate: [
                    { path: 'Child_referral_ids' },
                    { path: 'category' },
                    { path: 'payment_id' },
                    { path: 'member_id' }
                ],
            })
            .populate({
                path: 'Level2',
                populate: [
                    { path: 'Child_referral_ids' },
                    { path: 'category' },
                    { path: 'payment_id' },
                    { path: 'member_id' }
                ],
            })
            .populate({
                path: 'Level3',
                populate: [
                    { path: 'Child_referral_ids' },
                    { path: 'category' },
                    { path: 'payment_id' },
                    { path: 'member_id' }
                ],
            })
            .populate({
                path: 'Level4',
                populate: [
                    { path: 'Child_referral_ids' },
                    { path: 'category' },
                    { path: 'payment_id' },
                    { path: 'member_id' }
                ],
            })
            .populate({
                path: 'Level5',
                populate: [
                    { path: 'Child_referral_ids' },
                    { path: 'category' },
                    { path: 'payment_id' },
                    { path: 'member_id' }
                ],
            })
            .populate({
                path: 'Level6',
                populate: [
                    { path: 'Child_referral_ids' },
                    { path: 'category' },
                    { path: 'payment_id' },
                    { path: 'member_id' }
                ],
            })
            .populate({
                path: 'Level7',
                populate: [
                    { path: 'Child_referral_ids' },
                    { path: 'category' },
                    { path: 'payment_id' },
                    { path: 'member_id' }
                ],
            });


        if (!provider) {
            return res.status(400).json({
                success: false,
                message: 'Provider not founded by id',
                error: 'Provider not founded by id'
            })
        }
        res.status(200).json({
            success: true,
            message: 'Provider founded by id',
            data: provider
        })
    } catch (error) {
        console.log("Internal server error", error)
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            message: error.message
        })
    }
}

exports.changeVendorCategory = async (req, res) => {
    try {
        const { email, newCategory } = req.body;

        if (!email || !newCategory) {
            return res.status(400).json({ success: false, message: 'Please provide email and new category' });
        }

        const vendor = await Vendor_Model.findOne({ email });
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }

        vendor.category = newCategory;
        await vendor.save();

        res.status(200).json({ success: true, message: 'Vendor category updated successfully' });
    } catch (error) {
        console.error('Error updating vendor category:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Change vendor's password
exports.changeVendorPassword = async (req, res) => {
    try {
        const { email, oldPassword, newPassword } = req.body;

        if (!email || !oldPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Please provide email, old password, and new password' });
        }

        const vendor = await Vendor_Model.findOne({ email });
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }

        const isOldPasswordMatch = await vendor.comparePassword(oldPassword);
        if (!isOldPasswordMatch) {
            return res.status(401).json({ success: false, message: 'Old password is incorrect' });
        }

        // Hash the new password before saving it

        vendor.password = newPassword;
        await vendor.save();

        res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Delete vendor account
exports.deleteVendorAccount = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Please provide email' });
        }

        const vendor = await Vendor_Model.findOne({ email });
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }

        await Vendor_Model.deleteOne({ email });
        res.status(200).json({ success: true, message: 'Vendor account deleted successfully' });
    } catch (error) {
        console.error('Error deleting vendor account:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}



exports.updateVendorDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            email,
            number,
            password,
            category,
            address,
            referral_code_which_applied,
            is_referral_applied,
            member_id,
            VehicleNumber,
        } = req.body;

        console.log(category)
        // Find the vendor by ID
        const vendor = await Vendor_Model.findById(id);

        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }

        // Check if the provided number is already used by another vendor
        if (number) {
            const existingVendor = await Vendor_Model.findOne({ number });
            if (existingVendor && existingVendor._id.toString() !== id) {
                return res.status(400).json({
                    success: false,
                    message: 'Number already exists',
                });
            }
            vendor.number = number; // Update the vendor's number
        }

        // Update vendor fields if they are provided
        if (name) vendor.name = name;
        if (email) vendor.email = email;
        if (VehicleNumber) vendor.VehicleNumber = VehicleNumber;
        if (password) {
            // Hash the password before saving (use a hashing library like bcrypt)
            vendor.password = password; // Replace with hashed password
        }
        if (category) vendor.category = category;
        if (address) vendor.address = address;
        if (referral_code_which_applied !== undefined) vendor.referral_code_which_applied = referral_code_which_applied;
        if (is_referral_applied !== undefined) vendor.is_referral_applied = is_referral_applied;
        if (member_id) vendor.member_id = member_id;

        // Save the updated vendor
        await vendor.save();

        return res.status(200).json({
            success: true,
            message: 'Vendor details updated successfully',
            vendor,
        });
    } catch (error) {
        console.error('Error updating vendor details:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while updating vendor details. Please try again later.',
            error: error.message,
        });
    }
};

exports.updatePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { oldPassword, newPassword } = req.body;

        // Check if vendor exists
        const vendor = await Vendor_Model.findById(id);
        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found',
            });
        }

        // Validate old password
        const isValidPassword = await vendor.comparePassword(oldPassword);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid old password',
            });
        }

        // Hash and update the new password
        // const hashedPassword = await bcrypt.hash(newPassword, 10);
        vendor.password = newPassword;

        // Save updated vendor data
        await vendor.save();

        // Respond with success
        return res.status(200).json({
            success: true,
            message: 'Password updated successfully',
        });

    } catch (error) {
        console.error('Internal server error', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};


exports.forgetPassword = async (req, res) => {
    try {
        const { number, newPassword } = req.body;

        if (!number || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Number and new password are required.',
            });
        }

        // Find the vendor by number
        const vendor = await Vendor_Model.findOne({ number });
        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found. Please check the number and try again.',
            });
        }

        // Generate OTP and expiry time
        const otpService = new OtpService();
        const { otp, expiryTime } = otpService.generateOtp();

        // Send OTP via email

        const message = `Hi ${vendor.name},\n\nYour OTP to reset your password is: ${otp}.\n\nThank you for choosing Olyox!`;
        try {
            await SendWhatsAppMessage(message, vendor?.number);
        } catch (emailError) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send OTP email. Please try again later.',
            });
        }

        // Save OTP and expiry time in the database
        vendor.password_otp = otp;
        vendor.password_otp_expire = expiryTime;
        vendor.temp_password = newPassword
        await vendor.save();
        // Respond with success
        return res.status(200).json({
            success: true,
            email: vendor.email,
            time: vendor?.password_otp_expire,
            message: 'OTP has been sent to your email. Please check your inbox.',
        });
    } catch (error) {
        console.error('Error in forgetPassword:', error);
        return res.status(500).json({
            success: false,
            message: 'An unexpected error occurred. Please try again later.',
        });
    }
};

exports.getAllVendor = async (req, res) => {
    try {
        const allVednor = await Vendor_Model.find().populate('Child_referral_ids').populate('category').populate('member_id').populate('payment_id');;
        if (!allVednor) {
            return res.status(400).json({
                success: false,
                message: 'No vendor found',
                error: 'No vendor found',
            })
        }
        return res.status(200).json({
            success: true,
            data: allVednor
        })
    } catch (error) {
        console.error('Error in forgetPassword:', error);
        return res.status(500).json({
            success: false,
            message: 'An unexpected error occurred. Please try again later.',
        });
    }
}

exports.updateVendorIsActive = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const updatedCategory = await Vendor_Model.findById(id);
        if (!updatedCategory) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found',
                error: 'Vendor not found'
            })
        }
        updatedCategory.isActive = isActive;
        await updatedCategory.save();
        // console.log("object",updatedCategory)
        res.status(200).json({
            success: true,
            message: 'Vendor Active status updated successfully',
            data: updatedCategory
        })
    } catch (error) {
        console.log("Internal server error", error)
        res.status(500).json({
            success: false,
            message: 'Failed to update vendor toggle',
            error: error.message
        })
    }
}







//copy her id with different category

exports.copyVendor = async (req, res) => {
    try {
        const userId = req.user.id;
        const { category: newCategory, number, Newemail, password } = req.body;

        const vendor = await Vendor_Model.findById(userId);
        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found',
                error: 'Vendor not found',
            });
        }

        if (vendor.category === newCategory) {
            return res.status(400).json({
                success: false,
                message: 'Vendor already has this category',
                error: 'Vendor already has this category',
            });
        }

        if (!/^\d{10}$/.test(number)) {
            console.log("Please provide a valid 10-digit phone number");
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid 10-digit phone number',
            });
        }


        const otpService = new OtpService();
        const { otp, expiryTime } = otpService.generateOtp();

        function generateBhId() {
            const randomNum = crypto.randomInt(100000, 999999);
            return `BH${randomNum}`;
        }
        const generatedReferral = generateBhId();


        const newBhId = new BhIdSchema({
            BhId: generatedReferral,
        });

        const newVendor = new Vendor_Model({
            ...vendor.toObject(),
            _id: undefined,
            email: Newemail,
            isActive: false,
            password: password,
            wallet: 0,
            level_id: 0,
            Level1: [],
            Level2: [],
            Level3: [],
            Level4: [],
            Level5: [],
            Level6: [],
            Level7: [],
            parentReferral_id: vendor._id,
            category: newCategory,
            isEmailVerified: false,
            isCopy: true,
            myReferral: generatedReferral,
            plan_status: false,
            member_id: null,
            payment_id: null,
            child_referral_ids: [],
            higherLevel: 0,
            recharge: 0,
            referral_code_which_applied: null,
            VehicleNumber: null,
            copyParentId: vendor._id,
            otp_: otp,
            otp_expire_time: expiryTime,
            number,
        });

        const message = `Dear Vendor,\n\nYour new vendor ID is ${generatedReferral}. Please verify your OTP: *${otp}* to proceed with onboarding for the category: ${newCategory}.`;
        await SendWhatsAppMessage(message, number);

        await newBhId.save();
        await newVendor.save();

        return res.status(201).json({
            success: true,
            message: 'Vendor copy created successfully. Please verify the OTP sent to your phone.',
            vendorId: newVendor._id,
        });
    } catch (error) {
        console.error('Error creating vendor copy:', error);
        return res.status(500).json({
            success: false,
            message: 'An unexpected error occurred while creating the vendor copy. Please try again later.',
        });
    }
};

exports.manuallyRegisterVendor = async (req, res) => {
    try {
        console.log("object",req.body)
        const {
            dob,
            isActive,
            member_id,
            plan_status,
            myReferral,
            name, email, number, password, category, referral_code_which_applied, is_referral_applied = false
        } = req.body;

        // const files = req.files || [];
        if (!name || !email  || !password || !category) {
            console.log("Please enter all fields")
            return res.status(400).json({ success: false, message: 'Please enter all fields' });
        }

        // if (dob) {
        //     const dobDate = new Date(dob);
        //     const currentDate = new Date();
        //     const age = currentDate.getFullYear() - dobDate.getFullYear();
        //     const isBeforeBirthday = currentDate < new Date(dobDate.setFullYear(currentDate.getFullYear()));

        //     if (age < 18 || (age === 18 && isBeforeBirthday)) {
        //         console.log("Vendor must be at least 18 years old")
        //         return res.status(400).json({ success: false, message: 'Vendor must be at least 18 years old' });
        //     }
        // }


        // if (!/^\d{10}$/.test(number)) {
        //     console.log("Please provide a valid 10-digit phone number")
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Please provide a valid 10-digit phone number',
        //     });
        // }


        let checkReferral = null;
        let checkReferralFromBh = null;

        if (referral_code_which_applied) {
            checkReferral = await Vendor_Model.findOne({ myReferral: referral_code_which_applied });
        } else {
            checkReferralFromBh = await BhIdSchema.findOne({ BhId: referral_code_which_applied });
        }

        const vendor = new Vendor_Model({
            name,
            email,
            // number,
            password,
            parentReferral_id: checkReferral?._id,
            category,
            myReferral,
            referral_code_which_applied,
            is_referral_applied,
            dob,
            isActive,
            plan_status,
            myReferral,
            member_id:"6774f068d26e0d8a969fb8e3",
        });

        const insertBh = new BhIdSchema({
            BhId: vendor.myReferral,
        })


        async function addChildToAllParents(vendorId, parentReferralId) {
            if (!parentReferralId) return;

            const parentReferral = await Vendor_Model.findById(parentReferralId);
            if (parentReferral) {
                if (!parentReferral.Child_referral_ids.includes(vendorId)) {
                    parentReferral.Child_referral_ids.push(vendorId);
                    await parentReferral.save();
                }

                if (parentReferral.parentReferral_id) {
                    await addChildToAllParents(vendorId, parentReferral.parentReferral_id);
                }
            }
        }
        if (checkReferral) {
            checkReferral.Level1.push(vendor._id);
            await checkReferral.save();

            let currentVendor = checkReferral;

            const maxLevel = vendor.higherLevel || 5
            for (let level = 2; level <= maxLevel; level++) {
                if (!currentVendor.parentReferral_id) {
                    console.log(`No parent referral ID for Vendor ID: ${currentVendor._id}`);
                    break;
                }

                const higherLevelVendor = await Vendor_Model.findById(currentVendor.parentReferral_id);

                if (higherLevelVendor) {
                    const levelKey = `Level${level}`;


                    // Ensure the level array is initialized
                    if (!Array.isArray(higherLevelVendor[levelKey])) {
                        higherLevelVendor[levelKey] = [];
                    }

                    higherLevelVendor[levelKey].push(vendor._id);


                    console.log(`Added Vendor ID ${vendor._id} to ${levelKey} of Vendor ID: ${higherLevelVendor._id}`);

                    // Save the updated higher-level vendor
                    try {
                        await higherLevelVendor.save();
                    } catch (saveError) {
                        console.error(`Error saving ${levelKey} for Vendor ID: ${higherLevelVendor._id}, saveError`);
                    }

                    currentVendor = higherLevelVendor; // Move up the hierarchy
                } else {
                    console.error(`Parent Vendor with ID ${currentVendor.parentReferral_id} not found`);
                    break;
                }
            }
        }


        if (checkReferral && checkReferral.isActive) {
            checkReferral.Child_referral_ids.push(vendor._id);
            await addChildToAllParents(vendor._id, checkReferral.parentReferral_id);
            await checkReferral.save();
        }

        if (checkReferralFromBh) {
            checkReferralFromBh.vendorIds.push(vendor._id);
            await checkReferralFromBh.save();
        }

        const find = await ActiveReferral_Model.findOne({ contactNumber: number })

        if (find) {
            find.isRegistered = true
            await find.save()
        }

        // const message = `Hi ${name},\n\nYour OTP is: ${otp}.\n\nAt Olyox, we simplify your life with services like taxi booking, food delivery, and more.\n\nThank you for choosing Olyox!`;

        // await SendWhatsAppMessage(message, number)


        await insertBh.save();
        await vendor.save();
        // fileUploadQueue.add({ userId: vendor._id, fileFirst: imageFileOne, fileSecond: imageFileTwo, fileThird: imageFileThree }, {
        //     attempts: 3,
        //     backoff: {
        //         type: 'exponential', 
        //         delay: 5000,
        //     },
        // });

        res.status(201).json({
            success: true,
            message: 'Vendor registered successfully',
            data: vendor,
            type: 'email',
            email: vendor.email,
            number: vendor.number,
            time: vendor.otp_expire_time,
        });
    } catch (error) {
        console.error('Error registering vendor:', error);
        res.status(500).json({
            success: false,
            message: 'Vendor registration failed',
            error: error,
        });
    }
};