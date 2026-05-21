
import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

// GET /notes
router.get('/', (req, res) => {
  const notes = db.prepare('SELECT * FROM notes ORDER BY created_at DESC').all();
  res.json(notes);
});

// GET /notes/:id
router.get('/:id', (req, res, next) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!note) return next({ status: 404, message: 'Note not found' });
  res.json(note);
});

// POST /notes
router.post('/', (req, res, next) => {
  const { title, content = '' } = req.body;
  if (!title || !title.trim()) return next({ status: 400, message: 'Title is required' });

  const result = db.prepare(
    'INSERT INTO notes (title, content) VALUES (?, ?)'
  ).run(title.trim(), content);

  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(note);
});

// PATCH /notes/:id
router.patch('/:id', (req, res, next) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!note) return next({ status: 404, message: 'Note not found' });

  const { title, content } = req.body;
  if (title !== undefined && !title.trim()) return next({ status: 400, message: 'Title cannot be empty' });

  const newTitle   = title   !== undefined ? title.trim() : note.title;
  const newContent = content !== undefined ? content       : note.content;

  db.prepare(
    "UPDATE notes SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(newTitle, newContent, req.params.id);

  const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /notes/:id
router.delete('/:id', (req, res, next) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!note) return next({ status: 404, message: 'Note not found' });

  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;