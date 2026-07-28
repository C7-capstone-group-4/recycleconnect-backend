import express from 'express';
import {
    getAggregatedInventory,
    expressInterest,
    respondToInterest
} from './recycler.controller.js';


const router = express.Router();

// Public/Recycler inventory view
router.get('/inventory', getAggregatedInventory);

// Recycler expresses interest
router.post('/express-interest', expressInterest);

// Partner responds to interest
router.patch('/interests/:id/respond', respondToInterest);

export default router;
