from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import os
import sys
from pathlib import Path
from typing import List, Dict, Optional, Any
import uvicorn
import re
from pydantic import BaseModel
from api import app as api_app

app = api_app

# Add CORS middleware with proper configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, replace with specific origins like "https://your-frontend.onrender.com"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Query(BaseModel):
    question: str

class RFISearcher:
    def __init__(self, docs_dir):
        self.docs_dir = docs_dir
        
    def search(self, query, context_lines=2, case_sensitive=False, section_only=False, file_pattern=None):
        # Mock implementation - returns sample results
        return [
            ("sample_file.md", [(1, "Sample match line 1", "Section 1")]),
            ("sample_file2.md", [(5, "Sample match line 2", "Section 2")])
        ]

# Initialize the RFI searcher
docs_dir = str(Path(__file__).parent.parent / "rfi-docs")
rfi_searcher = RFISearcher(docs_dir)

@app.get("/search")
async def search_get(
    query: str,
    context_lines: Optional[int] = 2,
    case_sensitive: Optional[bool] = False,
    section_only: Optional[bool] = False,
    file_pattern: Optional[str] = None
) -> Dict:
    return await perform_search(query, context_lines, case_sensitive, section_only, file_pattern)

@app.post("/search")
async def search_post(query: Query) -> Dict:
    return await perform_search(
        query.question, 
        2,  # default context_lines
        False,  # default case_sensitive
        False,  # default section_only
        None    # default file_pattern
    )

async def perform_search(
    query: str,
    context_lines: int = 2,
    case_sensitive: bool = False,
    section_only: bool = False,
    file_pattern: Optional[str] = None
) -> Dict:
    try:
        results = rfi_searcher.search(
            query=query,
            context_lines=context_lines,
            case_sensitive=case_sensitive,
            section_only=section_only,
            file_pattern=file_pattern
        )
        
        # Format results for frontend
        formatted_results = []
        for file_path, matches in results:
            file_name = os.path.basename(file_path)
            formatted_matches = []
            
            for line_num, line_content, section in matches:
                formatted_matches.append({
                    "line_number": line_num,
                    "content": line_content,
                    "section": section
                })
            
            formatted_results.append({
                "file_name": file_name,
                "matches": formatted_matches
            })
        
        return {
            "status": "success",
            "results": formatted_results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("run_api:app", host="0.0.0.0", port=8001, reload=True) 