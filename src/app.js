import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error.middleware.js';
import superAdminRoutes from './routes/superAdmin.routes.js';
import authRoutes from './routes/auth.routes.js';
import flagRoutes from './routes/flag.routes.js';
import featureRoutes from './routes/feature.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Health check — confirms the server is up
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/super-admin', superAdminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/flags', flagRoutes);
app.use('/api/features', featureRoutes);

// Must be last — Express identifies error handlers by the 4-argument signature
app.use(errorHandler);

export default app;
