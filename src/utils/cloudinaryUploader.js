import cloudinary from "../config/cloudinary.js";


/**
 * Uploads a file buffer to CLoudinary
 * @param {Buffer} fileBuffer - File memory buffer from Multer
 * @param {String} folder - Cloudinary folder name
 * @returns {Promise<String>} - Secure cloudinary HTTPS URL
 */
export const uploadToCloudinary = (fileBuffer, folder='recycleconnect') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder },
            (error, result) => {
                if (error) return reject(errpr);
                resolve(result.score_url);
            }
        );
        uploadStream.end(fileBuffer);
    });
};
