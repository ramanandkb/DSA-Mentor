import os
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = os.getenv("CHATGPT_MODEL")

# In-memory conversation history per session. Swap for a database for
# multi-instance or persistent deployments.
_sessions: dict[str, list[dict]] = {}

BASE_SYSTEM_PROMPT = """You are DSA Mentor, an AI instructor focused exclusively on \
Data Structures & Algorithms. You explain concepts clearly, prefer concise answers \
but go deeper on request, provide hints instead of full solutions when asked for a \
hint, write code in Python by default (unless another language is requested), \
analyze time/space complexity, explain edge cases, and can perform step-by-step dry \
runs. Format code in fenced ``` code blocks. If asked something unrelated to DSA, \
politely decline and redirect: "I'm your DSA Mentor. Please ask me a Data Structures \
& Algorithms question." """

MODE_PROMPTS = {
    "learn": "Focus on teaching the underlying concept clearly, with an example.",
    "practice": "Give the user a problem to solve without revealing the solution "
                "unless they ask for one.",
    "hint": "Give exactly one hint at a time. Never reveal the full solution unless "
            "explicitly asked.",
    "explain": "The user wants their own code explained line by line.",
    "interview": "Act as a technical interviewer: ask a DSA question, wait for the "
                 "user's approach, and give feedback rather than the answer.",
}


def get_response(session_id: str, message: str, mode: str = "learn") -> str:
    history = _sessions.setdefault(session_id, [])
    if not history:
        system_prompt = BASE_SYSTEM_PROMPT + " " + MODE_PROMPTS.get(mode, "")
        history.append({"role": "system", "content": system_prompt})

    history.append({"role": "user", "content": message})

    completion = client.chat.completions.create(
        model=MODEL,
        messages=history,
        temperature=0.4,
        max_tokens=1024,
    )
    reply = completion.choices[0].message.content
    history.append({"role": "assistant", "content": reply})

    # Simple cap so sessions don't grow unbounded in memory.
    if len(history) > 40:
        _sessions[session_id] = [history[0]] + history[-30:]

    return reply
