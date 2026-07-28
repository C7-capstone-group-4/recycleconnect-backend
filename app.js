import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import uploadRoutes from './src/modules/upload/upload.routes.js'


const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'RecycleConnect Backend is operational' });
});

// Register uploade route
app.use('/api/v1/upload', uploadRoutes);

export default app;
