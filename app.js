import express from 'express';
import cors from 'cors';
import helmet from 'helmet';


const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'RecycleConnect Backend is operational' });
});

export default app;
