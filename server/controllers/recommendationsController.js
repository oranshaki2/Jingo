// controllers/recommendationsController.js
const path = require('path');
const { recommendOnlyNewWords } = require('../services/recommendOnlyNew');

const CSV_PATH = process.env.SONGS_CSV_PATH
  ? path.resolve(process.env.SONGS_CSV_PATH)
  : path.resolve(__dirname, '../../data/someSongs.csv');

async function postOnlyNew(req, res) {
  try {
    const { user, category } = req.body || {};

    console.log("[POST /only-new] Incoming body:", JSON.stringify(req.body, null, 2));
    console.log("[POST /only-new] CSV_PATH:", CSV_PATH);

    if (!user || !Array.isArray(user.history) || !Array.isArray(user.genre) || typeof user.level !== 'number') {
      console.log("[POST /only-new] ❌ Invalid user payload");
      return res.status(400).json({ error: 'Invalid "user" payload. Expect { history: string[], genre: string[], level: number }' });
    }
    if (!category || typeof category !== 'string') {
      console.log("[POST /only-new] ❌ Missing/invalid category");
      return res.status(400).json({ error: 'Missing/invalid "category" (string)' });
    }

    console.log("[POST /only-new] Using:",
      { category, level: user.level, genres: user.genre, historyLen: user.history.length });

    const t0 = Date.now();
    const result = await recommendOnlyNewWords(CSV_PATH, user, category);
    const ms = Date.now() - t0;

    const keys = Object.keys(result || {});
    const counts = keys.reduce((acc, k) => {
      acc[k] = Array.isArray(result[k]) ? result[k].length : 0;
      return acc;
    }, {});
    console.log("[POST /only-new] Done in", ms + "ms", "genres:", keys, "counts:", counts);

    // להדפיס דוגמה ראשונה מכל ז'אנר אם יש
    keys.forEach((g) => {
      if (Array.isArray(result[g]) && result[g].length) {
        console.log(`[POST /only-new] First of '${g}':`, result[g][0]);
      }
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('postOnlyNew error:', err);
    return res.status(500).json({ error: 'Failed to build recommendations' });
  }
}

module.exports = { postOnlyNew };