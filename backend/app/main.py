from fastapi import FastAPI

from app.api.organizations import router as organizations_router


app = FastAPI(title="QueueLess API")


app.include_router(organizations_router)


@app.get("/")
def root():
    return {"message": "QueueLess API is running"}