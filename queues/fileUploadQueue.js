const Bull = require('bull');
const User = require('../model/vendor');
const fs = require('fs').promises;
const path = require('path');
const Cloudinary = require('cloudinary').v2;
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const uploadFolder = path.join(__dirname, 'uploads');

// Cloudinary Configuration
Cloudinary.config({
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME
});

// console.log(process.env.CLOUDINARY_API_KEY)
// console.log(process.env.CLOUDINARY_SECRET_KEY)
// console.log(process.env.CLOUDINARY_CLOUD_NAME)

// Create upload folder if it doesn't exist


// Create the Queue
const fileUploadQueue = new Bull('file-upload-queue', {
    redis: { host: '127.0.0.1', port: 6379 },
    settings: {
        lockDuration: 60000, // 1 minute lock duration
        stalledInterval: 30000, // 30 seconds before considering the job stalled
    },
});

const uploadToCloudinary = (filePath, fileName) => {
    return new Promise((resolve, reject) => {
        Cloudinary.uploader.upload(
            filePath,
            {
                resource_type: 'auto',
                public_id: fileName,
            },
            (error, result) => {
                if (error) {
                    console.log("Error uploading image:", error);
                    return reject(error);
                }
                // console.log("Cloudinary upload result:", result);
                resolve(result);
            }
        );
    });
};

// Process the Queue
fileUploadQueue.process(async (job) => {
    const { userId, fileFirst, fileSecond, fileThird } = job.data;
    // console.log("Processing files:", fileFirst, fileSecond, fileThird);

    try {
        const uploadPromises = [];
        const uploadedImages = [];

        // Function to handle file uploads
        const handleFileUpload = async (file) => {
            if (!file || !file.buffer || !file.buffer.data) {
                console.log("Invalid file object:", file);
                return null;
            }

            const fileName = `${uuidv4()}-${file.originalname}`;
            const filePath = path.join(uploadFolder, fileName);

            try {
                // Convert buffer.data to Buffer instance
                const buffer = Buffer.from(file.buffer.data);
                await fs.writeFile(filePath, buffer);
                const result = await uploadToCloudinary(filePath, fileName);
                uploadedImages.push(result);
                await fs.unlink(filePath);
                return result;
            } catch (error) {
                // console.error("Error in file upload:", error);
                throw error;
            }
        };

        // Process each file upload if it exists
        if (fileFirst) uploadPromises.push(handleFileUpload(fileFirst));
        if (fileSecond) uploadPromises.push(handleFileUpload(fileSecond));
        if (fileThird) uploadPromises.push(handleFileUpload(fileThird));

        // Wait for all uploads to complete
        const uploadResults = await Promise.all(uploadPromises);

        // Save URLs and public IDs after upload
        const user = await User.findById(userId);
        if (user) {
            user.Documents = {
                documentFirst: uploadResults[0] ? { image: uploadResults[0].secure_url, public_id: uploadResults[0].public_id } : null,
                documentSecond: uploadResults[1] ? { image: uploadResults[1].secure_url, public_id: uploadResults[1].public_id } : null,
                documentThird: uploadResults[2] ? { image: uploadResults[2].secure_url, public_id: uploadResults[2].public_id } : null,
            };
            await user.save();
        }

        // console.log(`Files uploaded for user: ${userId}`);
        return uploadResults;
    } catch (error) {
        console.error(`File upload failed for user: ${userId}`, error);
        throw error;
    }
});

// Event Listeners for Bull Queue
fileUploadQueue.on('completed', (job, result) => {
    console.log(`Job completed for userId: ${job.data.userId}`, result);
});

fileUploadQueue.on('failed', (job, err) => {
    console.error(`Job failed for userId: ${job.data.userId}`, err.message);
});

fileUploadQueue.on('error', (err) => {
    console.error('Queue error:', err);
});

module.exports = fileUploadQueue;