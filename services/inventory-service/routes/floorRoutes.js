import express from 'express';
import { getFloors, getFloorById, createFloor, updateFloor, deleteFloor } from '../controllers/floorController.js';

const router = express.Router();

router.get('/', getFloors);
router.get('/:id', getFloorById);
router.post('/', createFloor);
router.patch('/:id', updateFloor);
router.delete('/:id', deleteFloor);

export default router;