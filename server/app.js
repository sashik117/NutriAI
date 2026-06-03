import cors from 'cors';
import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createAiRouter } from './routes/aiRoutes.js';
import { createAuthRouter } from './routes/authRoutes.js';
import { createCoachRouter } from './routes/coachRoutes.js';
import { createEntityRouter } from './routes/entityRoutes.js';
import { createFileRouter } from './routes/fileRoutes.js';
import { createHealthRouter } from './routes/healthRoutes.js';

export async function createApp({ aiService, distDir, nutritionService, uploadedFiles, uploadsDir }) {
  await fs.mkdir(uploadsDir, { recursive: true });

  const app = express();
  const upload = multer({ dest: uploadsDir });

  app.set('trust proxy', 1);
  app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()) : true,
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use('/uploads', express.static(uploadsDir));

  app.use('/api/health', createHealthRouter());
  app.use('/api/auth', createAuthRouter());
  app.use('/api/coach', createCoachRouter());
  app.use('/api/entities', createEntityRouter());
  app.use('/api/files', createFileRouter({ upload, uploadedFiles }));
  app.use('/api/ai', createAiRouter({ aiService, nutritionService }));

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(distDir));
    app.get(/.*/, (req, res) => {
      if (req.path.startsWith('/api')) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || 'Server error' });
  });

  return app;
}
