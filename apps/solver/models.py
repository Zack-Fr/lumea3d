"""
Data models for the Lumea Solver
"""
from pydantic import BaseModel
from typing import List, Dict, Optional


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
    assets: List[Asset]
    rotations_allowed: Dict[str, List[int]]
    seed: int
    rules: List[str]
    style: Optional[str] = "modern"


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
    placements: List[Placement]
    checks: List[ComplianceCheck]
    rationale: Dict[str, List[str]]
    solver_ms: int


class ValidateRequest(BaseModel):
    """Request model for validating placements"""
    placements: List[Placement]
    room: Room
    assets: List[Asset]
    rules: Optional[List[str]] = ["no-collision", "in-bounds"]


class ValidateResponse(BaseModel):
    """Response model for validation"""
    checks: List[ComplianceCheck]


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    version: Optional[str] = "0.0.1"
    uptime_seconds: Optional[int] = None