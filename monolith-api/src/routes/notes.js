const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar todas as notas 
router.get('/', (req, res) => {
  const notes = db.prepare(`
    SELECT * FROM notes ORDER BY pinned DESC, created_at DESC
  `).all();
  res.json(notes);
});

// Get uma nota
router.get('/:id', (req, res, next) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!note) return next({ status: 404, message: 'Note not found' });
  res.json(note);
});

// Create uma nota
router.post('/', (req, res, next) => {
  const { title, content = '' } = req.body;
  if (!title || title.trim() === '') {
    return next({ status: 400, message: 'Title is required' });
  }
  const result = db.prepare(`
    INSERT INTO notes (title, content) VALUES (?, ?)
  `).run(title.trim(), content.trim());

  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(note);
});

// Edit titulo e conteudo
router.patch('/:id', (req, res, next) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!note) return next({ status: 404, message: 'Note not found' });

  const title   = req.body.title   !== undefined ? req.body.title.trim()   : note.title;
  const content = req.body.content !== undefined ? req.body.content.trim() : note.content;

  if (!title) return next({ status: 400, message: 'Title cannot be empty' });

  db.prepare(`
    UPDATE notes SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?
  `).run(title, content, req.params.id);

  res.json(db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id));
});

// pinar uma nota
router.patch('/:id/pin', (req, res, next) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!note) return next({ status: 404, message: 'Note not found' });

  const newPin = note.pinned ? 0 : 1;
  db.prepare(`
    UPDATE notes SET pinned = ?, updated_at = datetime('now') WHERE id = ?
  `).run(newPin, req.params.id);

  res.json(db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id));
});

// Delete uma nota
router.delete('/:id', (req, res, next) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!note) return next({ status: 404, message: 'Note not found' });

  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
