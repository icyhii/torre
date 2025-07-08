import { Router } from 'express';
import { streamSearch } from '../controllers/searchController.js';

const router = Router();

router.get('/search', streamSearch);

export default router;
