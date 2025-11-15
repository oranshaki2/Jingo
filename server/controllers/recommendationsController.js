// controllers/recommendationsController.js
const path = require("path");
const fs = require('fs');
const { recommendOnlyNewWords } = require("../services/recommendOnlyNew");


/*
  * Resolves the CSV file path from environment variable or defaults.
*/
function resolveCsvPath() {
  const fromEnv = process.env.SONGS_CSV_PATH && String(process.env.SONGS_CSV_PATH).trim();
  if (fromEnv) {
    // Resolve relative to the process working dir (where you run `node app.js`, i.e., /server)
    const abs = path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv);
    return abs;
  }
  // Fallback to the repo default (resolve relative to the server working dir)
  return path.resolve(process.cwd());
}

/*
  * Handles POST /api/recommendations/only-new
  * Expects JSON body with { user: { wordHistory: string[], genre: string[], level: number }, category: string }
  * Returns recommendations of songs with new vocabulary in the selected category.
*/
async function postOnlyNew(req, res) {
  try {
    // const csvPath = resolveCsvPath();
    // if (!fs.existsSync(csvPath)) {
    //   return res.status(500).json({ error: `CSV file not found at: ${csvPath}` });
    // }

    const { user, category } = req.body || {};
    if (
      !user ||
      !Array.isArray(user.wordHistory) ||
      !Array.isArray(user.genre) ||
      typeof user.level !== 'number'
    ) {
      return res.status(400).json({
        error: 'Invalid "user" payload. Expect { wordHistory: string[], genre: string[], level: number }',
      });
    }
    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'Missing/invalid "category" (string)' });
    }
    // All good, proceed to recommendations
    const result = await recommendOnlyNewWords(user, category);

    return res.status(200).json(result);
  } catch (err) {
    console.error('[recommend] Failed:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}

module.exports = { postOnlyNew };
