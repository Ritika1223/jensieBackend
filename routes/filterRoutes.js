import express from 'express';
import { getFilters, updateFilters, getFilterByType } from '../controllers/filterController.js';

const router = express.Router();

// Get all filters
router.get('/', getFilters);

// Get filter by type
router.get('/:filterType', getFilterByType);

// Update filters (create or update)
router.post('/', updateFilters);

export default router;

