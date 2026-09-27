# DSA Mentor

An AI-powered DSA learning assistant: a vanilla HTML/CSS/JS frontend talking to a
FastAPI backend, which calls the Groq API. The frontend never sees the API key.

```
Browser  →  POST /chat  →  FastAPI  →  Groq API  →  FastAPI  →  Browser
```

## Project structure

```
dsa-mentor/
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
└── backend/
    ├── main.py
    ├── chatbot.py
    ├── models.py
    ├── requirements.txt
    └── .env.example
```

## Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # then paste your real Groq API key into .env
```

`chatbot.py` reads `GROQ_API_KEY` from the environment. Load `.env`
automatically by adding `python-dotenv` and calling `load_dotenv()` at the top
of `main.py`, or export the variable in your shell before running.

Run it:

```bash
uvicorn main:app --reload --port 8000
```

## Frontend setup

The frontend is static — no build step. Serve it with any static server, e.g.:

```bash
cd frontend
python -m http.server 5500
```

Then open `http://localhost:5500`. It calls the backend at
`http://localhost:8000/chat` — update `API_URL` at the top of `script.js` if
you run the backend elsewhere.

## Notes on this build

To keep this a working first pass, a few things from the original spec are
simplified and worth extending yourself:

- **Chat history** is stored in the browser's `localStorage`, not a database
  (the spec allows this for an initial version). Rename/delete of individual
  chats isn't wired up yet.
- **Conversation memory** on the backend is kept in an in-memory dict
  (`chatbot.py`) — fine for one server process; swap for Redis/a database
  before scaling past a single instance.
- **CORS** in `main.py` allows `*` for convenience — lock this down to your
  real frontend origin before deploying.
- Syntax highlighting is minimal (monospace + a code block frame) rather than
  full tokenized highlighting — drop in a library like Prism.js if you want that.
