# Hunyuan3D Generator API Service

A FastAPI service for generating 3D shapes using Hunyuan3D with text-to-image conditioning.

## Features

- **Text-to-3D Generation**: Convert text prompts to 3D shapes using Hunyuan3D
- **JWT Authentication**: Secure API access with JWT tokens
- **Background Processing**: Asynchronous job processing for long-running generations
- **Real-time Updates**: Server-Sent Events (SSE) for job status streaming
- **File Downloads**: Direct download of generated GLB files
- **GPU Acceleration**: CUDA support for faster generation

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements-hunyuan.txt
```

### 2. Configure Environment

Copy `.env` and update the JWT secret:

```bash
cp .env .env.local
# Edit .env.local with your JWT secret
```

### 3. Run the Service

```bash
cd api
python main.py
```

The service will start on `http://localhost:8001`

## API Endpoints

### Authentication

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Endpoints

- `GET /` - Service information
- `GET /health` - Health check
- `POST /generate` - Start 3D generation job
- `GET /job/{job_id}` - Get job status
- `GET /jobs` - List user jobs
- `DELETE /job/{job_id}` - Cancel job
- `GET /download/{job_id}` - Download generated GLB file
- `GET /stream/{job_id}` - Stream job status updates (SSE)

### Example Usage

```python
import requests

# Generate a 3D shape
response = requests.post(
    "http://localhost:8001/generate",
    json={"prompt": "a modern chair", "seed": 42},
    headers={"Authorization": "Bearer your-jwt-token"}
)

job_id = response.json()["job_id"]

# Check status
status = requests.get(
    f"http://localhost:8001/job/{job_id}",
    headers={"Authorization": "Bearer your-jwt-token"}
)

# Download result when complete
if status.json()["status"] == "completed":
    with requests.get(
        f"http://localhost:8001/download/{job_id}",
        headers={"Authorization": "Bearer your-jwt-token"},
        stream=True
    ) as r:
        with open("generated_shape.glb", "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
```

## Architecture

```
Text Prompt → Stable Diffusion → Image → Hunyuan3D → 3D Mesh → GLB File
```

The service uses a two-stage pipeline:
1. **Text-to-Image**: Stable Diffusion converts text to conditioning image
2. **Image-to-3D**: Hunyuan3D generates 3D mesh from the conditioning image

## Configuration

Environment variables:

- `JWT_SECRET`: Secret key for JWT token signing
- `PORT`: Service port (default: 8001)
- `MODEL_CACHE_DIR`: Directory for model caching
- `LOG_LEVEL`: Logging level

## Development

### Project Structure

```
hunyuan3d/
├── api/
│   └── main.py          # FastAPI service
├── scripts/
│   └── baseline_inference.py  # Core inference logic
├── models/              # Model cache directory
├── outputs/             # Generated files
├── requirements-hunyuan.txt
├── .env                 # Environment configuration
└── README.md
```

### Testing

Run the baseline inference script directly:

```bash
cd scripts
python baseline_inference.py
```

## Production Deployment

For production deployment:

1. Use a production WSGI server (gunicorn + uvicorn workers)
2. Set strong JWT secrets
3. Configure proper CORS origins
4. Add rate limiting
5. Use external storage (MinIO/S3) for generated files
6. Add monitoring and logging

## Troubleshooting

### Common Issues

1. **CUDA out of memory**: Reduce batch size or use smaller models
2. **Model download fails**: Check internet connection and HuggingFace access
3. **JWT token errors**: Verify token format and expiration
4. **File not found**: Ensure model files are properly downloaded

### Logs

Check the service logs for detailed error information:

```bash
tail -f logs/service.log
```