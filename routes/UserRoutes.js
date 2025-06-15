import express from 'express';
import pool from '../utils/dblogin.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET
const ALLOWED_ROLES = ['doctor', 'customer service', 'user'];

//hashing
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

//gets data from all users (except password)
router.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, email, telno, role, consultation_count FROM users');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

//find user by id
router.get('/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    try {
        const result = await pool.query('SELECT id, username, email, telno, role, consultation_count FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

// creates a new user
router.post('/users', async (req, res) => {
    const { username, email, password, telno, role, specialization, poi_id} = req.body;

    if (!username || !email || !password || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    const client = await pool.connect();
    try {
        const hashedPassword = await hashPassword(password);

        await client.query('BEGIN');

        const userResult = await client.query(
            'INSERT INTO users (username, email, password, telno, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, telno, role',
            [username, email, hashedPassword, telno || null, role]
        );

        const user = userResult.rows[0];

        if (role === 'doctor') {
            if (!specialization || !poi_id) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Missing specialization or poi_id for doctor' });
            }
            await client.query(
                'INSERT INTO doctors (user_id, specialization, poi_id) VALUES ($1, $2, $3)',
                [user.id, specialization, poi_id]
            );
        } else if (role === 'customer service') {
            if (!poi_id) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Missing poi_id for customer service' });
            }
            await client.query(
                'INSERT INTO customer_services (user_id, poi_id) VALUES ($1, $2)',
                [user.id, poi_id]
            );
        }

        await client.query('COMMIT');

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        res.status(201).json({
            token,
            user
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        if (error.code === '23505') {
            if (error.constraint.includes('username')) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            if (error.constraint.includes('email')) {
                return res.status(400).json({ error: 'Email already exists' });
            }
            if (error.constraint.includes('telno')) {
                return res.status(400).json({ error: 'Phone number already exists' });
            }
        }
        res.status(500).json({ error: 'Database error' });
    } finally {
        client.release();
    }
});

// Update user by id
router.put('/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const { username, email, password, telno, role, specialization, poi_id } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (role && !ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    const client = await pool.connect();
    try {
        const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isCorrect = await bcrypt.compare(password, user.password);
        if (!isCorrect) {
            return res.status(400).json({ error: 'Password is incorrect' });
        }

        await client.query('BEGIN');

        const result = await client.query(
            'UPDATE users SET username = $1, email = $2, telno = $3, role = COALESCE($4, role) WHERE id = $5 RETURNING id, username, email, telno, role',
            [username, email, telno || null, role, userId]
        );

        if (role === 'doctor') {
            await client.query(
                'INSERT INTO doctors (user_id, specialization, poi_id) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET specialization = $2, poi_id = $3',
                [userId, specialization, poi_id]
            );
        } else if (role === 'customer service') {
            await client.query(
                'INSERT INTO customer_services (user_id, poi_id) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET poi_id = $2',
                [userId, poi_id]
            );
        }

        await client.query('COMMIT');
        res.status(200).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        if (error.code === '23505') {
            if (error.detail.includes('username')) {
                return res.status(400).json({ error: 'Username already exists' });
            } else if (error.detail.includes('email')) {
                return res.status(400).json({ error: 'Email already exists' });
            } else if (error.detail.includes('telno')) {
                return res.status(400).json({ error: 'Phone number already exists' });
            }
        }
        res.status(500).json({ error: 'Database error' });
    } finally {
        client.release();
    }
});

// Update user consultation count by id
router.put('/users/consultation/:id', async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const { add=0, subtract=0, amount=0 } = req.body;

    try {
        const result = await pool.query(
            `UPDATE users
             SET consultation_count = consultation_count + $1 - $2,
             payment_date = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING id, username, consultation_count`,
            [add, subtract, userId]
        );
        if (amount!=0){
            await pool.query(
                'INSERT INTO payments (amount) VALUES ($1)',
                [amount]
            )
        }
        

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Consultation count updated', user: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});



router.put('/users/changepass/:id', async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const { newpass, oldpass } = req.body;

    if (!newpass || !oldpass) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isOldPasswordCorrect = await bcrypt.compare(oldpass, user.password);
        if (!isOldPasswordCorrect) {
            return res.status(400).json({ error: 'Old password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newpass, 10);

        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);

        res.status(200).json({ message: 'Password successfully updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});


//delete user by id
router.delete('/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

//login
router.post('/users/login', async (req, res) => {
    const { email, password } = req.body;
  
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
  
    try {
      const result = await pool.query('SELECT id, username, email, password, role FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const user = result.rows[0];
  
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const token = jwt.sign({ id: user.id, username: user.username, email: user.email  }, SECRET_KEY, { expiresIn: '1h' });
      res.status(200).json({
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.role }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Database error' });
    }
  });

export default router;