import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import uploadRoutes from './src/modules/upload/upload.routes.js';
import recyclerRoutes from './src/modules/recyclers/recycler.routes.js';
import adminRoutes from './src/modules/admin/admin.routes.js';


const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'RecycleConnect Backend is operational' });
});

// Register uploaded route
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/recyclers', recyclerRoutes);
app.use('/api/v1/partners', recyclerRoutes);  // Shared route prefix for partner interest response
app.use('/api/v1/admin', adminRoutes);

export default app;
