// controllers/recommendationsController.js
const path = require('path');
const { recommendOnlyNewWords } = require('../services/recommendOnlyNew');

const CSV_PATH = process.env.SONGS_CSV_PATH
  ? path.resolve(process.env.SONGS_CSV_PATH)
  // : path.resolve(__dirname, '../../data/someSongs.csv');
  : path.resolve(__dirname, '../../data/testSong_5.9.25.csv');

async function postOnlyNew(req, res) {
  try {
    const { user, category } = req.body || {};


    if (!user || !Array.isArray(user.wordHistory) || !Array.isArray(user.genre) || typeof user.level !== 'number') {
      return res.status(400).json({ error: 'Invalid "user" payload. Expect { wordHistory: string[], genre: string[], level: number }' });
    }
    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'Missing/invalid "category" (string)' });
    }


    const t0 = Date.now();
    const result = await recommendOnlyNewWords(CSV_PATH, user, category);
    const ms = Date.now() - t0;

    const keys = Object.keys(result || {});
    const counts = keys.reduce((acc, k) => {
      acc[k] = Array.isArray(result[k]) ? result[k].length : 0;
      return acc;
    }, {});


    // להדפיס דוגמה ראשונה מכל ז'אנר אם יש
    keys.forEach((g) => {
      if (Array.isArray(result[g]) && result[g].length) {
      }
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('postOnlyNew error:', err);
    return res.status(500).json({ error: 'Failed to build recommendations' });
  }
}

module.exports = { postOnlyNew };