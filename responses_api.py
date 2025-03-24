from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import time
import re
import json
import logging
from datetime import datetime
from typing import List, Dict, Optional, Any
import httpx
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("rfi-responses-api")

# OpenAI API key from environment variable
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    logger.error("OPENAI_API_KEY environment variable not set")
    raise ValueError("OPENAI_API_KEY environment variable not set")

# OpenAI API base URL
api_base = "https://api.openai.com/v1"

# OpenAI API configuration
vector_store_id = "vs_67dfd56805fc81919d521954650a6f1d"  # Updated with correct vector store ID

# In-memory store for conversations
conversations_db = {}
feedback_db = {}

app = FastAPI(title="RFI Responses API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Serve static files for the frontend
app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")

class Query(BaseModel):
    question: str

class Feedback(BaseModel):
    conversation_id: str
    is_helpful: bool
    comments: Optional[str] = None

class SearchResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
    conversation_id: str = ""

def enhance_formatting(text):
    """
    Improve the formatting of the response text to make it more readable.
    - Format headings properly
    - Handle bullet points and numbered lists
    - Format code blocks
    """
    if not text:
        return text
    
    # Ensure proper markdown for headings (add space after #)
    text = re.sub(r'(?m)^(#{1,6})([^ #])', r'\1 \2', text)
    
    # Ensure lists have proper spacing
    text = re.sub(r'(?m)^([*-])([^ ])', r'\1 \2', text)
    
    # Ensure numbered lists have proper spacing
    text = re.sub(r'(?m)^(\d+\.)([^ ])', r'\1 \2', text)
    
    # Ensure proper spacing for code blocks
    if "```" in text and not re.search(r'```\w*\n', text):
        text = re.sub(r'```', '```\n', text)
    
    # Convert simple text blocks that look like lists into proper markdown lists
    lines = text.split('\n')
    for i in range(len(lines)):
        # Look for lines that start with numbers followed by dot or parenthesis without proper spacing
        match = re.match(r'^(\d+[\.\)])\s*(.+)$', lines[i])
        if match:
            lines[i] = f"{match.group(1)} {match.group(2)}"
        
        # Look for lines that start with asterisks or dashes without proper spacing
        match = re.match(r'^([\*\-])\s*(.+)$', lines[i])
        if match:
            lines[i] = f"{match.group(1)} {match.group(2)}"
    
    # Join lines back together
    text = '\n'.join(lines)
    
    # Bold important terms
    important_terms = ["Channel Factory", "RFI", "brand safety", "content verification"]
    for term in important_terms:
        text = re.sub(r'(?i)\b' + re.escape(term) + r'\b', f"**{term}**", text)
    
    return text

@app.post("/search")
async def search_documents(query: Query):
    """Search documents using the OpenAI Responses API"""
    try:
        logger.info(f"Received search query: {query.question}")
        
        # Set up the headers for the API request
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        # Set up the request payload for the Responses API
        payload = {
            "model": "gpt-4o",
            "tools": [{
                "type": "file_search",
                "vector_store_ids": [vector_store_id],  # Pass as array of strings
                "max_num_results": 20
            }],
            "input": query.question,
            # Include system instructions similar to what was used in the Assistant
            "instructions": "You are an expert on Channel Factory's RFI (Request for Information) documents. Your task is to provide accurate, relevant information from these documents in response to user queries. Present information in a clear, organized manner with proper formatting. When citing information, include the source document name. If you don't know the answer, say so rather than making up information."
        }
        
        # Make the request to the Responses API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{api_base}/responses",
                headers=headers,
                json=payload,
                timeout=60.0
            )
            
            # Check for errors
            if response.status_code != 200:
                logger.error(f"API error: {response.status_code}, {response.text}")
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Error from OpenAI API: {response.text}"
                )
            
            # Parse the response
            data = response.json()
            
            # Extract the response text and sources
            response_text = ""
            sources = []
            
            # Loop through the output to find the message
            for output in data.get("output", []):
                if output.get("type") == "message":
                    for content in output.get("content", []):
                        if content.get("type") == "output_text":
                            response_text = content.get("text", "")
                            
                            # Extract citations
                            for annotation in content.get("annotations", []):
                                if annotation.get("type") == "file_citation":
                                    file_id = annotation.get("file_id")
                                    filename = annotation.get("filename", "Unknown source")
                                    
                                    source = {
                                        "file": filename,
                                        "title": filename.replace(".pdf", "").replace("_", " "),
                                        "quote": ""  # OpenAI might not provide quotes in this format
                                    }
                                    
                                    if source not in sources:
                                        sources.append(source)
            
            # Enhance the formatting
            enhanced_response = enhance_formatting(response_text)
            
            # Generate a conversation ID and store the conversation
            conversation_id = f"resp_{len(conversations_db) + 1}_{int(time.time())}"
            conversations_db[conversation_id] = {
                "id": conversation_id,
                "timestamp": datetime.now().isoformat(),
                "question": query.question,
                "answer": enhanced_response,
                "sources": sources,
                "response_id": data.get("id", "")
            }
            
            logger.info(f"Stored conversation with ID: {conversation_id}")
            
            # Return the response
            return SearchResponse(
                answer=enhanced_response,
                sources=sources,
                conversation_id=conversation_id
            )
    
    except Exception as e:
        logger.error(f"Error during search: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/feedback")
async def submit_feedback(feedback: Feedback):
    try:
        if feedback.conversation_id not in conversations_db:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        timestamp = datetime.now().isoformat()
        feedback_id = f"feedback_{len(feedback_db) + 1}_{int(time.time())}"
        
        feedback_db[feedback_id] = {
            "id": feedback_id,
            "conversation_id": feedback.conversation_id,
            "is_helpful": feedback.is_helpful,
            "comments": feedback.comments,
            "timestamp": timestamp
        }
        
        # Update the conversation with feedback info
        conversations_db[feedback.conversation_id]["feedback"] = {
            "is_helpful": feedback.is_helpful,
            "comments": feedback.comments,
            "timestamp": timestamp
        }
        
        logger.info(f"Feedback recorded with ID: {feedback_id} for conversation: {feedback.conversation_id}")
        return {"status": "success", "feedback_id": feedback_id}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/conversations")
async def get_conversations():
    return list(conversations_db.values())

@app.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    if conversation_id not in conversations_db:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversations_db[conversation_id]

@app.get("/feedback")
async def get_all_feedback():
    return list(feedback_db.values())

@app.get("/feedback/stats")
async def get_feedback_stats():
    total = len(feedback_db)
    helpful = sum(1 for f in feedback_db.values() if f["is_helpful"])
    not_helpful = total - helpful
    
    helpful_percentage = (helpful / total) * 100 if total > 0 else 0
    
    return {
        "total_feedback": total,
        "helpful": helpful,
        "not_helpful": not_helpful,
        "helpful_percentage": round(helpful_percentage, 2)
    }

@app.get("/feedback/conversation/{conversation_id}")
async def get_conversation_feedback(conversation_id: str):
    if conversation_id not in conversations_db:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversation_feedback = [
        f for f in feedback_db.values() 
        if f["conversation_id"] == conversation_id
    ]
    
    return conversation_feedback

@app.get("/test-openai")
async def test_openai_connection():
    try:
        logger.info("Testing OpenAI API connection")
        
        # Test models endpoint to verify API connectivity
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{api_base}/models",
                headers=headers
            )
            
            if response.status_code != 200:
                raise Exception(f"API returned error: {response.status_code}, {response.text}")
            
            models = response.json()
            model_names = [model["id"] for model in models["data"][:5]]
        
        return {
            "status": "connected",
            "api_key_valid": True,
            "available_models_sample": model_names,
            "using_responses_api": True
        }
    except Exception as e:
        logger.error(f"OpenAI API connection test failed: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "message": str(e),
            "api_key_valid": False
        }

@app.get("/health")
async def health_check():
    return {"status": "ok", "api": "RFI Responses API"}

@app.get("/", include_in_schema=False)
async def serve_frontend():
    return FileResponse("frontend/dist/index.html")

@app.get("/{catch_all:path}", include_in_schema=False)
async def serve_frontend_catch_all(catch_all: str):
    # Don't interfere with API routes
    if catch_all.startswith(("search", "feedback", "conversations", "health", "test-openai")):
        raise HTTPException(status_code=404, detail="API route not found")
    return FileResponse("frontend/dist/index.html")

# Main entry point
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    
    # Make sure the frontend/dist directory exists
    os.makedirs("frontend/dist/assets", exist_ok=True)
    
    print(f"Starting server on port {port}")
    uvicorn.run("responses_api:app", host="0.0.0.0", port=port, reload=True) 