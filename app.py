"""app.py : SERVER (backend) Suratku.

Tugasnya:
1. Menyajikan halaman website (index.html, style.css, surat.js, unduh.js, main.js, ttd.js, tema.js)
2. Menerima data form di /api/generate, membuat prompt (lihat prompts.py), memanggil Claude
3. Menyimpan API key di file .env supaya tidak terlihat di browser

Jalankan:  uvicorn app:app --reload
"""
import os
import time
from collections import defaultdict, deque
from pathlib import Path
from typing import Literal

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from prompts import build_prompt

load_dotenv()

API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5-5")
RATE_LIMIT_PER_HOUR = int(os.getenv("RATE_LIMIT_PER_HOUR", "20"))
BASE_DIR = Path(__file__).parent

client = anthropic.Anthropic(api_key=API_KEY) if API_KEY else None
app = FastAPI(title="Suratku")


# ---------- Bentuk data yang diterima dari website ----------
class GenerateRequest(BaseModel):
    mode: Literal["write", "polish"] = "write"
    type: Literal["lamaran", "izin", "permohonan", "pengunduran", "resmi"] = "lamaran"
    name: str = Field("", max_length=120)
    role: str = Field("", max_length=120)
    recTitle: str = Field("", max_length=160)
    recOrg: str = Field("", max_length=160)
    perihal: str = Field("", max_length=200)
    fieldA: str = Field("", max_length=300)
    detail: str = Field("", max_length=1500)
    tone: Literal["formal", "semi", "ramah"] = "formal"
    length: Literal["singkat", "sedang", "lengkap"] = "sedang"
    body: str = Field("", max_length=6000)


# ---------- Pembatas pemakaian per alamat IP (disimpan di memori) ----------
_hits: dict[str, deque] = defaultdict(deque)


def check_rate(ip: str) -> None:
    now = time.time()
    q = _hits[ip]
    while q and now - q[0] > 3600:
        q.popleft()
    if len(q) >= RATE_LIMIT_PER_HOUR:
        raise HTTPException(status_code=429, detail="Terlalu sering memakai AI. Coba lagi nanti.")
    q.append(now)


# ---------- Rute API ----------
@app.get("/api/health")
def health():
    """Dipakai website untuk tahu apakah tombol AI boleh ditampilkan."""
    return {"ai": client is not None}


@app.post("/api/generate")
def generate(req: GenerateRequest, request: Request):
    if client is None:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY belum diisi di file .env")
    if req.mode == "polish" and not req.body.strip():
        raise HTTPException(status_code=422, detail="Teks surat kosong")
    check_rate(request.client.host if request.client else "unknown")
    try:
        msg = client.messages.create(
            model=MODEL,
            max_tokens=1000,
            messages=[{"role": "user", "content": build_prompt(req)}],
        )
    except anthropic.RateLimitError:
        raise HTTPException(status_code=429, detail="Batas penggunaan API tercapai. Coba lagi nanti.")
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=503, detail="API key ditolak. Periksa ANTHROPIC_API_KEY.")
    except anthropic.APIError:
        raise HTTPException(status_code=502, detail="Gagal menghubungi layanan AI.")
    text = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text").strip()
    if not text:
        raise HTTPException(status_code=502, detail="AI tidak mengembalikan teks.")
    return {"text": text, "truncated": msg.stop_reason == "max_tokens"}


# ---------- Rute halaman website ----------
# Hanya file ini yang boleh diakses dari browser (app.py dan .env tidak ikut terbuka).
@app.get("/")
def page_index():
    return FileResponse(BASE_DIR / "index.html", media_type="text/html")


@app.get("/style.css")
def page_css():
    return FileResponse(BASE_DIR / "style.css", media_type="text/css")


@app.get("/surat.js")
def page_js_surat():
    return FileResponse(BASE_DIR / "surat.js", media_type="text/javascript")


@app.get("/unduh.js")
def page_js_unduh():
    return FileResponse(BASE_DIR / "unduh.js", media_type="text/javascript")


@app.get("/main.js")
def page_js_main():
    return FileResponse(BASE_DIR / "main.js", media_type="text/javascript")


@app.get("/ttd.js")
def page_js_ttd():
    return FileResponse(BASE_DIR / "ttd.js", media_type="text/javascript")


@app.get("/tema.js")
def page_js_tema():
    return FileResponse(BASE_DIR / "tema.js", media_type="text/javascript")
