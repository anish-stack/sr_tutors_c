const Cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
require('dotenv').config();

Cloudinary.config({
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME
});

class UploadService {
    static uploadFromBuffer(buffer) {
        return new Promise((resolve, reject) => {
            let stream = Cloudinary.uploader.upload_stream((error, result) => {
                if (error) {
                    console.error("Cloudinary upload error: ", error);
                    return reject(new Error("Failed to upload file to Cloudinary."));
                }
                resolve(result);
            });
            streamifier.createReadStream(buffer).pipe(stream);
        });
    }
}

module.exports = UploadService;
