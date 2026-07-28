import { uploadToCloudinary } from "../../utils/cloudinaryUploader.js";


export const handleImageUpload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No image file provided",
                error: "BAD_REQUEST",
            });
        }

        // Upload file to cloudinary under 'recycleconnect/id_photos' or 'general'
        const folder = req.body.folder || 'recycleconnect/general';
        const imageUrl = await uploadToCloudinary(req.file.buffer, folder);

        return res.status(200).json({
            success: true,
            message: "Image uploaded successfully",
            data: {
                image_url: imageUrl,
            },
        });
    } catch (error) {
        console.error('Cloudinary upload error: ', error);
        return res.status(500).json({
            success: false,
            message: "Failed to upload image",
            error: "INTERNAL_SERVER_ERROR",
        });
    }
};
