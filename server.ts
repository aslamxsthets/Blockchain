import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './server/config';
import { db } from './server/db/database';
import { blockchainService } from './server/services/blockchainService';
import { bootstrapDemoCertificates } from './server/services/seeder';
import { authenticateToken } from './server/middleware/auth';
import { authRouter } from './server/routes/auth';
import { certificatesRouter } from './server/routes/certificates';
import { verifyRouter } from './server/routes/verify';
import { dashboardRouter } from './server/routes/dashboard';
import { institutionsRouter } from './server/routes/institutions';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  // Basic security and parsing middlewares
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Vite dev scripts and styles
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Attach user authentication context
  app.use(authenticateToken);

  // Initialize DB and Blockchain
  console.log('[CertiChain] Initializing database and blockchain services...');
  await db.init();
  try {
    await blockchainService.init();
    await bootstrapDemoCertificates();
  } catch (err) {
    console.error('[CertiChain] Error during blockchain bootstrap:', err);
  }

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'CertiChain API',
      version: '1.0.0',
    });
  });

  // REST API Routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/certificates', certificatesRouter);
  app.use('/api/v1/verify', verifyRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/institutions', institutionsRouter);

  // Global API error handler
  app.use('/api', (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[API Error]', err);
    res.status(err.status || 500).json({
      error: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred.',
    });
  });

  // Vite integration: dev middleware in development, static files in production
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = config.port;
  app.listen(port, '0.0.0.0', () => {
    console.log(`[CertiChain] Server running at http://0.0.0.0:${port}`);
    console.log(`[CertiChain] Public verification endpoint ready at /verify/:certificateId`);
  });
}

startServer().catch(err => {
  console.error('[CertiChain] Fatal error during startup:', err);
  process.exit(1);
});
