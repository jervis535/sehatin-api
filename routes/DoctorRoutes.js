import express from 'express';
import pool from '../utils/dblogin.js';

const router = express.Router();

// GET all doctors
router.get('/doctors', async (req, res) => {
    const { user_id, specialization, verified } = req.query;

    try {
        let baseQuery = 'SELECT * FROM doctors';
        const conditions = [];
        const values = [];

        if (verified === 'false') {
            conditions.push(`verified = false`);
        } else {
            conditions.push(`verified = true`);
        }

        if (user_id) {
            conditions.push(`user_id = $${values.length + 1}`);
            values.push(user_id);
        }

        if (specialization) {
            conditions.push(`specialization ILIKE $${values.length + 1}`);
            values.push(`%${specialization}%`);
        }

        if (conditions.length > 0) {
            baseQuery += ' WHERE ' + conditions.join(' AND ');
        }

        const result = await pool.query(baseQuery, values);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch doctors' });
    }
});

// PUT update a doctor
router.put('/doctors/:id', async (req, res) => {
    const { id } = req.params;
    const { specialization, poi_id } = req.body;

    try {
        const result = await pool.query(
            'UPDATE doctors SET specialization = $1, poi_id = $2 WHERE user_id = $3 RETURNING *',
            [specialization, poi_id, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update doctor' });
    }
});

// verify
router.put('/doctors/verify/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'UPDATE doctors SET verified = True WHERE user_id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update doctor' });
    }
});

export default router
