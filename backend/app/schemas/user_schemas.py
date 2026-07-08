from pydantic import BaseModel, EmailStr, Field


class UserSignup(BaseModel):
    username: str = Field(min_length=3, max_length=30, description="Username must be between 3 and 30 characters.")
    email: EmailStr
    password: str =  Field(min_length=8, description="Password must be at least 8 characters long.")


class UserLogin(BaseModel):
    identifier: str
    password: str
    
class TokenResponse(BaseModel):
    access_token: str
    token_type: str