import os
import sys
import argparse
import asyncio
import tempfile
import time
from datetime import datetime


def ensure_py_packages():
    """Ensure required Python packages are installed at runtime."""
    import importlib
    missing = []
    for mod in [
        ("dotenv", "python-dotenv"),
        ("pdfminer.high_level", "pdfminer.six"),
        ("PyPDF2", "PyPDF2"),
        ("edge_tts", "edge-tts"),
        ("supabase", "supabase"),
        ("requests", "requests"),
    ]:
        try:
            importlib.import_module(mod[0])
        except Exception:
            missing.append(mod[1])
    if missing:
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", *missing])


ensure_py_packages()

from dotenv import load_dotenv
from io import BytesIO
from pdfminer.high_level import extract_text as pdf_extract_text
from PyPDF2 import PdfReader
import edge_tts
import requests
from supabase import create_client, Client


def load_env(dotenv_path):
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path, override=True)


def parse_args():
    p = argparse.ArgumentParser(description="Generate/reuse full-PDF TTS audio and upload to Supabase")
    p.add_argument("--book", type=int, required=True)
    p.add_argument("--voice", type=int, required=True)
    p.add_argument("--rate", type=float, default=1.0)
    p.add_argument("--user", type=int, required=True)
    return p.parse_args()


def get_supabase() -> Client:
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)


def resolve_bucket_and_path_from_url(public_url: str):
    # Expect: https://.../storage/v1/object/public/<bucket>/<path>
    try:
        from urllib.parse import urlparse
        u = urlparse(public_url)
        idx = u.path.find("/storage/v1/object/public/")
        if idx != -1:
            rest = u.path[idx + len("/storage/v1/object/public/") :]
            parts = rest.split("/")
            bucket = parts[0]
            path = "/".join(parts[1:])
            return bucket, path
    except Exception:
        pass
    return None, None


def download_pdf_bytes(supabase: Client, archivo: str) -> bytes:
    if archivo.startswith("http://") or archivo.startswith("https://"):
        b, p = resolve_bucket_and_path_from_url(archivo)
        if b and p:
            res = supabase.storage.from_(b).download(p)
            return res
        # fallback: plain http get
        resp = requests.get(archivo)
        resp.raise_for_status()
        return resp.content
    else:
        bucket = os.environ.get("BUCKET_ARCHIVOS", "archivos_libros")
        res = supabase.storage.from_(bucket).download(archivo)
        return res


def extract_text_with_pdfminer(pdf_bytes: bytes) -> str:
    bio = BytesIO(pdf_bytes)
    text = pdf_extract_text(bio) or ""
    return text.strip()


def strip_leading_page_token(line: str) -> str:
    import re
    return re.sub(r'^\s*(?:\d{1,4}|[ivxlcdmIVXLCDM]{1,7})[)\].,:;—\-–]?\s+', '', line)


def is_page_number(line: str) -> bool:
    s = (line or '').strip()
    if not s:
        return False
    import re
    return s.isdigit() or (re.fullmatch(r"[ivxlcdmIVXLCDM]+", s) is not None and len(s) <= 5)


def is_header_footer(line: str) -> bool:
    s = (line or '').strip()
    headers = {
        "Cien años de soledad",
        "Gabriel  García Márquez",
        "Gabriel García Márquez",
    }
    return s in headers


def merge_lines_into_paragraphs(lines):
    import re
    cleaned = []
    for raw in lines:
        line = (raw or '').replace("\u00ad", "")
        line = strip_leading_page_token(line)
        line = re.sub(r"\s+", " ", line).rstrip()
        if not line:
            cleaned.append("")
            continue
        if is_page_number(line) or is_header_footer(line):
            continue
        cleaned.append(line)
    collapsed = []
    blank = False
    for l in cleaned:
        if l == "":
            if not blank:
                collapsed.append("")
                blank = True
        else:
            collapsed.append(l)
            blank = False
    paragraphs = []
    current = ""
    for l in collapsed:
        if l == "":
            if current:
                paragraphs.append(current.strip())
                current = ""
            else:
                paragraphs.append("")
            continue
        if current == "":
            current = l.strip()
        else:
            if current.endswith("-"):
                current = current[:-1] + l.lstrip()
            else:
                current += " " + l.lstrip()
    if current:
        paragraphs.append(current.strip())
    return "\n\n".join(paragraphs).strip()


def extract_text_with_pypdf2(pdf_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(pdf_bytes))
    all_text_lines = []
    for page in reader.pages:
        t = page.extract_text() or ""
        if not t:
            continue
        lines = t.splitlines()
        all_text_lines.extend(lines)
        all_text_lines.append("")
    merged = merge_lines_into_paragraphs(all_text_lines)
    return merged


async def synthesize_to_mp3_bytes(text: str, voice_short_name: str, rate: float = 1.0) -> bytes:
    # Chunk text to avoid service limits
    max_chars = 4000
    # edge-tts expects rate as percentage string
    rate_pct = f"{int((rate - 1.0) * 100)}%"
    out = bytearray()
    for i in range(0, len(text), max_chars):
        chunk = text[i : i + max_chars]
        communicate = edge_tts.Communicate(
            text=chunk,
            voice=voice_short_name,
            rate=("+" + rate_pct if not rate_pct.startswith("-") and not rate_pct.startswith("+") else rate_pct),
        )
        async for stream_chunk in communicate.stream():
            if stream_chunk["type"] == "audio":
                out.extend(stream_chunk["data"])
    return bytes(out)


def ensure_txt_alongside_pdf(supabase: Client, archivo: str, text: str):
    b, p = resolve_bucket_and_path_from_url(archivo)
    if not (b and p):
        b = os.environ.get("BUCKET_ARCHIVOS", "archivos_libros")
        p = archivo
    txt_path = p.rsplit(".", 1)[0] + ".txt"
    supabase.storage.from_(b).upload(txt_path, text.encode("utf-8"), {
        "contentType": "text/plain",
        "upsert": "true",
    })


def get_voice_short_name(supabase: Client, voice_id: int) -> str:
    data = (
        supabase.table("tbl_voces")
        .select("id_voz, short_name")
        .eq("id_voz", voice_id)
        .gte("id_voz", 1)
        .lte("id_voz", 16)
        .maybe_single()
        .execute()
    )
    item = getattr(data, "data", None)
    if not item:
        raise RuntimeError("Voz no encontrada")
    return item["short_name"]


def get_book_by_id(supabase: Client, book_id: int):
    data = (
        supabase.table("tbl_libros")
        .select("id_libro, titulo, archivo")
        .eq("id_libro", book_id)
        .maybe_single()
        .execute()
    )
    item = getattr(data, "data", None)
    if not item:
        raise RuntimeError("Libro no encontrado")
    return item


def get_or_create_relation(supabase: Client, user_id: int, book_id: int):
    res = (
        supabase.table("tbl_libros_x_usuarios")
        .select("id_libro_usuario")
        .eq("id_usuario", user_id)
        .eq("id_libro", book_id)
        .maybe_single()
        .execute()
    )
    item = getattr(res, "data", None)
    if item:
        return item["id_libro_usuario"]
    now = datetime.utcnow().isoformat()
    ins = (
        supabase.table("tbl_libros_x_usuarios")
        .insert({
            "id_usuario": user_id,
            "id_libro": book_id,
            "id_estado": 3,
            "progreso": 0,
            "pagina": 0,
            "palabra": 0,
            "tiempo_escucha": 0,
            "fecha_ultima_lectura": now,
        })
        .select("id_libro_usuario")
        .maybe_single()
        .execute()
    )
    item2 = getattr(ins, "data", None)
    return item2["id_libro_usuario"] if item2 else None


def update_progress(supabase: Client, user_id: int, book_id: int, audio_url: str, voice_id: int, rate: float):
    now = datetime.utcnow().isoformat()
    (
        supabase.table("tbl_libros_x_usuarios")
        .update({
            "audio": audio_url,
            "id_voz": voice_id,
            "id_playbackrate": rate,
            "fecha_ultima_lectura": now,
        })
        .eq("id_usuario", user_id)
        .eq("id_libro", book_id)
        .execute()
    )


def main():
    args = parse_args()
    # Load env from backend/.env
    load_env(os.path.join(os.path.dirname(__file__), "..", ".env"))
    if not (1 <= args.voice <= 16):
        print("Voz fuera de rango (1..16)")
        sys.exit(1)
    supa = get_supabase()
    # Resolve voice short name
    short_name = get_voice_short_name(supa, args.voice)
    print(f"Usando voz: {short_name}")
    # Resolve book and storage destination
    book = get_book_by_id(supa, args.book)
    archivo = book.get("archivo")
    if not archivo:
        print("Libro sin archivo PDF")
        sys.exit(1)
    # Reuse check
    bucket_audios = os.environ.get("BUCKET_AUDIOS", "audios_libros")
    dest_dir = str(args.book)
    dest_name = f"{short_name}.mp3"
    dest_path = f"{dest_dir}/{dest_name}"
    try:
        listing = supa.storage.from_(bucket_audios).list(dest_dir, {"search": dest_name})
        if any(it.get("name") == dest_name for it in listing):
            pub = supa.storage.from_(bucket_audios).get_public_url(dest_path)
            audio_url = pub.get("publicUrl") if isinstance(pub, dict) else pub["publicUrl"]
            print("Audio ya existe:", audio_url)
            get_or_create_relation(supa, args.user, args.book)
            update_progress(supa, args.user, args.book, audio_url, args.voice, args.rate)
            return
    except Exception:
        pass

    # Download PDF and extract text
    pdf_bytes = download_pdf_bytes(supa, archivo)
    print("PDF bytes:", len(pdf_bytes))
    # Prefer PyPDF2 with custom cleanup; fallback to pdfminer if needed
    text = extract_text_with_pypdf2(pdf_bytes)
    if not text or len(text) < 50:
        text = extract_text_with_pdfminer(pdf_bytes)
    print("Texto extraído:", len(text))
    if not text or len(text) < 50:
        print("No se pudo extraer texto suficiente del PDF")
        sys.exit(1)
    # Save .txt alongside PDF
    try:
        ensure_txt_alongside_pdf(supa, archivo, text)
    except Exception as e:
        print("No se pudo guardar .txt:", getattr(e, "message", str(e)))

    # Synthesize with edge-tts (Python)
    # Synthesize fully in memory
    audio_bytes = asyncio.run(synthesize_to_mp3_bytes(text, short_name, args.rate))
    print("MP3 bytes:", len(audio_bytes))
    if len(audio_bytes) < 50000:
        print("Audio demasiado corto")
        sys.exit(1)
    # Upload
    supa.storage.from_(bucket_audios).upload(
        dest_path,
        audio_bytes,
        {
            "contentType": "audio/mpeg",
            "upsert": "true",
        },
    )
    pub = supa.storage.from_(bucket_audios).get_public_url(dest_path)
    audio_url = pub.get("publicUrl") if isinstance(pub, dict) else pub["publicUrl"]
    print("Audio URL:", audio_url)

    # Update relation
    get_or_create_relation(supa, args.user, args.book)
    update_progress(supa, args.user, args.book, audio_url, args.voice, args.rate)
    print("Done.")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("ERROR:", getattr(e, "message", str(e)))
        sys.exit(1)
