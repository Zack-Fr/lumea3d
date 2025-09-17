#!/usr/bin/env python3
"""
Hunyuan3D Generator Service Startup Script
This script starts the FastAPI service and keeps it running persistently.
"""

import uvicorn
import logging
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def main():
    """Main function to start the service"""
    try:
        print("🚀 Starting Hunyuan3D Generator Service...")
        print("📍 Service will be available at: http://localhost:8001")
        print("📍 API documentation at: http://localhost:8001/docs")
        print("🔄 Press Ctrl+C to stop the service")

        # Import the FastAPI app
        from main import app

        # Start the server
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8001,
            log_level="info",
            reload=False,  # Disable reload in production
            access_log=True
        )

    except KeyboardInterrupt:
        print("\n🛑 Service stopped by user")
    except Exception as e:
        print(f"❌ Error starting service: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()