"""
Tests for the solver engine and rules
"""
import pytest
from solver import ConstraintSolver, RulesEngine, SolverConfig, AIIntegrationHelper
from models import Asset, Room, Placement, ComplianceCheck


class TestConstraintSolver:
    """Test the main constraint solver"""
    
    def test_solver_initialization(self):
        """Test solver can be initialized"""
        solver = ConstraintSolver()
        assert solver is not None
        assert solver.config is not None
        assert solver.rules_engine is not None
    
    def test_solver_with_custom_config(self):
        """Test solver with custom configuration"""
        config = SolverConfig(max_iterations=500, timeout_seconds=15)
        solver = ConstraintSolver(config)
        
        assert solver.config.max_iterations == 500
        assert solver.config.timeout_seconds == 15
    
    def test_solve_basic_scenario(self):
        """Test solving a basic layout scenario"""
        solver = ConstraintSolver()
        
        room = Room(w_cm=500, h_cm=400)
        assets = [
            Asset(key="sofa", w_cm=180, d_cm=80),
            Asset(key="table", w_cm=100, d_cm=60)
        ]
        rotations = {"sofa": [0], "table": [0, 90]}
        
        placements, checks, rationale, solver_ms = solver.solve(
            room=room,
            assets=assets,
            rotations_allowed=rotations,
            seed=42,
            rules=["no-collision"],
            style="modern"
        )
        
        # Validate results
        assert len(placements) == 2
        assert len(checks) >= 1
        assert isinstance(rationale, dict)
        assert solver_ms >= 0
        
        # Check placement structure
        for placement in placements:
            assert hasattr(placement, 'key')
            assert hasattr(placement, 'x_cm')
            assert hasattr(placement, 'y_cm')
            assert hasattr(placement, 'rotation_deg')
    
    def test_solve_deterministic(self):
        """Test that solver produces deterministic results with same seed"""
        solver = ConstraintSolver()
        
        room = Room(w_cm=500, h_cm=400)
        assets = [Asset(key="sofa", w_cm=180, d_cm=80)]
        rotations = {"sofa": [0]}
        
        # Solve twice with same parameters
        result1 = solver.solve(room, assets, rotations, 42, ["no-collision"])
        result2 = solver.solve(room, assets, rotations, 42, ["no-collision"])
        
        # Results should be identical
        assert result1[0] == result2[0]  # placements
        assert result1[1] == result2[1]  # checks


class TestRulesEngine:
    """Test the rules validation engine"""
    
    def test_rules_engine_initialization(self):
        """Test rules engine can be initialized"""
        engine = RulesEngine()
        assert engine is not None
    
    def test_validate_placements(self):
        """Test placement validation"""
        engine = RulesEngine()
        
        room = Room(w_cm=500, h_cm=400)
        assets = [Asset(key="sofa", w_cm=180, d_cm=80)]
        placements = [Placement(key="sofa", x_cm=100, y_cm=100, rotation_deg=0)]
        rules = ["no-collision", "in-bounds"]
        
        checks = engine.validate_placements(placements, room, assets, rules)
        
        assert len(checks) == 2
        assert all(isinstance(check, ComplianceCheck) for check in checks)
        assert all(hasattr(check, 'rule_key') for check in checks)
        assert all(hasattr(check, 'passed') for check in checks)
        assert all(hasattr(check, 'message') for check in checks)
    
    def test_unknown_rule_handling(self):
        """Test handling of unknown rules"""
        engine = RulesEngine()
        
        room = Room(w_cm=500, h_cm=400)
        assets = [Asset(key="sofa", w_cm=180, d_cm=80)]
        placements = [Placement(key="sofa", x_cm=100, y_cm=100, rotation_deg=0)]
        rules = ["unknown-rule"]
        
        checks = engine.validate_placements(placements, room, assets, rules)
        
        assert len(checks) == 1
        assert checks[0].rule_key == "unknown-rule"
        assert checks[0].passed == True  # Unknown rules default to passing
        assert "not implemented" in checks[0].message.lower()


class TestAIIntegrationHelper:
    """Test AI integration utilities"""
    
    def test_prepare_solver_request(self):
        """Test preparation of solver request from backend data"""
        backend_data = {
            "roomWCm": 600,
            "roomHCm": 450,
            "seed": 12345,
            "style": "minimalist"
        }
        
        solver_request = AIIntegrationHelper.prepare_solver_request(backend_data)
        
        assert solver_request["room"]["w_cm"] == 600
        assert solver_request["room"]["h_cm"] == 450
        assert solver_request["seed"] == 12345
        assert solver_request["style"] == "minimalist"
        assert "assets" in solver_request
        assert "rotations_allowed" in solver_request
        assert "rules" in solver_request
    
    def test_prepare_solver_request_defaults(self):
        """Test solver request preparation with default values"""
        backend_data = {}  # Empty data should use defaults
        
        solver_request = AIIntegrationHelper.prepare_solver_request(backend_data)
        
        assert solver_request["room"]["w_cm"] == 500  # default
        assert solver_request["room"]["h_cm"] == 400  # default
        assert solver_request["style"] == "modern"   # default
        assert len(solver_request["assets"]) > 0     # should have default assets
    
    def test_format_response_for_backend(self):
        """Test formatting solver response for backend consumption"""
        placements = [
            Placement(key="sofa", x_cm=100, y_cm=150, rotation_deg=0),
            Placement(key="table", x_cm=200, y_cm=250, rotation_deg=90)
        ]
        checks = [
            ComplianceCheck(rule_key="no-collision", passed=True, message="OK")
        ]
        rationale = {"sofa": ["Good position"], "table": ["Centered well"]}
        solver_ms = 150
        
        formatted = AIIntegrationHelper.format_response_for_backend(
            placements, checks, rationale, solver_ms
        )
        
        assert "placements" in formatted
        assert "complianceChecks" in formatted
        assert "rationale" in formatted
        assert "solverMs" in formatted
        assert "metadata" in formatted
        
        # Check placement format
        assert len(formatted["placements"]) == 2
        placement = formatted["placements"][0]
        assert placement["assetKey"] == "sofa"
        assert placement["xCm"] == 100
        assert placement["yCm"] == 150
        assert placement["rotationDeg"] == 0
        
        # Check compliance format
        assert len(formatted["complianceChecks"]) == 1
        check = formatted["complianceChecks"][0]
        assert check["ruleKey"] == "no-collision"
        assert check["passed"] == True
        assert check["message"] == "OK"


class TestSolverConfig:
    """Test solver configuration"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = SolverConfig()
        
        assert config.max_iterations == 1000
        assert config.timeout_seconds == 30
        assert config.optimization_level == "balanced"
    
    def test_custom_config(self):
        """Test custom configuration values"""
        config = SolverConfig(
            max_iterations=2000,
            timeout_seconds=60,
            optimization_level="optimal"
        )
        
        assert config.max_iterations == 2000
        assert config.timeout_seconds == 60
        assert config.optimization_level == "optimal"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])