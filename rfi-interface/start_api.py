from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn
from api import app as api_app

app = api_app

# Configure CORS with proper production settings
app.add_middleware(
    CORSMiddleware,
    # In production, specify exact frontend domain
    allow_origins=[os.environ.get("FRONTEND_URL", "https://rfi-interface.onrender.com")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    # Get port from environment variable (Render sets this)
    port = int(os.environ.get("PORT", 8001))
    
    # Start the server - no reload in production
    uvicorn.run("start_api:app", host="0.0.0.0", port=port) 