import { Router } from 'express';
import { requireAuth } from '../auth/authService.js';

export function createFileRouter({ upload, uploadedFiles }) {
  const router = Router();
  router.use(requireAuth);

  router.post('/', upload.single('file'), (req, res) => {
    const fileUrl = `/uploads/${req.file.filename}`;
    uploadedFiles.set(fileUrl, {
      path: req.file.path,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
    });
    res.status(201).json({ file_url: fileUrl });
  });

  return router;
}
