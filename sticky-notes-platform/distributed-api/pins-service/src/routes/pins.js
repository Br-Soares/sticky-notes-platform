
import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

// GET /pins  →  devolve lista de note_ids fixados
router.get('/', (req, res) => {
  const pins = db.prepare('SELECT note_id FROM pins').all();
  res.json(pins.map(p => p.note_id));
});

// POST /pins/:noteId  →  fixa a nota (idempotente)
router.post('/:noteId', (req, res) => {
  db.prepare('INSERT OR IGNORE INTO pins (note_id) VALUES (?)').run(Number(req.params.noteId));
  res.status(204).send();
});

// DELETE /pins/:noteId  →  desfixa a nota
router.delete('/:noteId', (req, res) => {
  db.prepare('DELETE FROM pins WHERE note_id = ?').run(Number(req.params.noteId));
  res.status(204).send();
});

export default router;