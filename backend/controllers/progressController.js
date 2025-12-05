import { pool } from '../config/database.js';

export const getImprovementData = async (req, res) => {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT it.*, s.name as subject_name, s.stream
       FROM improvement_tracking it
       JOIN subjects s ON it.subject_id = s.id
       WHERE it.user_id = $1
       ORDER BY it.updated_at DESC`,
      [req.user.id]
    );

    // Get exam history for chart data
    const examHistory = await client.query(
      `SELECT e.*, s.name as subject_name
       FROM exams e
       JOIN subjects s ON e.subject_id = s.id
       WHERE e.user_id = $1 AND e.status = 'completed'
       ORDER BY e.completed_at ASC`,
      [req.user.id]
    );

    res.json({
      improvement_tracking: result.rows,
      exam_history: examHistory.rows
    });
  } catch (error) {
    console.error('Get improvement data error:', error);
    res.status(500).json({ error: 'Failed to fetch improvement data' });
  } finally {
    client.release();
  }
};

export const getUserProgress = async (req, res) => {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT up.*, lr.resource_title, lr.resource_type, lr.subject_name
       FROM user_progress up
       JOIN learning_resources lr ON up.resource_id = lr.id
       WHERE up.user_id = $1
       ORDER BY up.started_at DESC`,
      [req.user.id]
    );

    const totalResources = result.rows.length;
    const completedResources = result.rows.filter(r => r.completed).length;
    const overallProgress = totalResources > 0 ? 
      (completedResources / totalResources) * 100 : 0;

    res.json({
      progress: result.rows,
      stats: {
        total_resources: totalResources,
        completed_resources: completedResources,
        overall_progress: overallProgress.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Get user progress error:', error);
    res.status(500).json({ error: 'Failed to fetch user progress' });
  } finally {
    client.release();
  }
};