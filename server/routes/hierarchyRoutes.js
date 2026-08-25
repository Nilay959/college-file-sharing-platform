const express = require('express');
const router = express.Router();
const Hierarchy = require('../models/Hierarchy');

router.get('/', async (req, res) => {
  try {
    const hierarchies = await Hierarchy.find({});
    res.json(hierarchies);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching hierarchy', error });
  }
});

module.exports = router;
