from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.schemas.user_schemas import UserSignup, UserLogin, TokenResponse, PasswordChange
from app.db.database import get_db
from app.db.models import User

from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.core.timezones import is_valid_timezone
from app.services import avatar_service


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=401, 
            detail="Invalid token"
        )
    
    user_id = payload.get("sub")
    
    if user_id is None:
        raise HTTPException(
            status_code=401, 
            detail="Invalid token"
        )
    
    current_user = (
        await db.execute(
            select(User).where(User.id == user_id)
        )
    ).scalar_one_or_none()
    
    if not current_user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return current_user


@router.post("/signup")
async def signup(user: UserSignup, db: AsyncSession = Depends(get_db)):
    user_timezone = user.timezone if user.timezone and is_valid_timezone(user.timezone) else "UTC"

    new_user = User(
        username=user.username.strip().lower(),
        email=user.email.strip().lower(),
        password_hash=hash_password(user.password),
        timezone=user_timezone,
    )

    db.add(new_user)
    
    try: 
        await db.commit()
        await db.refresh(new_user)
    
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or username already exists.",
        )

    return {
        "message": "User registered successfully.",
        "user_id": str(new_user.id),
    }

@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    
    identifier = form_data.username.strip().lower()
    existing_user = (
        await db.execute(
            select(User).where(
                or_(
                    User.email == identifier,
                    User.username == identifier
                )
            )
        )
    ).scalar_one_or_none()
    
    if existing_user is None or not verify_password(form_data.password, existing_user.password_hash):
        raise HTTPException(
            status_code=401, 
            detail="Invalid email or password."
        )
    
    access_token = create_access_token({"sub": str(existing_user.id),})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
    )


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "display_name": current_user.display_name,
        "avatar_uploaded": current_user.avatar_uploaded,
        "avatar_version": current_user.avatar_version,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at
    }


@router.post("/me/password")
async def change_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect.",
        )

    current_user.password_hash = hash_password(payload.new_password)
    await db.commit()

    return {"message": "Password updated successfully."}