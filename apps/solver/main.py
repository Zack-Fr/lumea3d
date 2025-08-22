from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import time
import random

app = FastAPI(
    title="Lumea Solver",
    description="Constraint satisfaction solver for interior layout generation",
    version="0.0.1"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class Asset(BaseModel):
    key: str
    w_cm: int
    d_cm: int

class Room(BaseModel):
    w_cm: int
    h_cm: int

class SolveRequest(BaseModel):
    room: Room
    assets: List[Asset]
    rotations_allowed: Dict[str, List[int]]
    seed: int
    rules: List[str]
    style: Optional[str] = "modern"

class Placement(BaseModel):
    key: str
    x_cm: int
    y_cm: int
    rotation_deg: int

class ComplianceCheck(BaseModel):
    rule_key: str
    passed: bool
    message: str

class SolveResponse(BaseModel):
    placements: List[Placement]
    checks: List[ComplianceCheck]
    rationale: Dict[str, List[str]]
    solver_ms: int

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "lumea-solver"}

@app.post("/solve", response_model=SolveResponse)
async def solve_layout(request: SolveRequest):
    """
    Solve interior layout using constraint satisfaction.
    Returns placements, compliance checks, and rationale.
    """
    start_time = time.time()
    
    # Placeholder implementation - will be replaced with OR-Tools CP-SAT
    # For now, return deterministic mock data for testing
    
    random.seed(request.seed)
    
    # Mock placements for 3 assets
    placements = [
        Placement(key="sofa", x_cm=250, y_cm=60, rotation_deg=0),
        Placement(key="coffee_table", x_cm=250, y_cm=140, rotation_deg=0),
        Placement(key="side_table", x_cm=360, y_cm=60, rotation_deg=0),
    ]
    
    # Mock compliance checks
    checks = [
        ComplianceCheck(
            rule_key="no-collision",
            passed=True,
            message="All furniture pieces have non-overlapping boundaries"
        ),
        ComplianceCheck(
            rule_key="sofa-front-walkway-60",
            passed=True,
            message="Clear walkway of 80cm maintained in front of sofa"
        ),
        ComplianceCheck(
            rule_key="coffee-centered-to-sofa",
            passed=True,
            message="Coffee table centered on sofa longitudinal axis with 50cm gap"
        ),
        ComplianceCheck(
            rule_key="side-table-adjacent",
            passed=True,
            message="Side table positioned within 10cm of sofa arm"
        ),
    ]
    
    # Mock rationale
    rationale = {
        "sofa": [
            "Positioned along the long wall for optimal seating arrangement",
            "Maintains required clearance from room boundaries"
        ],
        "coffee_table": [
            "Centered relative to sofa for balanced layout",
            "50cm gap allows comfortable access while maintaining proximity"
        ],
        "side_table": [
            "Adjacent to sofa arm for convenient access",
            "Aligned with sofa edge for visual cohesion"
        ]
    }
    
    solver_ms = int((time.time() - start_time) * 1000)
    
    return SolveResponse(
        placements=placements,
        checks=checks,
        rationale=rationale,
        solver_ms=solver_ms
    )

@app.post("/validate")
async def validate_placements(request: dict):
    """
    Validate supplied placements against hard rules.
    Used for post-generation nudging validation.
    """
    # Placeholder - will implement hard rule validation
    return {
        "checks": [
            {"rule_key": "no-collision", "passed": True, "message": "No overlapping detected"},
            {"rule_key": "in-bounds", "passed": True, "message": "All items within room boundaries"}
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)