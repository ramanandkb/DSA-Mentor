from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import ChatRequest, ChatResponse
from chatbot import get_response

app = FastAPI(title="DSA Mentor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty."
        )

    try:
        reply = get_response(
            req.session_id,
            req.message,
            req.mode
        )
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="DSA Mentor is unavailable right now."
        )

    return ChatResponse(
        response=reply,
        session_id=req.session_id
    )

@app.get("/health")
def health():
    return {"status": "ok"}