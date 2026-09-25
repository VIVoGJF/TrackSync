import io
from uuid import UUID

from PIL import Image, ImageOps
from supabase import create_client, Client

from app.core.config import settings

AVATAR_SIZE = 256
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5MB
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}

_supabase: Client | None = None


def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured.")
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _supabase


def avatar_storage_path(user_id: UUID) -> str:
    return f"{user_id}.webp"


def process_avatar(raw_bytes: bytes) -> bytes:
    image = Image.open(io.BytesIO(raw_bytes))
    image = ImageOps.exif_transpose(image)
    image = image.convert("RGB")

    width, height = image.size
    side = min(width, height)
    left = (width - side) // 2
    top = (height - side) // 2
    image = image.crop((left, top, left + side, top + side))
    image = image.resize((AVATAR_SIZE, AVATAR_SIZE), Image.LANCZOS)

    buffer = io.BytesIO()
    image.save(buffer, format="WEBP", quality=85)
    return buffer.getvalue()


def upload_avatar(user_id: UUID, raw_bytes: bytes) -> None:
    processed = process_avatar(raw_bytes)
    client = get_supabase()
    path = avatar_storage_path(user_id)
    client.storage.from_(settings.AVATAR_BUCKET).upload(
        path,
        processed,
        file_options={"content-type": "image/webp", "upsert": "true"},
    )


def delete_avatar(user_id: UUID) -> None:
    client = get_supabase()
    path = avatar_storage_path(user_id)
    client.storage.from_(settings.AVATAR_BUCKET).remove([path])


def build_avatar_url(user_id: UUID, avatar_uploaded: bool, avatar_version: int) -> str | None:
    if not avatar_uploaded:
        return None
    path = avatar_storage_path(user_id)
    return f"{settings.SUPABASE_URL}/storage/v1/object/public/{settings.AVATAR_BUCKET}/{path}?v={avatar_version}"