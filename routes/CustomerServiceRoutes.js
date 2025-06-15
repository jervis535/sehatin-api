import express from 'express';
import pool from '../utils/dblogin.js';

const router = express.Router();

// GET all customer service records
router.get('/customerservices', async (req, res) => {
    const { user_id, poi_id, verified } = req.query;

    let baseQuery = 'SELECT * FROM customer_services';
    const values = [];
    const conditions = [];

    if (verified === 'false') {
        conditions.push('verified = false');
    } else {
        conditions.push('verified = true');
    }

    if (user_id) {
        values.push(user_id);
        conditions.push(`user_id = $${values.length}`);
    }

    if (poi_id) {
        values.push(poi_id);
        conditions.push(`poi_id = $${values.length}`);
    }

    if (conditions.length > 0) {
        baseQuery += ' WHERE ' + conditions.join(' AND ');
    }

    try {
        const result = await pool.query(baseQuery, values);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch customer services' });
    }
});

// GET customer service record by id
router.get('/customerservices/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM customer_services WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer service entry not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch customer service entry' });
    }
});


// PUT update a customer service record
router.put('/customerservices/:id', async (req, res) => {
    const { id } = req.params;
    const { poi_id } = req.body;
    try {
        const result = await pool.query(
            'UPDATE customer_services SET poi_id = $1 WHERE user_id = $2 RETURNING *',
            [poi_id, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer service entry not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update customer service entry' });
    }
});

// verify
router.put('/customerservices/verify/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'UPDATE customer_services SET verified = TRUE WHERE user_id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer service entry not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update customer service entry' });
    }
});

export default router;
