import axios from 'axios';

// Always use SBERT service for descriptive evaluation.
const SBERT_SERVICE_URL = process.env.SBERT_SERVICE_URL || 'http://localhost:5001';

export const evaluateDescriptiveAnswer = async (modelAnswer, studentAnswer) => {
  try {
    const response = await axios.post(`${SBERT_SERVICE_URL}/evaluate`, {
      model_answer: modelAnswer,
      student_answer: studentAnswer
    }, {
      timeout: 15000
    });

    // The SBERT service returns either { similarity, score } or { score }
    if (response.data) {
      if (typeof response.data.similarity === 'number') return response.data.similarity;
      if (typeof response.data.score === 'number') return Math.max(0, Math.min(1, response.data.score / 6));
    }

    // Fallback to simple similarity
    return simpleSimilarity(modelAnswer, studentAnswer);
  } catch (error) {
    console.error('SBERT evaluation error:', error.message);
    return simpleSimilarity(modelAnswer, studentAnswer);
  }
};

// Simple fallback similarity calculation
const simpleSimilarity = (text1, text2) => {
  if (!text1 || !text2) return 0;

  const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
};