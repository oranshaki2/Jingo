const express = require('express');
const router = express.Router();
const { postOnlyNew } = require('../controllers/recommendationsController');

router.post('/only-new', postOnlyNew);

module.exports = router;