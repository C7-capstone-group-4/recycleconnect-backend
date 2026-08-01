import express from 'express';
import {
    getPendingApplications,
    reviewApplication,
    getDisputes,
    resolveDispute,
    getOversightList,
    createMaterialCategory,
} from './admin.controller.js';


const router = express.Router();

// Application reviews
router.get('/applications', getPendingApplications);
router.patch('/applications/:id/review', reviewApplication);

// Dispute management
router.get('/disputes', getDisputes);
router.patch('/disputes/:id/resolve', resolveDispute);

// Platform oversight and categories
router.get('/oversight', getOversightList);
router.post('/categories', createMaterialCategory);

export default router;
