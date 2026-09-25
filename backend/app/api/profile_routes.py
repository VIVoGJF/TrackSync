from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.api.auth_routes import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.schemas.user_schemas import ProfileUpdate
from app.services import avatar_service


router = APIRouter(
    prefix="/profile",
    tags=["Profile"],
)


@router.patch("/")
async def update_profile(
    update: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = update.model_dump(exclude_unset=True)

    if "display_name" in data:
        display_name = data["display_name"]
        current_user.display_name = display_name.strip() if display_name else None

    if "username" in data and data["username"] is not None:
        current_user.username = data["username"].strip().lower()

    try:
        await db.commit()
        await db.refresh(current_user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken.",
        )

    return {
        "username": current_user.username,
        "display_name": current_user.display_name,
    }


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type not in avatar_service.ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Avatar must be a JPEG, PNG, or WEBP image.",
        )

    raw_bytes = await file.read()

    if len(raw_bytes) > avatar_service.MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Avatar must be 5MB or smaller.",
        )

    try:
        avatar_service.upload_avatar(current_user.id, raw_bytes)
    except Exception as e:
        print(f"Avatar upload failed: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Avatar upload failed: {type(e).__name__}: {e}",
        )

    current_user.avatar_uploaded = True
    current_user.avatar_version += 1

    await db.commit()
    await db.refresh(current_user)

    return {
        "avatar_url": avatar_service.build_avatar_url(
            current_user.id, current_user.avatar_uploaded, current_user.avatar_version
        )
    }


@router.delete("/avatar")
async def remove_avatar(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.avatar_uploaded:
        avatar_service.delete_avatar(current_user.id)
        current_user.avatar_uploaded = False
        await db.commit()

    return {"avatar_url": None}