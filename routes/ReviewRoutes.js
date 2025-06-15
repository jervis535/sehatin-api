import express from 'express';
import pool from '../utils/dblogin.js';

const router = express.Router();

// GET all reviews
router.get('/reviews', async (req, res) => {
    const { reviewer_id, reviewee_id } = req.query;

    let baseQuery = 'SELECT * FROM reviews';
    const conditions = [];
    const values = [];

    if (reviewer_id) {
        if (isNaN(reviewer_id)) {
            return res.status(400).json({ error: 'Invalid reviewer_id, must be an integer' });
        }
        values.push(parseInt(reviewer_id));
        conditions.push(`reviewer_id = $${values.length}`);
    }

    if (reviewee_id) {
        if (isNaN(reviewee_id)) {
            return res.status(400).json({ error: 'Invalid reviewee_id, must be an integer' });
        }
        values.push(parseInt(reviewee_id));
        conditions.push(`reviewee_id = $${values.length}`);
    }

    if (conditions.length > 0) {
        baseQuery += ' WHERE ' + conditions.join(' AND ');
    }

    try {
        const result = await pool.query(baseQuery, values);
        res.json(result.rows);
    } catch (err) {
        console.error('Error executing query:', err.message);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// GET a single review by ID
router.get('/reviews/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`SELECT * FROM reviews WHERE id = $1`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Review not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch review' });
    }
});

// UPDATE a review
router.put('/reviews/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { score, notes } = req.body;
        const result = await pool.query(
            `UPDATE reviews SET score = $1, notes = $2 WHERE id = $3 RETURNING *`,
            [score, notes, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Review not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to update review' });
    }
});

// DELETE a review
router.delete('/reviews/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`DELETE FROM reviews WHERE id = $1 RETURNING *`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Review not found' });
        }
        res.json({ message: 'Review deleted', review: result.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to delete review' });
    }
});

export default router;
