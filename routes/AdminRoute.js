import express from 'express';
import pool from '../utils/dblogin.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const router = express.Router();

// CREATE admin
router.post('/admins', async (req, res) => {
  const { poi_id, telno, email, level, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO admins (poi_id, telno, email, level, password)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [poi_id, telno, email, level, hashedPassword]
    );

    const admin = result.rows[0];

    const token = jwt.sign(
      { id: admin.id, email: admin.email, level: admin.level },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({
      admin,
      token
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET all admins
router.get('/admins', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM admins');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET admin by ID
router.get('/admins/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM admins WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Admin not found' });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE admin
router.put('/admins/:id', async (req, res) => {
  const { poi_id, telno, email, level } = req.body;

  try {
    const result = await pool.query(
      `UPDATE admins
       SET poi_id = $1, telno = $2, email = $3, level = $4
       WHERE id = $5
       RETURNING *`,
      [poi_id, telno, email, level, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Admin not found' });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE admin
router.delete('/admins/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM admins WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Admin not found' });

    res.json({ message: 'Admin deleted', admin: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN admin
router.post('/admins/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const admin = result.rows[0];

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, level: admin.level },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      message: 'Login successful',
      admin,
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//change password
router.put('/admins/changepass/:id', async (req, res) => {
    const adminId = parseInt(req.params.id, 10);
    const { newpass, oldpass } = req.body;

    if (!newpass || !oldpass) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const adminResult = await pool.query('SELECT * from admins WHERE id = $1', [adminId]);
        const admin = adminResult.rows[0];

        if (!admin) {
            return res.status(404).json({ error: 'admin not found' });
        }

        const isOldPasswordCorrect = await bcrypt.compare(oldpass, admin.password);
        if (!isOldPasswordCorrect) {
            return res.status(400).json({ error: 'Old password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newpass, 10);

        await pool.query('UPDATE admins SET password = $1 WHERE id = $2', [hashedPassword, adminId]);

        res.status(200).json({ message: 'Password successfully updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});


export default router;
