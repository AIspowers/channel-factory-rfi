from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sys
import os
from pathlib import Path
from typing import List, Dict, Optional
import json
from datetime import datetime

# Add the parent directory to Python path to import search_rfi_docs
sys.path.append(str(Path(__file__).parent.parent))
from search_rfi_docs import RFISearcher

app = FastAPI()

# Configure CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite's default dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the RFI searcher
docs_dir = str(Path(__file__).parent.parent / "rfi-docs")
rfi_searcher = RFISearcher(docs_dir)

@app.get("/search")
async def search(
    query: str,
    context_lines: Optional[int] = 2,
    case_sensitive: Optional[bool] = False,
    section_only: Optional[bool] = False,
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 