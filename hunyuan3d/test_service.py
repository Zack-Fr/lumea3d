#!/usr/bin/env python3
"""
Test script for Hunyuan3D FastAPI service
"""

import requests
import json
import time
import subprocess
import sys
import os
from pathlib import Path

def test_service():
    """Test the Hunyuan3D service endpoints"""

    print("Testing Hunyuan3D FastAPI Service")
    print("=" * 40)

    # Start the service in background
    print("Starting service...")
    service_dir = Path(__file__).parent / "api"
    process = subprocess.Popen(
        [sys.executable, "main.py"],
        cwd=str(service_dir),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    # Wait for service to start
    print("Waiting for service to start...")
    time.sleep(15)  # Give it time to load models

    try:
        # Test health endpoint
        print("\n1. Testing health endpoint...")
        response = requests.get("http://localhost:8001/health", timeout=10)
        if response.status_code == 200:
            health_data = response.json()
            print("✓ Health check passed")
            print(f"  Status: {health_data.get('status')}")
            print(f"  Device: {health_data.get('device')}")
            print(f"  CUDA Available: {health_data.get('cuda_available')}")
        else:
            print(f"✗ Health check failed: {response.status_code}")
            return False

        # Test root endpoint
        print("\n2. Testing root endpoint...")
        response = requests.get("http://localhost:8001/", timeout=10)
        if response.status_code == 200:
            root_data = response.json()
            print("✓ Root endpoint working")
            print(f"  Service: {root_data.get('service')}")
            print(f"  Models loaded: {root_data.get('models_loaded')}")
        else:
            print(f"✗ Root endpoint failed: {response.status_code}")
            return False

        print("\n✓ All basic tests passed!")
        print("The Hunyuan3D service is working correctly.")
        return True

    except requests.exceptions.RequestException as e:
        print(f"✗ Request failed: {e}")
        return False
    except Exception as e:
        print(f"✗ Test failed: {e}")
        return False
    finally:
        # Clean up
        print("\nStopping service...")
        process.terminate()
        process.wait()

if __name__ == "__main__":
    success = test_service()
    sys.exit(0 if success else 1)