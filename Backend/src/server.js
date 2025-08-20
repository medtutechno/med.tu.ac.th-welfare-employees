import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables from a .env file into process.env. This call
// silently does nothing if the file is missing. See .env.example for
// required variables. When deploying in production, supply these via
// environment variables rather than a .env file.
dotenv.config();

// Import our modular route handlers. Each route file exports an Express
// router that encapsulates its own endpoints. By separating routes into
// their own modules we keep server.js concise and easy to reason about.
import authRoutes from './routes/auth.js';
import benefitRoutes from './routes/benefits.js';
import userRoutes from './routes/users.js';

const app = express();

// Enable CORS for the configured front‑end origin. Without this the
// browser will refuse cross‑origin requests to the API. Only allow the
// origin specified in FE_ORIGIN for security. If no FE_ORIGIN is set the
// default is http://localhost:5173 which is the Vite dev server port.
const allowedOrigin = process.env.FE_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: allowedOrigin,
  credentials: false,
}));

// Parse JSON request bodies. Without this, req.body will be undefined.
app.use(express.json());

// Mount our API routes under their respective prefixes. All routes
// requiring authentication and role checking are defined inside these
// modules. See src/routes for details.
app.use('/auth', authRoutes);
app.use('/benefits', benefitRoutes);
app.use('/users', userRoutes);

// A simple health endpoint useful for monitoring and testing. It returns
// 200 OK with a JSON body containing { ok: true }. Applications like
// Kubernetes liveness/readiness checks can call this endpoint.
app.get('/healthz', (_req, res) => {
  res.json({ ok: true });
});

// Start the server on the configured port. Fall back to port 5000 if
// PORT is not defined. The callback logs a friendly message to the
// console so developers know which port is in use.
const port = parseInt(process.env.PORT, 10) || 5000;
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});