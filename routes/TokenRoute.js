// routes/TokenRoutes.js (or wherever you keep user‐token logic)
import express from 'express';
import pool from '../utils/dblogin.js';

const router = express.Router();

// Example: POST /register-token
router.post('/register-token', async (req, res) => {
  const { user_id, token } = req.body;
  if (!user_id || !token) {
    return res.status(400).json({ error: 'user_id and token are required' });
  }

  try {
    // If you have a table user_tokens(user_id, device_token), do an upsert
    await pool.query(
      `
      INSERT INTO user_tokens (user_id, device_token)
      VALUES ($1, $2)
      ON CONFLICT (device_token) DO UPDATE
        SET user_id = EXCLUDED.user_id
      `,
      [user_id, token]
    );
    return res.json({ message: 'FCM token registered' });
  } catch (err) {
    console.error('Error registering token:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
