from fastapi import FastAPI

from app.api.auth_routes import router as auth_router
from app.api.task_routes import router as task_routes
from app.api.progress_routes import router as progress_router
from app.api.dashboard_routes import router as dashboard_router


app = FastAPI()


app.include_router(auth_router)
app.include_router(task_routes)
app.include_router(progress_router)
app.include_router(dashboard_router)


@app.get("/")
def root():
    return {"message": "Body Donation Portal API"}