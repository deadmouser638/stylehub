const express = require('express');
const { getAddresses, addAddress, updateAddress, deleteAddress, setDefault } = require('../controllers/addressController');

const router = express.Router();

router.get('/', getAddresses);
router.post('/', addAddress);
router.put('/:id', updateAddress);
router.delete('/:id', deleteAddress);
router.put('/:id/default', setDefault);

module.exports = router;
