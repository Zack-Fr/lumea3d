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

import torch
import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import logging

# Add current directory to path
sys.path.append(str(Path(__file__).parent.parent))

from scripts.baseline_inference import Hunyuan3DInference

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables
inference_engine: Optional[Hunyuan3DInference] = None

class GenerationRequest(BaseModel):
    """Request model for 3D generation"""
    prompt: str = Field(..., description="Text description of the 3D shape to generate")
    seed: Optional[int] = Field(None, description="Random seed for reproducible generation")
    style: Optional[str] = Field("realistic", description="Style preset (realistic, cartoon, etc.)")
    quality: Optional[str] = Field("standard", description="Quality preset (draft, standard, high)")

class GenerationResponse(BaseModel):
    """Response model for generation results"""
    job_id: str
    status: str
    prompt: str
    estimated_time: float
    created_at: float

class JobStatus(BaseModel):
    """Job status response"""
    job_id: str
    status: str
    progress: float
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: float
    completed_at: Optional[float] = None

# In-memory job storage (in production, use Redis/database)
jobs: Dict[str, Dict[str, Any]] = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global inference_engine

    # Startup
    logger.info("Starting Hunyuan3D Generator Service...")
    try:
        inference_engine = Hunyuan3DInference()
        if not inference_engine.load_models():
            logger.error("Failed to load models during startup")
            raise RuntimeError("Model loading failed")
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

async def process_generation(job_id: str, request: GenerationRequest):
    """Background task to process 3D generation"""
    global jobs

    try:
        # Update job status
        jobs[job_id]["status"] = "processing"
        jobs[job_id]["progress"] = 0.1

        logger.info(f"Starting generation for job {job_id}: {request.prompt}")

        # Simulate progress updates
        await asyncio.sleep(0.5)
        jobs[job_id]["progress"] = 0.3

        # Generate the 3D shape
        start_time = time.time()
        result = inference_engine.generate_shape(
            prompt=request.prompt,
            seed=request.seed
        )
        generation_time = time.time() - start_time

        # Update job with results
        jobs[job_id].update({
            "status": "completed",
            "progress": 1.0,
            "result": {
                **result,
                "generation_time": generation_time,
                "style": request.style,
                "quality": request.quality
            },
            "completed_at": time.time()
        })

        logger.info(f"Generation completed for job {job_id} in {generation_time:.2f}s")

    except Exception as e:
        logger.error(f"Generation failed for job {job_id}: {e}")
        jobs[job_id].update({
            "status": "failed",
            "error": str(e),
            "completed_at": time.time()
        })

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
async def generate_3d_shape(request: GenerationRequest, background_tasks: BackgroundTasks):
    """Generate a 3D shape from text prompt"""
    if not inference_engine:
        raise HTTPException(status_code=503, detail="Inference engine not available")

    # Create job
    job_id = str(uuid.uuid4())
    job_data = {
        "job_id": job_id,
        "status": "queued",
        "progress": 0.0,
        "prompt": request.prompt,
        "created_at": time.time()
    }
    jobs[job_id] = job_data

    # Start background processing
    background_tasks.add_task(process_generation, job_id, request)

    # Estimate completion time (placeholder)
    estimated_time = 30.0  # seconds

    return GenerationResponse(
        job_id=job_id,
        status="queued",
        prompt=request.prompt,
        estimated_time=estimated_time,
        created_at=job_data["created_at"]
    )

@app.get("/job/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    """Get the status of a generation job"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[job_id]
    return JobStatus(**job)

@app.get("/jobs", response_model=List[JobStatus])
async def list_jobs():
    """List all jobs"""
    return [JobStatus(**job) for job in jobs.values()]

@app.delete("/job/{job_id}")
async def cancel_job(job_id: str):
    """Cancel a job (if still queued or processing)"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[job_id]
    if job["status"] in ["completed", "failed"]:
        raise HTTPException(status_code=400, detail="Cannot cancel completed or failed job")

    job["status"] = "cancelled"
    job["completed_at"] = time.time()

    return {"message": f"Job {job_id} cancelled"}

if __name__ == "__main__":
    # Run the server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=False,
        log_level="info"
    )