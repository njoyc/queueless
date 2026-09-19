from fastapi import FastAPI

from app.api.auth import router as auth_router
from app.api.organizations import router as organizations_router
from app.api.services import router as services_router
from app.api.appointments import router as appointments_router
from app.api.queue import router as queue_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="QueueLess API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(organizations_router)
app.include_router(services_router)
app.include_router(appointments_router)
app.include_router(queue_router)

@app.get("/")
def root():
    return {"message": "QueueLess API is running"}