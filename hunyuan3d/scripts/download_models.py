#!/usr/bin/env python3

import os
from huggingface_hub import snapshot_download

# Download Hunyuan3D models
repo_id = "Tencent/Hunyuan3D-2"
local_dir = "models/hunyuan3d"

print(f"Downloading models from {repo_id} to {local_dir}...")

# Set environment variable for longer timeout
os.environ['HF_HUB_TIMEOUT'] = '300'  # 5 minutes timeout

# Download the entire repo with force download to handle network issues
snapshot_download(
    repo_id=repo_id,
    local_dir=local_dir,
    local_dir_use_symlinks=False,
    force_download=True
)

print("Download complete!")