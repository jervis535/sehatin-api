import pool from './dblogin.js';
import sharp from 'sharp';

export async function saveMessageToDb({ channel_id, user_id, content, type, image }) {
  let imageBuffer = null;

  try {
    if (image) {
      imageBuffer = Buffer.from(image, 'base64');
      imageBuffer = await sharp(imageBuffer)
        .resize({ width: 800 })
        .jpeg({ quality: 70 })
        .toBuffer();
    }

    const result = await pool.query(
      `INSERT INTO messages (channel_id, user_id, content, type, image)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [channel_id, user_id, content, type, imageBuffer]
    );

    return result.rows[0];
  } catch (err) {
    console.error('Error saving message to DB:', err);
    throw err;
  }
}
