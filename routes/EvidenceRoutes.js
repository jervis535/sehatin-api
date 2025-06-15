import express from 'express';
import pool from '../utils/dblogin.js';
import sharp from 'sharp';

const router = express.Router();

// Create new evidence
router.post('/evidences/:user_id', async (req, res) => {
  const { user_id } = req.params;
  const { image } = req.body;

  if (!image) return res.status(400).send("No image uploaded");

  try {
    const imageBuffer = Buffer.from(image, 'base64');
    const processedBuffer = await sharp(imageBuffer)
      .resize({ width: 800 })
      .jpeg({ quality: 70 })
      .toBuffer();

    const query = 'INSERT INTO evidences(user_id, image) VALUES ($1, $2)';
    await pool.query(query, [user_id, processedBuffer]);
    res.status(201).send("Evidence uploaded successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error uploading evidence");
  }
});

// Get evidence by user_id
router.get('/evidences/:user_id', async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await pool.query('SELECT image FROM evidences WHERE user_id = $1', [user_id]);
    if (result.rows.length === 0) return res.status(404).send("No evidence found");

    const imageBuffer = result.rows[0].image;
    if (!imageBuffer) return res.status(404).send("No image found");

    const imageBase64 = imageBuffer.toString('base64');
    res.json({ image: imageBase64 });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving evidence");
  }
});

// Delete evidence by user_id
router.delete('/evidences/:user_id', async (req, res) => {
  const { user_id } = req.params;

  try {
    await pool.query('DELETE FROM evidences WHERE user_id = $1', [user_id]);
    res.send("Evidence deleted successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting evidence");
  }
});

export default router;
