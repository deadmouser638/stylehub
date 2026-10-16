const express = require('express');
const { successResponse, errorResponse } = require('../utils/response');

const router = express.Router();

router.get('/config', (_req, res) => successResponse(res, 200, {
  demo: true, upi: { enabled: true }, card: { enabled: true }, cod: { enabled: true },
}));
router.all('/{*path}', (_req, res) => errorResponse(res, 410, 'Payments are simulated in this demo. No money is collected.'));

module.exports = router;
