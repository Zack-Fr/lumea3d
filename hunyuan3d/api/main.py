#!/usr/bin/env python3
"""
Hunyuan3D Generator Service
FastAPI service for 3D shape generation using Hunyuan3D models
"""

import os
import sys
import time
import uuid
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager
from datetime import datetime

import torch
import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import jwt
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add current directory to path
sys.path.append(str(Path(__file__).parent.parent))

from scripts.baseline_inference import Hunyuan3DInference

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables
inference_engine: Optional[Hunyuan3DInference] = None
active_jobs: Dict[str, Dict[str, Any]] = {}

class GenerationRequest(BaseModel):
    """Request model for 3D generation"""
    prompt: str = Field(..., description="Text description of the 3D shape to generate", min_length=1, max_length=500)
    seed: Optional[int] = Field(None, description="Random seed for reproducible generation", ge=0, le=2**32-1)
    user_id: Optional[str] = Field(None, description="User identifier for tracking")

class GenerationResponse(BaseModel):
    """Response model for generation results"""
    job_id: str
    status: str
    prompt: str
    estimated_time: str
    created_at: datetime

class JobStatus(BaseModel):
    """Job status response"""
    job_id: str
    status: str
    progress: float
    message: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class TokenData(BaseModel):
    user_id: str
    exp: int

# Authentication dependency
def verify_token(token: str) -> TokenData:
    """Verify JWT token and return user data"""
    try:
        jwt_secret = os.getenv("JWT_SECRET", "your-secret-key")
        payload = jwt.decode(token, jwt_secret, algorithms=["HS256"])
        return TokenData(**payload)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(authorization: str = None) -> TokenData:
    """Extract and verify JWT token from Authorization header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")

    token = authorization.split(" ")[1]
    return verify_token(token)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global inference_engine

    # Startup
    logger.info("Starting Hunyuan3D Generator Service...")
    try:
        inference_engine = Hunyuan3DInference()
        if not inference_engine.load_models():
            logger.error("Failed to load Hunyuan3D models during startup")
            raise RuntimeError("Model loading failed")

        # Load text-to-image model
        if not inference_engine.load_text_to_image_model():
            logger.warning("Failed to load text-to-image model")
        else:
            logger.info("Text-to-image model loaded successfully")

        logger.info("Models loaded successfully")
    except Exception as e:
        logger.error(f"Failed to initialize inference engine: {e}")
        raise

    yield

    # Shutdown
    logger.info("Shutting down Hunyuan3D Generator Service...")

# Create FastAPI app
app = FastAPI(
    title="Hunyuan3D Generator Service",
    description="3D shape generation service using Hunyuan3D models",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def process_generation(job_id: str, request: GenerationRequest, user_id: str):
    """Background task to process 3D generation"""
    try:
        # Update job status
        active_jobs[job_id]["status"] = "processing"
        active_jobs[job_id]["message"] = "Initializing generation..."
        active_jobs[job_id]["updated_at"] = datetime.now()

        logger.info(f"Starting generation for job {job_id}: {request.prompt}")

        # Generate the 3D shape
        start_time = time.time()
        result = inference_engine.generate_shape(
            prompt=request.prompt,
            seed=request.seed
        )
        generation_time = time.time() - start_time

        if result["success"]:
            active_jobs[job_id].update({
                "status": "completed",
                "progress": 1.0,
                "message": "Generation completed successfully",
                "result": {
                    **result,
                    "generation_time": generation_time
                }
            })
            logger.info(f"Generation completed for job {job_id} in {generation_time:.2f}s")
        else:
            active_jobs[job_id].update({
                "status": "failed",
                "message": f"Generation failed: {result.get('error', 'Unknown error')}"
            })
            logger.error(f"Generation failed for job {job_id}: {result.get('error', 'Unknown error')}")

    except Exception as e:
        logger.error(f"Generation failed for job {job_id}: {e}")
        active_jobs[job_id].update({
            "status": "failed",
            "message": f"Generation failed: {str(e)}"
        })

    active_jobs[job_id]["updated_at"] = datetime.now()

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Hunyuan3D Generator",
        "version": "1.0.0",
        "status": "running",
        "models_loaded": inference_engine is not None
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "device": str(inference_engine.device) if inference_engine else "unknown",
        "cuda_available": torch.cuda.is_available() if torch else False
    }

@app.post("/generate", response_model=GenerationResponse)
async def generate_3d_shape(request: GenerationRequest, background_tasks: BackgroundTasks, current_user: TokenData = Depends(get_current_user)):
    """Generate a 3D shape from text prompt"""
    if not inference_engine:
        raise HTTPException(status_code=503, detail="Inference engine not available")

    # Create job
    job_id = str(uuid.uuid4())
    job_data = {
        "job_id": job_id,
        "status": "pending",
        "progress": 0.0,
        "message": "Job queued for processing",
        "prompt": request.prompt,
        "user_id": current_user.user_id,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "result": None
    }
    active_jobs[job_id] = job_data

    # Start background processing
    background_tasks.add_task(process_generation, job_id, request, current_user.user_id)

    return GenerationResponse(
        job_id=job_id,
        status="accepted",
        prompt=request.prompt,
        estimated_time="70-80 seconds",
        created_at=job_data["created_at"]
    )

@app.get("/job/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str, current_user: TokenData = Depends(get_current_user)):
    """Get the status of a generation job"""
    if job_id not in active_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = active_jobs[job_id]

    # Check if user owns this job
    if job["user_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return JobStatus(**job)

@app.get("/jobs", response_model=List[JobStatus])
async def list_user_jobs(current_user: TokenData = Depends(get_current_user)):
    """List all jobs for the current user"""
    user_jobs = [
        JobStatus(**job) for job in active_jobs.values()
        if job["user_id"] == current_user.user_id
    ]

    # Sort by creation time (newest first)
    user_jobs.sort(key=lambda x: x.created_at, reverse=True)

    return user_jobs

@app.delete("/job/{job_id}")
async def cancel_job(job_id: str, current_user: TokenData = Depends(get_current_user)):
    """Cancel a job (if still queued or processing)"""
    if job_id not in active_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = active_jobs[job_id]

    # Check if user owns this job
    if job["user_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if job["status"] in ["completed", "failed"]:
        raise HTTPException(status_code=400, detail="Cannot cancel completed or failed job")

    job["status"] = "cancelled"
    job["updated_at"] = datetime.now()

    return {"message": f"Job {job_id} cancelled"}

@app.get("/download/{job_id}")
async def download_result(job_id: str, current_user: TokenData = Depends(get_current_user)):
    """Download the generated GLB file"""
    if job_id not in active_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = active_jobs[job_id]

    # Check if user owns this job
    if job["user_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Check if job is completed
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Job not completed yet")

    # Get file path from result
    result = job.get("result", {})
    mesh = result.get("mesh")

    if mesh is None:
        raise HTTPException(status_code=404, detail="Generated file not found")

    # Create temporary file path
    temp_dir = Path("temp")
    temp_dir.mkdir(exist_ok=True)
    temp_file = temp_dir / f"{job_id}.glb"

    try:
        # Export mesh to temporary file
        mesh.export(str(temp_file))

        # Return file response
        return FileResponse(
            path=temp_file,
            media_type="model/gltf-binary",
            filename=f"shape_{job_id}.glb"
        )

    except Exception as e:
        logger.error(f"Failed to export mesh: {e}")
        raise HTTPException(status_code=500, detail="Failed to prepare download")

@app.get("/stream/{job_id}")
async def stream_job_status(job_id: str, current_user: TokenData = Depends(get_current_user)):
    """Stream job status updates using Server-Sent Events"""
    if job_id not in active_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = active_jobs[job_id]

    # Check if user owns this job
    if job["user_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    async def event_generator():
        last_update = None

        while True:
            current_update = job["updated_at"]

            if last_update != current_update:
                last_update = current_update

                # Send job status update
                data = {
                    "job_id": job["job_id"],
                    "status": job["status"],
                    "progress": job["progress"],
                    "message": job["message"],
                    "timestamp": job["updated_at"].isoformat()
                }

                yield f"data: {data}\n\n"

                # If job is completed or failed, end the stream
                if job["status"] in ["completed", "failed", "cancelled"]:
                    break

            await asyncio.sleep(1)  # Check for updates every second

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )