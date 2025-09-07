"""
Data models for the Lumea Solver
"""

from pydantic import BaseModel


class Asset(BaseModel):
    """Furniture asset definition"""

    key: str
    w_cm: int
    d_cm: int


class Room(BaseModel):
    """Room dimensions"""

    w_cm: int
    h_cm: int


class SolveRequest(BaseModel):
    """Request model for solving layout"""

    room: Room
    assets: list[Asset]
    rotations_allowed: dict[str, list[int]]
    seed: int
    rules: list[str]
    style: str | None = "modern"


class Placement(BaseModel):
    """Furniture placement result"""

    key: str
    x_cm: int
    y_cm: int
    rotation_deg: int


class ComplianceCheck(BaseModel):
    """Rule compliance check result"""

    rule_key: str
    passed: bool
    message: str


class SolveResponse(BaseModel):
    """Response model for solved layout"""

    placements: list[Placement]
    checks: list[ComplianceCheck]
    rationale: dict[str, list[str]]
    solver_ms: int


class ValidateRequest(BaseModel):
    """Request model for validating placements"""

    placements: list[Placement]
    room: Room
    assets: list[Asset]
    rules: list[str] | None = ["no-collision", "in-bounds"]


class ValidateResponse(BaseModel):
    """Response model for validation"""

    checks: list[ComplianceCheck]


class HealthResponse(BaseModel):
    """Health check response"""

    status: str
    service: str
    version: str | None = "0.0.1"
    uptime_seconds: int | None = None
