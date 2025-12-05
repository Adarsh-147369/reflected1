import pdfreader from 'pdfreader';
import { promises as fs } from 'fs';

export const extractQuestionsFromPDF = async (pdfPath) => {
  try {
    const rows = {};
    let questions = {
      mcq: [],
      descriptive: []
    };

    return new Promise((resolve, reject) => {
      new pdfreader.PdfReader().parseFileItems(pdfPath, (err, item) => {
        if (err) {
          reject(err);
          return;
        }

        if (!item) {
          // End of file, process the collected rows
          const text = Object.keys(rows)
            .sort((y1, y2) => parseFloat(y1) - parseFloat(y2))
            .map(y => rows[y].join(' '))
            .join('\n');

          // Process text to extract questions
          const questionBlocks = text.split(/\n\s*\n/); // Split by empty lines
          
          questionBlocks.forEach(block => {
            if (block.trim().startsWith('MCQ:')) {
              const mcqMatch = block.match(/MCQ:\s*(.+)\nA\)\s*(.+)\nB\)\s*(.+)\nC\)\s*(.+)\nD\)\s*(.+)\nAnswer:\s*([A-D])/i);
              if (mcqMatch) {
                questions.mcq.push({
                  question: mcqMatch[1].trim(),
                  options: {
                    A: mcqMatch[2].trim(),
                    B: mcqMatch[3].trim(),
                    C: mcqMatch[4].trim(),
                    D: mcqMatch[5].trim()
                  },
                  correct_answer: mcqMatch[6].trim()
                });
              }
            } else if (block.trim().startsWith('DESC:')) {
              const descMatch = block.match(/DESC:\s*(.+)\nModel Answer:\s*(.+)/i);
              if (descMatch) {
                questions.descriptive.push({
                  question: descMatch[1].trim(),
                  model_answer: descMatch[2].trim()
                });
              }
            }
          });

          resolve(questions);
          return;
        }

        if (item.text) {
          // Collect text items
          const y = item.y.toFixed(3);
          rows[y] = rows[y] || [];
          rows[y].push(item.text);
        }
      });
    });
  } catch (error) {
    console.error('Error extracting questions from PDF:', error);
    throw error;
  }
};

// Function to validate PDF question format
export const validatePDFFormat = async (pdfPath) => {
  try {
    const questions = await extractQuestionsFromPDF(pdfPath);
    
    // Basic validation
    if (!questions.mcq.length && !questions.descriptive.length) {
      throw new Error('No valid questions found in PDF');
    }

    // Validate MCQs
    questions.mcq.forEach((mcq, index) => {
      if (!mcq.question || !mcq.options || !mcq.correct_answer) {
        throw new Error(`Invalid MCQ format at question ${index + 1}`);
      }
      if (!['A', 'B', 'C', 'D'].includes(mcq.correct_answer)) {
        throw new Error(`Invalid correct answer at MCQ ${index + 1}`);
      }
    });

    // Validate descriptive questions
    questions.descriptive.forEach((desc, index) => {
      if (!desc.question || !desc.model_answer) {
        throw new Error(`Invalid descriptive question format at question ${index + 1}`);
      }
    });

    return true;
  } catch (error) {
    console.error('PDF validation error:', error);
    return false;
  }
};