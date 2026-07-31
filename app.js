import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import uploadRoutes from './src/modules/upload/upload.routes.js';
import recyclerRoutes from './src/modules/recyclers/recycler.routes.js';
import adminRoutes from './src/modules/admin/admin.routes.js';
import demandRoutes from "./modules/demand/demand.routes.js";
import scheduleRoutes from "./modules/schedules/schedules.routes.js";
import errorHandler from "./middlewares/errorHandler.js";
import dotenv from "dotenv";
dotenv.config();

const app = express();

// Middleware
app.use(express.json());

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
app.use("/api/v1", demandRoutes);
app.use("/api/v1", scheduleRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


export default app;
