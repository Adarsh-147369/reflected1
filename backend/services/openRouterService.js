import axios from 'axios';

// OpenRouter API configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Get configuration from environment (read at runtime, not import time)
const getOpenRouterConfig = () => ({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || 'deepseek/deepseek-chat-v3.1:free'
});

/**
 * Generate exam questions using OpenRouter API
 * @param {string} subjectName - Name of the subject
 * @param {string} stream - Engineering stream (CSE, ECE, EEE, mech, civil)
 * @returns {Promise<Object>} Object containing mcq and descriptive questions
 */
export const generateQuestionsWithOpenRouter = async (subjectName, stream) => {
  try {
    console.log(`🤖 Calling OpenRouter API for ${subjectName} (${stream})...`);

    // Get configuration
    const config = getOpenRouterConfig();

    // Validate API key
    if (!config.apiKey) {
      throw new Error('OpenRouter API key not configured. Please set OPENAI_API_KEY in .env file.');
    }

    // Construct the prompt
    const prompt = `Generate exam questions for ${subjectName} (${stream} stream).

Requirements:
- 8 Multiple Choice Questions (MCQ)
- 2 Descriptive Questions

Format your response as valid JSON only, with no additional text:
{
  "mcq": [
    {
      "question": "Question text",
      "options": {"A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D"},
      "correct_answer": "A"
    }
  ],
  "descriptive": [
    {
      "question": "Question text",
      "model_answer": "Detailed answer (20 - 30 words)"
    }
  ]
}

Important:
- All questions must be unique and relevant to ${subjectName}
- MCQ questions should test understanding of core concepts
- Descriptive questions should require detailed explanations
- Model answers should be comprehensive and accurate
- Return ONLY the JSON object, no markdown formatting or additional text
- Given question be in easy to meduim range and descriptive questions should be a easy questions`;

    // Make API request to OpenRouter
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: config.model,
        messages: [
          {
            role: "system",
            content: "You are an expert exam question generator for engineering subjects. Always respond with valid JSON only, without any markdown formatting or additional text."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      },
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5000',
          'X-Title': 'Adaptive Learning Platform'
        },
        timeout: 60000 // 60 second timeout
      }
    );

    // Extract content from response
    const content = response.data.choices[0].message.content;
    console.log('📥 Received response from OpenRouter');

    // Parse JSON response (handle potential markdown code blocks and extra text)
    let questions;
    try {
      // Remove markdown code blocks if present
      let cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Find the JSON object boundaries
      const jsonStart = cleanContent.indexOf('{');
      const jsonEnd = cleanContent.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
      }
      
      questions = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('❌ Failed to parse OpenRouter response:', parseError.message);
      console.error('Response content:', content.substring(0, 500) + '...');
      throw new Error('Invalid JSON response from OpenRouter API');
    }

    // Validate response structure
    if (!questions || typeof questions !== 'object') {
      throw new Error('Invalid response format from OpenRouter API');
    }

    if (!questions.mcq || !Array.isArray(questions.mcq)) {
      throw new Error('MCQ array missing or invalid in OpenRouter response');
    }

    if (!questions.descriptive || !Array.isArray(questions.descriptive)) {
      throw new Error('Descriptive array missing or invalid in OpenRouter response');
    }

    // Validate MCQ count (should be 8)
    if (questions.mcq.length !== 8) {
      console.warn(`⚠️ Expected 8 MCQs, got ${questions.mcq.length}. Adjusting...`);
      if (questions.mcq.length < 8) {
        throw new Error(`Insufficient MCQ questions: expected 8, got ${questions.mcq.length}`);
      }
      // Trim to 8 if more were generated
      questions.mcq = questions.mcq.slice(0, 8);
    }

    // Validate descriptive count (should be 2)
    if (questions.descriptive.length !== 2) {
      console.warn(`⚠️ Expected 2 descriptive questions, got ${questions.descriptive.length}. Adjusting...`);
      if (questions.descriptive.length < 2) {
        throw new Error(`Insufficient descriptive questions: expected 2, got ${questions.descriptive.length}`);
      }
      // Trim to 2 if more were generated
      questions.descriptive = questions.descriptive.slice(0, 2);
    }

    // Validate MCQ structure
    for (let i = 0; i < questions.mcq.length; i++) {
      const mcq = questions.mcq[i];
      if (!mcq.question || !mcq.options || !mcq.correct_answer) {
        throw new Error(`MCQ ${i + 1} missing required fields (question, options, or correct_answer)`);
      }
      if (typeof mcq.options !== 'object') {
        throw new Error(`MCQ ${i + 1} has invalid options structure`);
      }
      const optionKeys = Object.keys(mcq.options);
      if (optionKeys.length !== 4) {
        throw new Error(`MCQ ${i + 1} must have exactly 4 options, got ${optionKeys.length}`);
      }
      if (!['A', 'B', 'C', 'D'].includes(mcq.correct_answer)) {
        throw new Error(`MCQ ${i + 1} has invalid correct_answer: ${mcq.correct_answer}. Must be A, B, C, or D`);
      }
    }

    // Validate descriptive structure
    for (let i = 0; i < questions.descriptive.length; i++) {
      const desc = questions.descriptive[i];
      if (!desc.question || !desc.model_answer) {
        throw new Error(`Descriptive question ${i + 1} missing required fields (question or model_answer)`);
      }
      if (typeof desc.question !== 'string' || typeof desc.model_answer !== 'string') {
        throw new Error(`Descriptive question ${i + 1} has invalid field types`);
      }
    }

    console.log(`✅ Successfully generated ${questions.mcq.length} MCQs and ${questions.descriptive.length} descriptive questions`);
    return questions;

  } catch (error) {
    console.error('❌ OpenRouter API error:', error.message);

    // Handle specific error types
    if (error.response) {
      // API returned an error response
      const status = error.response.status;
      const errorData = error.response.data;
      
      if (status === 401) {
        throw new Error('Invalid OpenRouter API key. Please check your OPENAI_API_KEY in .env file.');
      } else if (status === 429) {
        throw new Error('OpenRouter API rate limit exceeded. Please try again later.');
      } else if (status === 500) {
        throw new Error('OpenRouter API server error. Please try again later.');
      } else {
        throw new Error(`OpenRouter API error (${status}): ${errorData.error?.message || 'Unknown error'}`);
      }
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('OpenRouter API request timed out. Please try again.');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to OpenRouter API. Please check your internet connection.');
    }

    // Re-throw the error to be handled by the caller
    throw error;
  }
};
