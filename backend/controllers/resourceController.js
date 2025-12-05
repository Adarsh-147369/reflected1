import { pool } from '../config/database.js';

export const getResourcesForUser = async (req, res) => {
  const client = await pool.connect();

  try {
    const { subject_id } = req.params;

    // Get latest exam for this subject
    const examResult = await client.query(
      `SELECT e.*, s.name as subject_name, s.stream
       FROM exams e
       JOIN subjects s ON e.subject_id = s.id
       WHERE e.user_id = $1 AND e.subject_id = $2 AND e.status = 'completed'
       ORDER BY e.completed_at DESC
       LIMIT 1`,
      [req.user.id, subject_id]
    );

    if (examResult.rows.length === 0) {
      return res.status(404).json({ error: 'No completed exam found for this subject' });
    }

    const exam = examResult.rows[0];
    const percentage = exam.percentage;

    const resourceCategory = percentage <= 40 ? 'below_40' : 
                           percentage <= 80 ? '40_to_80' : 'above_80';

    const resourcesResult = await client.query(
      `SELECT * FROM learning_resources 
       WHERE stream = $1 AND subject_name = $2 AND performance_category = $3`,
      [exam.stream, exam.subject_name, resourceCategory]
    );

    // Get user progress for these resources
    const progressResult = await client.query(
      `SELECT resource_id, completed, progress_percentage 
       FROM user_progress 
       WHERE user_id = $1`,
      [req.user.id]
    );

    const progressMap = {};
    progressResult.rows.forEach(p => {
      progressMap[p.resource_id] = {
        completed: p.completed,
        progress_percentage: p.progress_percentage
      };
    });

    const resourcesWithProgress = resourcesResult.rows.map(r => ({
      ...r,
      progress: progressMap[r.id] || { completed: false, progress_percentage: 0 }
    }));

    res.json({
      resources: resourcesWithProgress,
      performance: {
        percentage,
        category: resourceCategory
      }
    });
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  } finally {
    client.release();
  }
};

export const updateResourceProgress = async (req, res) => {
  const client = await pool.connect();

  try {
    const { resource_id } = req.params;
    const { progress_percentage, completed } = req.body;

    // Check if progress record exists
    const existing = await client.query(
      'SELECT * FROM user_progress WHERE user_id = $1 AND resource_id = $2',
      [req.user.id, resource_id]
    );

    if (existing.rows.length === 0) {
      // Create new progress record
      await client.query(
        `INSERT INTO user_progress (user_id, resource_id, progress_percentage, completed, completed_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.user.id, resource_id, progress_percentage, completed, completed ? new Date() : null]
      );
    } else {
      // Update existing progress
      await client.query(
        `UPDATE user_progress 
         SET progress_percentage = $1, completed = $2, completed_at = $3
         WHERE user_id = $4 AND resource_id = $5`,
        [progress_percentage, completed, completed ? new Date() : null, req.user.id, resource_id]
      );
    }

    res.json({ message: 'Progress updated successfully' });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  } finally {
    client.release();
  }
};