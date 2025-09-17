#!/usr/bin/env python3
"""
Startup script for Hunyuan3D service
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def start_service():
    """Start the Hunyuan3D service"""
    print("Starting Hunyuan3D Generator Service...")
    print("=" * 50)

    # Change to the api directory
    api_dir = Path(__file__).parent / "api"
    os.chdir(api_dir)

    # Start the service
    try:
        cmd = [sys.executable, "main.py"]
        print(f"Running command: {' '.join(cmd)}")
        print(f"Working directory: {api_dir}")

        # Start the process
        process = subprocess.Popen(cmd, cwd=str(api_dir))

        print(f"Service started with PID: {process.pid}")
        print("Service should be available at: http://localhost:8001")
        print("Press Ctrl+C to stop the service")

        # Wait for the process
        process.wait()

    except KeyboardInterrupt:
        print("\nStopping service...")
        if 'process' in locals():
            process.terminate()
            process.wait()
        print("Service stopped")
    except Exception as e:
        print(f"Error starting service: {e}")
        return False

    return True

if __name__ == "__main__":
    start_service()