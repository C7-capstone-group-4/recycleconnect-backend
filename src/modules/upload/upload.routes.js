import express from 'express';
import { upload } from '../../middlewares/upload.middleware';
import { handleImageUpload } from './upload.controller.js';
import { route } from 'express/lib/application';


const router = express.Router();

// Single file upload endpoint (field name: 'image')
route.post('/', upload.single('image'), handleImageUpload);

export default router;
