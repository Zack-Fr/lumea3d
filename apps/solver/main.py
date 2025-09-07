from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import time

from models import (
    SolveRequest, SolveResponse, ValidateRequest, ValidateResponse, HealthResponse
)
from solver import ConstraintSolver, AIIntegrationHelper

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

# Global solver instance
solver = ConstraintSolver()
ai_helper = AIIntegrationHelper()

# Application startup time for uptime calculation
startup_time = time.time()


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    uptime = int(time.time() - startup_time)
    return HealthResponse(
        status="ok", 
        service="lumea-solver",
        version="0.0.1",
        uptime_seconds=uptime
    )


@app.post("/solve", response_model=SolveResponse)
async def solve_layout(request: SolveRequest):
    """
    Solve interior layout using constraint satisfaction.
    Returns placements, compliance checks, and rationale.
    """
    placements, checks, rationale, solver_ms = solver.solve(
        room=request.room,
        assets=request.assets,
        rotations_allowed=request.rotations_allowed,
        seed=request.seed,
        rules=request.rules,
        style=request.style
    )
    
    return SolveResponse(
        placements=placements,
        checks=checks,
        rationale=rationale,
        solver_ms=solver_ms
    )


@app.post("/validate", response_model=ValidateResponse)
async def validate_placements(request: ValidateRequest):
    """
    Validate supplied placements against hard rules.
    Used for post-generation nudging validation.
    """
    from solver import RulesEngine
    
    rules_engine = RulesEngine()
    checks = rules_engine.validate_placements(
        placements=request.placements,
        room=request.room,
        assets=request.assets,
        rules=request.rules
    )
    
    return ValidateResponse(checks=checks)


@app.post("/solve-from-backend")
async def solve_from_backend_data(backend_data: dict):
    """
    Endpoint for backend AI integration.
    Accepts backend scene data and returns formatted response.
    """
    # Transform backend data to solver format
    solver_request_data = ai_helper.prepare_solver_request(backend_data)
    
    # Create request model
    request = SolveRequest(**solver_request_data)
    
    # Solve
    placements, checks, rationale, solver_ms = solver.solve(
        room=request.room,
        assets=request.assets,
        rotations_allowed=request.rotations_allowed,
        seed=request.seed,
        rules=request.rules,
        style=request.style
    )
    
    # Format response for backend consumption
    formatted_response = ai_helper.format_response_for_backend(
        placements, checks, rationale, solver_ms
    )
    
    return formatted_response


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)