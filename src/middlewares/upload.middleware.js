import multer from 'multer';


const storage = multer.memoryStorage();

// FIle filter - accepts images only
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only image files (JPEG, PNG, WEBP) are allowed."), false);
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },  // 5MB limit
});
