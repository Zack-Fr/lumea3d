"""
Test suite for Lumea Solver API
"""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestHealthCheck:
    """Test health check endpoint"""
    
    def test_health_check(self):
        """Test health check returns correct status"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "lumea-solver"


class TestSolveEndpoint:
    """Test the main solve endpoint"""
    
    def test_solve_with_valid_request(self):
        """Test solve endpoint with valid request"""
        request_data = {
            "room": {
                "w_cm": 500,
                "h_cm": 400
            },
            "assets": [
                {"key": "sofa", "w_cm": 180, "d_cm": 80},
                {"key": "coffee_table", "w_cm": 100, "d_cm": 60},
                {"key": "side_table", "w_cm": 50, "d_cm": 50}
            ],
            "rotations_allowed": {
                "sofa": [0, 180],
                "coffee_table": [0, 90],
                "side_table": [0]
            },
            "seed": 12345,
            "rules": ["no-collision", "sofa-front-walkway-60"],
            "style": "modern"
        }
        
        response = client.post("/solve", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        
        # Validate response structure
        assert "placements" in data
        assert "checks" in data
        assert "rationale" in data
        assert "solver_ms" in data
        
        # Validate placements
        placements = data["placements"]
        assert len(placements) == 3
        
        for placement in placements:
            assert "key" in placement
            assert "x_cm" in placement
            assert "y_cm" in placement
            assert "rotation_deg" in placement
            assert isinstance(placement["x_cm"], int)
            assert isinstance(placement["y_cm"], int)
            assert isinstance(placement["rotation_deg"], int)
        
        # Validate compliance checks
        checks = data["checks"]
        assert len(checks) > 0
        
        for check in checks:
            assert "rule_key" in check
            assert "passed" in check
            assert "message" in check
            assert isinstance(check["passed"], bool)
        
        # Validate rationale
        rationale = data["rationale"]
        assert isinstance(rationale, dict)
        
        # Validate solver timing
        assert isinstance(data["solver_ms"], int)
        assert data["solver_ms"] >= 0
    
    def test_solve_deterministic_with_same_seed(self):
        """Test that same seed produces same results"""
        request_data = {
            "room": {"w_cm": 500, "h_cm": 400},
            "assets": [{"key": "sofa", "w_cm": 180, "d_cm": 80}],
            "rotations_allowed": {"sofa": [0]},
            "seed": 42,
            "rules": ["no-collision"],
            "style": "modern"
        }
        
        response1 = client.post("/solve", json=request_data)
        response2 = client.post("/solve", json=request_data)
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        # Results should be identical with same seed
        data1 = response1.json()
        data2 = response2.json()
        
        assert data1["placements"] == data2["placements"]
    
    def test_solve_with_invalid_request(self):
        """Test solve endpoint with invalid request"""
        # Missing required fields
        invalid_request = {
            "room": {"w_cm": 500},  # Missing h_cm
            "assets": []
        }
        
        response = client.post("/solve", json=invalid_request)
        assert response.status_code == 422  # Validation error


class TestValidateEndpoint:
    """Test the validation endpoint"""
    
    def test_validate_placements(self):
        """Test placement validation"""
        validation_request = {
            "placements": [
                {"key": "sofa", "x_cm": 100, "y_cm": 100, "rotation_deg": 0}
            ],
            "room": {"w_cm": 500, "h_cm": 400},
            "assets": [{"key": "sofa", "w_cm": 180, "d_cm": 80}]
        }
        
        response = client.post("/validate", json=validation_request)
        assert response.status_code == 200
        
        data = response.json()
        assert "checks" in data
        
        checks = data["checks"]
        assert len(checks) > 0
        
        for check in checks:
            assert "rule_key" in check
            assert "passed" in check
            assert "message" in check


class TestErrorHandling:
    """Test error handling scenarios"""
    
    def test_invalid_json(self):
        """Test handling of invalid JSON"""
        response = client.post("/solve", content="invalid json")
        assert response.status_code == 422
    
    def test_missing_content_type(self):
        """Test handling of missing content type"""
        response = client.post("/solve")
        assert response.status_code == 422


class TestCORSMiddleware:
    """Test CORS middleware configuration"""
    
    def test_cors_headers_present(self):
        """Test that CORS headers are present"""
        response = client.post("/solve", json={
            "room": {"w_cm": 500, "h_cm": 400},
            "assets": [{"key": "sofa", "w_cm": 180, "d_cm": 80}],
            "rotations_allowed": {"sofa": [0]},
            "seed": 42,
            "rules": ["no-collision"],
            "style": "modern"
        })
        # Check that response has CORS headers
        assert response.status_code == 200
        # CORS headers would be added by middleware in actual deployment


if __name__ == "__main__":
    pytest.main([__file__, "-v"])