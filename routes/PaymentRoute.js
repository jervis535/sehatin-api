import express from 'express';
import pool from '../utils/dblogin.js';

const router = express.Router();

// Daily recap endpoint
router.get('/payments/daily', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                DATE(created_at) AS date, 
                SUM(amount) AS total_amount
            FROM payments
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);
        
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching daily payments recap:', error);
        res.status(500).json({ message: 'Error fetching data' });
    }
});

// Monthly recap endpoint
router.get('/payments/monthly', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                TO_CHAR(created_at, 'YYYY-MM') AS month, 
                SUM(amount) AS total_amount
            FROM payments
            GROUP BY TO_CHAR(created_at, 'YYYY-MM')
            ORDER BY month DESC
        `);
        
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching monthly payments recap:', error);
        res.status(500).json({ message: 'Error fetching data' });
    }
});

export default router;