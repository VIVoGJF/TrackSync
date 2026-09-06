from fastapi import FastAPI

from app.api.auth_routes import router as auth_router
from app.api.task_routes import router as task_routes


app = FastAPI()


app.include_router(auth_router)
app.include_router(task_routes)


@app.get("/")
def root():
    return {"message": "Body Donation Portal API"}