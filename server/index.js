import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { pool } from './db.js';
import { AIService } from './services/aiService.js';
import { NutritionService } from './services/nutritionService.js';

const port = Number(process.env.PORT || 4000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '..', 'uploads');
const distDir = path.resolve(__dirname, '..', 'dist');
const uploadedFiles = new Map();

const aiService = new AIService({ uploadedFiles });
const nutritionService = new NutritionService();
const app = await createApp({ aiService, distDir, nutritionService, uploadedFiles, uploadsDir });

const server = app.listen(port, () => {
  console.log(`NutriAI backend listening on http://localhost:${port}`);
});

process.on('SIGINT', async () => {
  server.close();
  await pool.end();
  process.exit(0);
});
