import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './src/modules/auth/auth.routes.js';
import userRoutes from './src/modules/users/user.routes.js';
import uploadRoutes from './src/modules/upload/upload.routes.js';
import recyclerRoutes from './src/modules/recyclers/recycler.routes.js';
import adminRoutes from './src/modules/admin/admin.routes.js';
import demandRoutes from './src/modules/demand/demand.router.js';
import scheduleRoutes from './src/modules/schedules/schedules.routes.js';

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'RecycleConnect Backend Operational' });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/recyclers', recyclerRoutes);
app.use('/api/v1/partners', recyclerRoutes);
app.use('/api/v1/partners', scheduleRoutes);
app.use('/api/v1/households', scheduleRoutes);
app.use('/api/v1/households', demandRoutes);
app.use('/api/v1/partners', demandRoutes);
app.use('/api/v1/admin', adminRoutes);

export default app;