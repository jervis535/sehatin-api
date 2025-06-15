import express from 'express';
import { getMessaging } from 'firebase-admin/messaging';
import '../utils/firebase.js';
import pool from '../utils/dblogin.js';
import sharp from 'sharp';
import { broadcastMessageToChannel,broadcastMessageReadToChannel } from '../websocket.js';


const router = express.Router();

// Create a new message
router.post('/messages', async (req, res) => {
  const { channel_id, user_id, content, type, image } = req.body;
  let imageBuffer = null;
  let imageBase64 = null;

  try {
    if (image) {
      imageBuffer = Buffer.from(image, 'base64');
      imageBuffer = await sharp(imageBuffer)
        .resize({ width: 800 })
        .jpeg({ quality: 70 })
        .toBuffer();
      imageBase64 = imageBuffer.toString('base64');
    }

    const result = await pool.query(
      `INSERT INTO messages (channel_id, user_id, content, type, image)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [channel_id, user_id, content, type, imageBuffer]
    );
    const insertedMessage = result.rows[0];

    if (imageBase64) {
      insertedMessage.image = imageBase64;
    }

    const channelRes = await pool.query(
      'SELECT user_id0, user_id1 FROM channels WHERE id = $1',
      [channel_id]
    );

    if (channelRes.rows.length > 0) {
      const { user_id0, user_id1 } = channelRes.rows[0];
      insertedMessage.channelParticipants = {
        userId0: user_id0,
        userId1: user_id1,
      };

      broadcastMessageToChannel(channel_id, insertedMessage);

      const recipientId = (user_id0 === user_id) ? user_id1 : user_id0;

      const tokensResult = await pool.query(
        'SELECT device_token FROM user_tokens WHERE user_id = $1',
        [recipientId]
      );
      const tokens = tokensResult.rows.map(r => r.device_token).filter(t => !!t);

      if (tokens.length > 0) {
        const messaging = getMessaging();
        const response = await messaging.sendEachForMulticast({
          tokens,
          notification: {
            title: 'New message',
            body: content || '[Image]',
          },
          data: {
            channel_id: channel_id.toString(),
            sender_id: user_id.toString(),
            message_id: insertedMessage.id.toString(),
            type: type || '',
          },
        });

        response.responses.forEach((r, idx) => {
          if (!r.success && r.error) {
            console.error(`FCM error for token ${tokens[idx]}:`, r.error);
            if (
              r.error.code === 'messaging/registration-token-not-registered' ||
              r.error.code === 'messaging/invalid-argument'
            ) {
              pool.query('DELETE FROM user_tokens WHERE device_token = $1', [tokens[idx]])
                .catch(e => console.error('Error removing token:', e));
            }
          }
        });
      }
    }

    res.status(201).json(insertedMessage);
  } catch (err) {
    console.error('Error inserting message:', err);
    res.status(400).json({ error: err.message });
  }
});

//get all messages
router.get('/messages', async (req, res) => {
  const channelId = req.query.channel_id ? parseInt(req.query.channel_id, 10) : null;
  const userId = req.query.user_id ? parseInt(req.query.user_id, 10) : null;

  try {
    let query = 'SELECT * FROM messages';
    const conditions = [];
    const values = [];

    if (channelId) {
      conditions.push(`channel_id = $${values.length + 1}`);
      values.push(channelId);
    }

    if (userId) {
      conditions.push(`user_id = $${values.length + 1}`);
      values.push(userId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY sent_at ASC';

    const result = await pool.query(query, values);

    const messages = result.rows.map((msg) => {
      if (msg.image && Buffer.isBuffer(msg.image)) {
        return {
          ...msg,
          image: msg.image.toString('base64'),
        };
      }
      return msg;
    });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get message by id
router.get('/messages/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const result = await pool.query('SELECT * FROM messages WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});





// Mark message as read (optional, if you track read status)
router.put('/messages/:id/read', async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const result = await pool.query(
      'UPDATE messages SET read = true WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const updatedMessage = result.rows[0];

    const channelRes = await pool.query('SELECT user_id0, user_id1 FROM channels WHERE id = $1', [
      updatedMessage.channel_id,
    ]);

    if (channelRes.rows.length > 0) {
      const participants = channelRes.rows[0];
      broadcastMessageReadToChannel(updatedMessage.channel_id, updatedMessage.id, {
        userId0: participants.user_id0,
        userId1: participants.user_id1,
      });
    }

    res.json({ message: 'Message marked as read', messageData: updatedMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


export default router;