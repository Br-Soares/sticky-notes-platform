# Sticky Notes API

A simple REST API to manage sticky notes, built with Node.js, Express and native SQLite (no external database dependencies).

## Stack

- Node.js (v22+)
- Express
- SQLite via `node:sqlite` (Node.js built-in)
- Nodemon for development

## Getting started

```bash
git clone https://github.com/seu-usuario/sticky-notes-api.git
cd sticky-notes-api
npm install
npm run dev   # with hot reload
# or
npm start
```

The API runs at `http://localhost:3000`. The SQLite database file (`database.db`) is created automatically on first run.

## Project structure

```
src/
├── app.js              # Entry point
├── db/                 # Database setup
├── routes/notes.js     # Route handlers
└── middleware/error.js
insomnia/
└── sticky-notes-collection.json
```

## Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/notes` | List all notes (pinned first) |
| GET | `/notes/:id` | Get a note by ID |
| POST | `/notes` | Create a note |
| PATCH | `/notes/:id` | Edit title and/or content |
| PATCH | `/notes/:id/pin` | Toggle pin status |
| DELETE | `/notes/:id` | Delete a note |

## Request & response examples

**Create a note**
```http
POST /notes
Content-Type: application/json

{ "title": "My first note", "content": "Some content here" }
```
```json
{
  "id": 1,
  "title": "My first note",
  "content": "Some content here",
  "pinned": 0,
  "created_at": "2026-04-14 21:00:00",
  "updated_at": "2026-04-14 21:00:00"
}
```

**Edit a note** — send only the fields you want to change:
```http
PATCH /notes/1
Content-Type: application/json

{ "title": "Updated title" }
```

**Toggle pin** — no body required, the state flips automatically:
```http
PATCH /notes/1/pin
```

**Delete a note** — returns `204 No Content`:
```http
DELETE /notes/1
```

## Error responses

All errors follow the same shape:
```json
{ "error": "Message here" }
```

- `400` — missing or empty title
- `404` — note not found, or unknown route
- `500` — internal server error

## Database schema

```sql
CREATE TABLE IF NOT EXISTS notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  content    TEXT    NOT NULL DEFAULT '',
  pinned     INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

## Testing with Insomnia

Import `insomnia/sticky-notes-collection.json` into Insomnia. All requests are pre-configured against `http://localhost:3000`.

## Suggested pair split

- Dev A — `POST /notes`, `GET /notes`, `GET /notes/:id`
- Dev B — `PATCH /notes/:id`, `PATCH /notes/:id/pin`, `DELETE /notes/:id`

## License

MIT
