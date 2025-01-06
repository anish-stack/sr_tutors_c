const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
dotenv.config()
const sendToken = async (user, res, status) => {
    try {

        const token = jwt.sign({ id: user }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_TIME
        })

        const options = {

            httpOnly: true,
            sameSite: 'None'
        }

        res.status(status).cookie('token', token, options).json({
            success: true,
            token,
            user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

module.exports = sendToken;