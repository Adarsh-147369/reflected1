import { pool } from '../config/database.js';

export const getAllUsers = async (req, res) => {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT id, full_name, email, mobile_number, stream, role, created_at 
       FROM users 
       WHERE role = 'student'
       ORDER BY created_at DESC`
    );

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  } finally {
    client.release();
  }
};

export const getOverallImprovement = async (req, res) => {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT 
        u.id, u.full_name, u.email, u.stream,
        COUNT(DISTINCT e.id) as total_exams,
        AVG(e.percentage) as avg_score,
        MAX(e.percentage) as best_score,
        MIN(e.percentage) as worst_score
       FROM users u
       LEFT JOIN exams e ON u.id = e.user_id AND e.status = 'completed'
       WHERE u.role = 'student'
       GROUP BY u.id, u.full_name, u.email, u.stream
       ORDER BY avg_score DESC NULLS LAST`
    );

    // Get improvement tracking data
    const improvementData = await client.query(
      `SELECT 
        it.user_id,
        u.full_name,
        s.name as subject_name,
        it.initial_score,
        it.current_score,
        it.improvement_percentage,
        it.resources_completed,
        it.total_resources_assigned
       FROM improvement_tracking it
       JOIN users u ON it.user_id = u.id
       JOIN subjects s ON it.subject_id = s.id
       ORDER BY it.improvement_percentage DESC`
    );

    res.json({
      user_performance: result.rows,
      improvement_tracking: improvementData.rows
    });
  } catch (error) {
    console.error('Get overall improvement error:', error);
    res.status(500).json({ error: 'Failed to fetch improvement data' });
  } finally {
    client.release();
  }
};

export const getSubjectStatistics = async (req, res) => {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT 
        s.name as subject_name,
        s.stream,
        COUNT(DISTINCT e.user_id) as students_attempted,
        AVG(e.percentage) as avg_score,
        MAX(e.percentage) as highest_score,
        MIN(e.percentage) as lowest_score
       FROM subjects s
       LEFT JOIN exams e ON s.id = e.subject_id AND e.status = 'completed'
       GROUP BY s.id, s.name, s.stream
       ORDER BY s.stream, s.name`
    );

    res.json({ statistics: result.rows });
  } catch (error) {
    console.error('Get subject statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  } finally {
    client.release();
  }
};

export const addLearningResource = async (req, res) => {
  const client = await pool.connect();

  try {
    const { stream, subject_name, performance_category, resource_type, resource_title, resource_url } = req.body;

    const result = await client.query(
      `INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [stream, subject_name, performance_category, resource_type, resource_title, resource_url]
    );

    res.status(201).json({
      message: 'Resource added successfully',
      resource: result.rows[0]
    });
  } catch (error) {
    console.error('Add resource error:', error);
    res.status(500).json({ error: 'Failed to add resource' });
  } finally {
    client.release();
  }
};

export const getStudentProgress = async (req, res) => {
  const client = await pool.connect();

  try {
    const { userId } = req.params;

    // Get student basic info
    const studentResult = await client.query(
      `SELECT id, full_name, email, mobile_number, stream, created_at 
       FROM users 
       WHERE id = $1 AND role = 'student'`,
      [userId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = studentResult.rows[0];

    // Get exam history
    const examsResult = await client.query(
      `SELECT 
        e.id,
        s.name as subject_name,
        e.percentage,
        e.total_score,
        e.mcq_score,
        e.descriptive_score,
        e.completed_at,
        e.auto_submitted,
        e.tab_switch_count
       FROM exams e
       JOIN subjects s ON e.subject_id = s.id
       WHERE e.user_id = $1 AND e.status = 'completed'
       ORDER BY e.completed_at DESC`,
      [userId]
    );

    // Get resource progress by subject
    const resourcesResult = await client.query(
      `SELECT 
        s.name as subject_name,
        COUNT(DISTINCT lr.id) as total_resources,
        COUNT(DISTINCT CASE WHEN up.completed = true THEN up.resource_id END) as completed_resources,
        ROUND(
          (COUNT(DISTINCT CASE WHEN up.completed = true THEN up.resource_id END)::numeric / 
          NULLIF(COUNT(DISTINCT lr.id), 0) * 100), 2
        ) as completion_percentage
       FROM subjects s
       LEFT JOIN learning_resources lr ON s.name = lr.subject_name AND s.stream = lr.stream
       LEFT JOIN user_progress up ON lr.id = up.resource_id AND up.user_id = $1
       WHERE s.stream = $2
       GROUP BY s.name
       HAVING COUNT(DISTINCT lr.id) > 0
       ORDER BY s.name`,
      [userId, student.stream]
    );

    // Get improvement tracking
    const improvementResult = await client.query(
      `SELECT 
        s.name as subject_name,
        it.initial_score,
        it.current_score,
        it.improvement_percentage,
        it.resources_completed,
        it.total_resources_assigned
       FROM improvement_tracking it
       JOIN subjects s ON it.subject_id = s.id
       WHERE it.user_id = $1
       ORDER BY s.name`,
      [userId]
    );

    res.json({
      student: student,
      exams: examsResult.rows,
      resources: resourcesResult.rows,
      improvement: improvementResult.rows
    });
  } catch (error) {
    console.error('Get student progress error:', error);
    res.status(500).json({ error: 'Failed to fetch student progress' });
  } finally {
    client.release();
  }
};

export const deleteStudent = async (req, res) => {
  const client = await pool.connect();

  try {
    const { userId } = req.params;

    await client.query('BEGIN');

    // Check if student exists
    const studentResult = await client.query(
      `SELECT id, role FROM users WHERE id = $1`,
      [userId]
    );

    if (studentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = studentResult.rows[0];

    // Prevent deletion of admin users
    if (student.role === 'admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Cannot delete admin users' });
    }

    // Prevent self-deletion
    if (parseInt(userId) === req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Cannot delete your own account' });
    }

    // Count related records before deletion
    const examsCount = await client.query(
      `SELECT COUNT(*) as count FROM exams WHERE user_id = $1`,
      [userId]
    );

    const progressCount = await client.query(
      `SELECT COUNT(*) as count FROM user_progress WHERE user_id = $1`,
      [userId]
    );

    // Delete user (CASCADE will handle related records)
    await client.query(
      `DELETE FROM users WHERE id = $1`,
      [userId]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Student deleted successfully',
      deleted: {
        user_id: parseInt(userId),
        exams_deleted: parseInt(examsCount.rows[0].count),
        progress_records_deleted: parseInt(progressCount.rows[0].count)
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete student error:', error);
    
    if (error.code === '23503') {
      return res.status(409).json({ error: 'Cannot delete: related records exist' });
    }
    
    res.status(500).json({ error: 'Failed to delete student' });
  } finally {
    client.release();
  }
};

export const deleteExam = async (req, res) => {
  const client = await pool.connect();

  try {
    const { examId } = req.params;

    await client.query('BEGIN');

    // Check if exam exists and get details
    const examResult = await client.query(
      `SELECT e.id, e.user_id, e.subject_id, e.percentage 
       FROM exams e 
       WHERE e.id = $1`,
      [examId]
    );

    if (examResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Exam not found' });
    }

    const exam = examResult.rows[0];

    // Count questions before deletion
    const questionsCount = await client.query(
      `SELECT COUNT(*) as count FROM exam_questions WHERE exam_id = $1`,
      [examId]
    );

    // Delete exam (CASCADE will handle exam_questions)
    await client.query(
      `DELETE FROM exams WHERE id = $1`,
      [examId]
    );

    // Recalculate improvement tracking
    const remainingExams = await client.query(
      `SELECT percentage 
       FROM exams 
       WHERE user_id = $1 AND subject_id = $2 AND status = 'completed'
       ORDER BY completed_at ASC`,
      [exam.user_id, exam.subject_id]
    );

    if (remainingExams.rows.length > 0) {
      const initialScore = remainingExams.rows[0].percentage;
      const currentScore = remainingExams.rows[remainingExams.rows.length - 1].percentage;
      const improvementPercentage = initialScore > 0 
        ? ((currentScore - initialScore) / initialScore) * 100 
        : 0;

      await client.query(
        `UPDATE improvement_tracking 
         SET initial_score = $1, 
             current_score = $2, 
             improvement_percentage = $3,
             updated_at = NOW()
         WHERE user_id = $4 AND subject_id = $5`,
        [initialScore, currentScore, improvementPercentage, exam.user_id, exam.subject_id]
      );
    } else {
      // No exams left for this subject, delete improvement tracking
      await client.query(
        `DELETE FROM improvement_tracking 
         WHERE user_id = $1 AND subject_id = $2`,
        [exam.user_id, exam.subject_id]
      );
    }

    await client.query('COMMIT');

    res.json({
      message: 'Exam deleted successfully',
      deleted: {
        exam_id: parseInt(examId),
        questions_deleted: parseInt(questionsCount.rows[0].count)
      },
      updated_improvement: {
        user_id: exam.user_id,
        subject_id: exam.subject_id,
        recalculated: true
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete exam error:', error);
    res.status(500).json({ error: 'Failed to delete exam' });
  } finally {
    client.release();
  }
};