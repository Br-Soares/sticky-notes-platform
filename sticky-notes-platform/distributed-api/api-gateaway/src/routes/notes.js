import { Router } from 'express';

const router = Router();

const NOTES_INSTANCES = [
  'http://localhost:3001',
  'http://localhost:3011',
  'http://localhost:3021',
];

let roundRobinId = 0;

function nextNotesInstance() {
  const url = NOTES_INSTANCES[roundRobinId];
  roundRobinId = (roundRobinId + 1) % NOTES_INSTANCES.length;
  console.log(`[gateway] → ${url} (slot ${roundRobinId})`);
  return url;
}

const PINS = 'http://localhost:3002';

async function fetchPinnedIds() {
  const res = await fetch(`${PINS}/pins`);
  if (!res.ok) return new Set();
  const ids = await res.json();
  return new Set(ids);
}

function merge(note, pinnedIds) {
  return { ...note, pinned: pinnedIds.has(note.id) ? 1 : 0 };
}

// GET /notes
router.get('/', async (req, res, next) => {
  try {
    const NOTES = nextNotesInstance();
    const [notesRes, pinnedIds] = await Promise.all([
      fetch(`${NOTES}/notes`),
      fetchPinnedIds(),
    ]);
    if (!notesRes.ok) return next({ status: notesRes.status, message: 'notes-service error' });
    const notes = await notesRes.json();
    res.json(notes.map(n => merge(n, pinnedIds)).sort((a, b) => b.pinned - a.pinned));
  } catch (err) { next(err); }
});

// GET /notes/:id
router.get('/:id', async (req, res, next) => {
  try {
    const NOTES = nextNotesInstance();
    const [noteRes, pinnedIds] = await Promise.all([
      fetch(`${NOTES}/notes/${req.params.id}`),
      fetchPinnedIds(),
    ]);
    if (noteRes.status === 404) return next({ status: 404, message: 'Note not found' });
    if (!noteRes.ok) return next({ status: noteRes.status, message: 'notes-service error' });
    res.json(merge(await noteRes.json(), pinnedIds));
  } catch (err) { next(err); }
});

// POST /notes
router.post('/', async (req, res, next) => {
  try {
    const NOTES = nextNotesInstance();
    const noteRes = await fetch(`${NOTES}/notes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await noteRes.json();
    if (!noteRes.ok) return next({ status: noteRes.status, message: data.error });
    res.status(201).json({ ...data, pinned: 0 });
  } catch (err) { next(err); }
});

// PATCH /notes/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const NOTES = nextNotesInstance();
    const noteRes = await fetch(`${NOTES}/notes/${req.params.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await noteRes.json();
    if (!noteRes.ok) return next({ status: noteRes.status, message: data.error });
    res.json(merge(data, await fetchPinnedIds()));
  } catch (err) { next(err); }
});

// PATCH /notes/:id/pin
router.patch('/:id/pin', async (req, res, next) => {
  try {
    const NOTES = nextNotesInstance(); // ← UMA chamada, resultado guardado
    const checkRes = await fetch(`${NOTES}/notes/${req.params.id}`);
    if (checkRes.status === 404) return next({ status: 404, message: 'Note not found' });

    const pinnedIds = await fetchPinnedIds();
    const id = Number(req.params.id);
    const isPinned = pinnedIds.has(id);

    if (isPinned) {
      await fetch(`${PINS}/pins/${id}`, { method: 'DELETE' });
      pinnedIds.delete(id);
    } else {
      await fetch(`${PINS}/pins/${id}`, { method: 'POST' });
      pinnedIds.add(id);
    }
    res.json(merge(await checkRes.json(), pinnedIds));
  } catch (err) { next(err); }
});

// DELETE /notes/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const NOTES = nextNotesInstance();
    await fetch(`${PINS}/pins/${req.params.id}`, { method: 'DELETE' });
    const noteRes = await fetch(`${NOTES}/notes/${req.params.id}`, { method: 'DELETE' });
    if (noteRes.status === 404) return next({ status: 404, message: 'Note not found' });
    res.status(201).send();
  } catch (err) { next(err); }
});

export default router;