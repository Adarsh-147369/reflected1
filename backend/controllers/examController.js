import { pool } from '../config/database.js';
import { generateQuestionsWithAI } from '../services/aiQuestionGenerator.js';
import { evaluateDescriptiveAnswer } from '../services/sbertEvaluator.js';
import { loadFallbackQuestions, hasFallbackQuestions } from '../services/fallbackQuestionService.js';

export const startExam = async (req, res) => {
  const client = await pool.connect();

  try {
    const { subject_id } = req.body;
    const user_id = req.user.id;

    await client.query('BEGIN');

    // Check if subject exists
    const subjectResult = await client.query(
      'SELECT * FROM subjects WHERE id = $1',
      [subject_id]
    );

    if (subjectResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Subject not found' });
    }

    const subject = subjectResult.rows[0];

    // Generate questions using AI with fallback
    console.log(`🤖 Generating AI questions for ${subject.name} (${subject.stream})...`);
    let generatedQuestions;
    let usedFallback = false;
    
    try {
      generatedQuestions = await generateQuestionsWithAI(subject.name, subject.stream);
      
      // Validate generated questions
      if (!generatedQuestions || !generatedQuestions.mcq || generatedQuestions.mcq.length !== 8) {
        throw new Error('Invalid MCQ count from AI');
      }
      if (!generatedQuestions.descriptive || generatedQuestions.descriptive.length !== 2) {
        throw new Error('Invalid descriptive question count from AI');
      }
      
      console.log(`✅ Successfully generated ${generatedQuestions.mcq.length} MCQs and ${generatedQuestions.descriptive.length} descriptive questions`);
    } catch (aiError) {
      console.error('❌ AI question generation failed:', aiError.message);
      
      // Try fallback questions
      console.log(`🔄 Attempting to load fallback questions...`);
      try {
        const hasFallback = await hasFallbackQuestions(subject.name, subject.stream);
        if (hasFallback) {
          generatedQuestions = await loadFallbackQuestions(subject.name, subject.stream);
          usedFallback = true;
          console.log(`✅ Successfully loaded fallback questions for ${subject.name}`);
        } else {
          throw new Error(`No fallback questions available for ${subject.name} (${subject.stream})`);
        }
      } catch (fallbackError) {
        console.error('❌ Fallback question loading failed:', fallbackError.message);
        await client.query('ROLLBACK');
        return res.status(500).json({ 
          error: 'Failed to generate or load questions. Please try again later.',
          details: `AI Error: ${aiError.message}, Fallback Error: ${fallbackError.message}`
        });
      }
    }

    // Create exam record
    const examResult = await client.query(
      `INSERT INTO exams (user_id, subject_id, status, started_at) 
       VALUES ($1, $2, 'in_progress', NOW()) 
       RETURNING *`,
      [user_id, subject_id]
    );

    const exam = examResult.rows[0];

    // Store MCQ questions
    const mcqPromises = generatedQuestions.mcq.map((q, index) => 
      client.query(
        `INSERT INTO exam_questions (exam_id, question_type, question_text, options, correct_answer) 
         VALUES ($1, 'mcq', $2, $3, $4) RETURNING *`,
        [exam.id, q.question, JSON.stringify(q.options), q.correct_answer]
      )
    );

    // Store descriptive questions
    const descriptivePromises = generatedQuestions.descriptive.map((q, index) =>
      client.query(
        `INSERT INTO exam_questions (exam_id, question_type, question_text, correct_answer) 
         VALUES ($1, 'descriptive', $2, $3) RETURNING *`,
        [exam.id, q.question, q.model_answer]
      )
    );

    const allQuestions = await Promise.all([...mcqPromises, ...descriptivePromises]);
    const questions = allQuestions.map(result => result.rows[0]);

    await client.query('COMMIT');

    // Don't send correct answers to frontend
    const questionsForFrontend = questions.map(q => {
      const { correct_answer, ...questionData } = q;
      // Ensure options is properly formatted (parse JSONB if needed)
      if (questionData.options && typeof questionData.options === 'string') {
        try {
          questionData.options = JSON.parse(questionData.options);
        } catch (e) {
          // If parsing fails, keep as is
        }
      }
      return questionData;
    });

    res.json({
      message: 'Exam started successfully',
      exam: {
        id: exam.id,
        subject_id: exam.subject_id,
        started_at: exam.started_at
      },
      questions: questionsForFrontend
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Start exam error:', error);
    res.status(500).json({ error: 'Failed to start exam' });
  } finally {
    client.release();
  }
};

export const submitExam = async (req, res) => {
  const client = await pool.connect();

  // ✅ Utility to sanitize numeric values
  const safeNum = (v) => {
    if (!isFinite(v) || isNaN(v)) return 0;
    return Number(v.toFixed(2));
  };

  try {
    const { exam_id, answers, tab_switch_count } = req.body;

    console.log(`📥 Received exam submission for exam_id: ${exam_id}`);
    console.log(`📊 Total answers received: ${answers?.length || 0}`);
    console.log(`🔄 Tab switch count: ${tab_switch_count}`);
    
    if (answers && answers.length > 0) {
      console.log("📝 Sample answers:", answers.slice(0, 2));
    }

    await client.query("BEGIN");

    // ✅ Validate exam
    const examResult = await client.query(
      "SELECT * FROM exams WHERE id = $1 AND user_id = $2",
      [exam_id, req.user.id]
    );

    if (examResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Exam not found" });
    }

    const exam = examResult.rows[0];

    if (exam.status === "completed") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Exam already submitted" });
    }

    // ✅ Fetch questions
    const questionsResult = await client.query(
      "SELECT * FROM exam_questions WHERE exam_id = $1 ORDER BY id",
      [exam_id]
    );

    const questions = questionsResult.rows;
    let mcq_score = 0;
    let descriptive_score = 0;

    // ✅ Evaluate answers
    for (const question of questions) {
      const studentAnswer = answers.find((a) => a.question_id === question.id);

      if (question.question_type === "mcq") {
        const marks = studentAnswer?.answer === question.correct_answer ? 1 : 0;
        mcq_score += marks;

        await client.query(
          "UPDATE exam_questions SET student_answer = $1, marks_obtained = $2 WHERE id = $3",
          [studentAnswer?.answer || "", marks, question.id]
        );
      }

      else if (question.question_type === "descriptive") {
        const studentAnswerText = studentAnswer?.answer || "";
        
        console.log(`📝 Evaluating descriptive question ${question.id}:`);
        console.log(
          `   Model answer: ${question.correct_answer?.substring(0, 100)}...`
        );
        console.log(
          `   Student answer: ${studentAnswerText?.substring(0, 100) || "(empty)"}...`
        );

        let similarity = 0;

        // ✅ Evaluate descriptive answer
        if (studentAnswerText.trim()) {
          try {
            similarity = await evaluateDescriptiveAnswer(
              question.correct_answer,
              studentAnswerText
            );

            similarity = isNaN(similarity)
              ? 0
              : Math.max(0, Math.min(1, similarity));
            console.log(`   ✅ Similarity: ${similarity.toFixed(4)}`);
          } catch (error) {
            console.error("   ❌ SBERT evaluation error:", error.message);
            similarity = 0;
          }
        } else {
          console.log(`   ⚠️ No answer provided, score = 0`);
        }

        // similarity: 0–1 → marks: 0–6
        let marks = Math.round(similarity * 6 * 100) / 100;
        marks = safeNum(marks);

        descriptive_score += marks;

        await client.query(
          "UPDATE exam_questions SET student_answer = $1, marks_obtained = $2 WHERE id = $3",
          [studentAnswerText, marks, question.id]
        );
      }
    }

    // ✅ Calculate total score
    const total_score = safeNum(mcq_score + descriptive_score);

    // ✅ Percentage: total 20 marks
    let percentage = (total_score / 20) * 100;
    percentage = safeNum(percentage);

    const auto_submitted = tab_switch_count > 0;

    // ✅ Update exam
    await client.query(
      `UPDATE exams 
       SET mcq_score = $1, descriptive_score = $2, total_score = $3, 
           percentage = $4, status = 'completed', completed_at = NOW(),
           tab_switch_count = $5, auto_submitted = $6
       WHERE id = $7`,
      [mcq_score, descriptive_score, total_score, percentage, tab_switch_count, auto_submitted, exam_id]
    );

    // ✅ Subject info
    const subjectResult = await client.query(
      "SELECT * FROM subjects WHERE id = $1",
      [exam.subject_id]
    );

    const subject = subjectResult.rows[0];

    // ✅ Improvement tracking
    const existingTracking = await client.query(
      "SELECT * FROM improvement_tracking WHERE user_id = $1 AND subject_id = $2",
      [req.user.id, exam.subject_id]
    );

    if (existingTracking.rows.length === 0) {
      await client.query(
        `INSERT INTO improvement_tracking (user_id, subject_id, initial_score, current_score, improvement_percentage)
         VALUES ($1, $2, $3, $3, 0)`,
        [req.user.id, exam.subject_id, percentage]
      );
    } else {
      const initial = existingTracking.rows[0].initial_score;

      // ✅ Improvement → prevent division-by-zero
      let improvement = 0;

      if (initial > 0) {
        improvement = ((percentage - initial) / initial) * 100;
      }

      improvement = safeNum(improvement);

      await client.query(
        `UPDATE improvement_tracking 
         SET current_score = $1, improvement_percentage = $2, updated_at = NOW()
         WHERE user_id = $3 AND subject_id = $4`,
        [percentage, improvement, req.user.id, exam.subject_id]
      );
    }

    await client.query("COMMIT");

    // ✅ Resources based on score
    const resourceCategory =
      percentage <= 40 ? "below_40" :
      percentage <= 80 ? "40_to_80" :
      "above_80";

    const resourcesResult = await client.query(
      `SELECT * FROM learning_resources 
       WHERE stream = $1 AND subject_name = $2 AND performance_category = $3`,
      [subject.stream, subject.name, resourceCategory]
    );

    res.json({
      message: "Exam submitted successfully",
      results: {
        mcq_score,
        descriptive_score,
        total_score,
        percentage,
        auto_submitted,
      },
      resources: resourcesResult.rows,
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Submit exam error:", error);
    res.status(500).json({ error: "Failed to submit exam" });
  } finally {
    client.release();
  }
};


export const getExamHistory = async (req, res) => {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT e.*, s.name as subject_name, s.stream
       FROM exams e
       JOIN subjects s ON e.subject_id = s.id
       WHERE e.user_id = $1 AND e.status = 'completed'
       ORDER BY e.completed_at DESC`,
      [req.user.id]
    );

    res.json({ exams: result.rows });
  } catch (error) {
    console.error('Get exam history error:', error);
    res.status(500).json({ error: 'Failed to fetch exam history' });
  } finally {
    client.release();
  }
};

export const getEvaluationDetails = async (req, res) => {
  const client = await pool.connect();

  try {
    const { examId } = req.params;

    // Get exam details
    const examResult = await client.query(
      `SELECT e.*, s.name as subject_name 
       FROM exams e
       JOIN subjects s ON e.subject_id = s.id
       WHERE e.id = $1 AND e.user_id = $2`,
      [examId, req.user.id]
    );

    if (examResult.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const exam = examResult.rows[0];

    // Only show evaluation for completed exams
    if (exam.status !== 'completed') {
      return res.status(400).json({ error: 'Exam not yet completed' });
    }

    // Get all questions with answers and evaluation
    const questionsResult = await client.query(
      `SELECT 
         id,
         question_type,
         question_text,
         options,
         correct_answer,
         student_answer,
         marks_obtained
       FROM exam_questions 
       WHERE exam_id = $1 
       ORDER BY id`,
      [examId]
    );

    const questions = questionsResult.rows.map(q => {
      // Parse options if it's a string (JSONB)
      let options = q.options;
      if (typeof options === 'string') {
        try {
          options = JSON.parse(options);
        } catch (e) {
          options = q.options;
        }
      }

      // For descriptive questions, calculate similarity from marks
      // Similarity = marks_obtained / 6 (since max marks is 6)
      const similarity = q.question_type === 'descriptive' && q.marks_obtained != null
        ? parseFloat(q.marks_obtained) / 6
        : null;

      return {
        ...q,
        options: options,
        similarity: similarity
      };
    });

    res.json({
      exam: {
        id: exam.id,
        subject_name: exam.subject_name,
        subject_id: exam.subject_id,
        mcq_score: exam.mcq_score,
        descriptive_score: exam.descriptive_score,
        total_score: exam.total_score,
        percentage: exam.percentage,
        completed_at: exam.completed_at,
        auto_submitted: exam.auto_submitted,
        tab_switch_count: exam.tab_switch_count
      },
      questions: questions
    });
  } catch (error) {
    console.error('Get evaluation details error:', error);
    res.status(500).json({ error: 'Failed to fetch evaluation details' });
  } finally {
    client.release();
  }
};