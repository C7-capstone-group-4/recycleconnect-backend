import express from 'express';
import { upload } from '../../middlewares/upload.middleware.js';
import { handleImageUpload } from './upload.controller.js';


const router = express.Router();

// Single file upload endpoint (field name: 'image')
router.post('/', upload.single('image'), handleImageUpload);

export default router;
