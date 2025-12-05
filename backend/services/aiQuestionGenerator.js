import { generateQuestionsWithOpenRouter } from './openRouterService.js';


export const generateQuestionsWithAI = async (subjectName, stream) => {
  console.log(`🤖 Generating AI questions for ${subjectName} (${stream})...`);
  
  
  const questions = await generateQuestionsWithOpenRouter(subjectName, stream);
  
  console.log(`✅ Successfully generated ${questions.mcq.length} MCQs and ${questions.descriptive.length} descriptive questions`);
  return questions;
};

