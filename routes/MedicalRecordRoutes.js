import express from 'express';
import pool from '../utils/dblogin.js';

const router = express.Router();

// Create a new medical history
router.post('/medicalrecord', async (req, res) => {
  const { user_id, doctor_id, medications, medical_conditions, notes } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO medical_records (user_id, doctor_id, medications, medical_conditions, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, doctor_id, medications, medical_conditions, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all medical history
router.get('/medicalrecord', async (req, res) => {
  const userId = req.query.user_id;
  try {
    let result;

    if (userId) {
      result = await pool.query(
        'SELECT * FROM medical_records WHERE user_id = $1 OR doctor_id = $1',
        [userId]
      );
    } else {
      result = await pool.query('SELECT * FROM medical_records');
    }
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Update medical history by id
router.put('/medicalrecord/:id', async (req, res) => {
  const { medications, medical_conditions, notes } = req.body;
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE medical_records
       SET medications = $1, medical_conditions = $2, notes = $3
       WHERE id = $4
       RETURNING *`,
      [medications, medical_conditions, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medical history not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete medical history by id
router.delete('/medicalrecord/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM medical_records WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medical history not found' });
    }

    res.json({ message: 'Medical history deleted', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
