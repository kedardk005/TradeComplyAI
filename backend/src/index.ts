import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import productsRouter from './routes/products';
import hsCodesRouter from './routes/hscodes';
import classificationRouter from './routes/classification';
import costEstimateRouter from './routes/costEstimate';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/products', classificationRouter);
app.use('/api/hs-codes', hsCodesRouter);
app.use('/api/cost-estimate', costEstimateRouter);

// Start server
app.listen(port, () => {
  console.log(`Backend server is running on port ${port}`);
});
