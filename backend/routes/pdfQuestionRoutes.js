import express from 'express';
import multer from 'multer';
import path from 'path';
import { extractQuestionsFromPDF, validatePDFFormat } from '../services/pdfQuestionExtractor.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Upload and process PDF questions
router.post('/upload', authenticate, upload.single('questionPdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    const pdfPath = req.file.path;
    
    // Validate PDF format
    const isValid = await validatePDFFormat(pdfPath);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid PDF format or structure' });
    }

    // Extract questions
    const questions = await extractQuestionsFromPDF(pdfPath);
    
    // Return the extracted questions
    res.json({
      message: 'Questions extracted successfully',
      questions
    });

  } catch (error) {
    console.error('PDF processing error:', error);
    res.status(500).json({ error: 'Failed to process PDF file' });
  }
});

export default router;