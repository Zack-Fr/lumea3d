#!/usr/bin/env python3
"""
Hunyuan3D Baseline Inference Script
Generates 3D shapes using the Hunyuan3D DiT model with text-to-image conditioning
"""

import os
import sys
import torch
import numpy as np
import time
from pathlib import Path
import logging
from typing import Optional, Dict, Any
from PIL import Image

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Hunyuan3DInference:
    """Baseline inference class for Hunyuan3D models with text-to-image conditioning"""

    def __init__(self, model_dir: str = None):
        if model_dir is None:
            # Default to absolute path from project root
            model_dir = Path(__file__).parent.parent.parent / "models" / "hunyuan3d"
        
        self.model_dir = Path(model_dir)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {self.device}")

        # Model paths
        self.dit_model_path = self.model_dir / "hunyuan3d-dit-v2-0"
        self.vae_model_path = self.model_dir / "hunyuan3d-vae-v2-0"

        # Text-to-image pipeline for conditioning
        self.text_to_image_pipeline = None

    def load_text_to_image_model(self):
        """Load a lightweight text-to-image model for conditioning"""
        try:
            logger.info("Loading text-to-image model for conditioning...")
            
            from diffusers import StableDiffusionPipeline
            import torch
            
            # Use a lightweight SD model
            model_id = "runwayml/stable-diffusion-v1-5"
            
            self.text_to_image_pipeline = StableDiffusionPipeline.from_pretrained(
                model_id,
                torch_dtype=torch.float16 if self.device.type == "cuda" else torch.float32,
                cache_dir=str(self.model_dir.parent)
            )
            
            if self.device.type == "cuda":
                self.text_to_image_pipeline = self.text_to_image_pipeline.to(self.device)
            
            # Enable memory efficient attention
            self.text_to_image_pipeline.enable_attention_slicing()
            
            logger.info("Text-to-image model loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load text-to-image model: {e}")
            return False

    def generate_conditioning_image(self, prompt: str, seed: Optional[int] = None) -> Optional[Image.Image]:
        """Generate an image from text prompt for conditioning"""
        try:
            if self.text_to_image_pipeline is None:
                if not self.load_text_to_image_model():
                    return None
            
            logger.info(f"Generating conditioning image for prompt: {prompt}")
            
            # Set seed for reproducibility
            generator = None
            if seed is not None:
                generator = torch.Generator(device=self.device).manual_seed(seed)
            
            # Generate image
            with torch.autocast(device_type=self.device.type):
                image = self.text_to_image_pipeline(
                    prompt,
                    num_inference_steps=20,  # Faster for conditioning
                    guidance_scale=7.5,
                    generator=generator,
                    height=512,
                    width=512
                ).images[0]
            
            logger.info("Conditioning image generated successfully")
            return image
            
        except Exception as e:
            logger.error(f"Failed to generate conditioning image: {e}")
            return None
        """Verify that required model files exist"""
        required_files = [
            self.dit_model_path / "model.fp16.safetensors",
            self.vae_model_path / "model.fp16.safetensors"
        ]

        for file_path in required_files:
            if not file_path.exists():
                raise FileNotFoundError(f"Required model file not found: {file_path}")

        logger.info("All required model files found")

    def load_models(self):
        """Load the DiT and VAE models"""
        try:
            logger.info("Loading Hunyuan3D models...")

            # Import here to avoid import errors if packages not installed
            from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline
            # Strategy:
            # 1. Prefer local directory if full weights already present (avoid re-download)
            # 2. Fallback to HuggingFace repo id (will download / use cache)
            # NOTE: On Windows, backslashes can cause the HF hub validator to treat a path as repo id.
            # Use POSIX form of the local path.

            local_path = self.dit_model_path
            local_posix = local_path.as_posix()

            # Heuristic: consider local usable if required weight file exists and has correct size
            local_weight = local_path / "model.fp16.safetensors"
            expected_size = 4.93 * (1024**3)  # 4.93 GB in bytes
            tried = []
            pipeline = None

            if local_weight.exists() and local_weight.stat().st_size >= expected_size * 0.95:  # Allow 5% tolerance
                logger.info(f"Attempting to load local model at: {local_posix} (size: {local_weight.stat().st_size / (1024**3):.2f} GB)")
                try:
                    pipeline = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(local_posix)
                    logger.info("Loaded model from local path successfully")
                except Exception as lp_err:
                    tried.append(f"local:{lp_err}")
                    logger.warning(f"Local load failed, will fallback. Reason: {lp_err}")
            else:
                if local_weight.exists():
                    actual_size = local_weight.stat().st_size / (1024**3)
                    logger.warning(f"Local file exists but size {actual_size:.2f} GB is less than expected {expected_size / (1024**3):.2f} GB")
                else:
                    logger.info(f"Local weight not found at {local_weight}; skipping direct local load")

            if pipeline is None:
                repo_id = "tencent/Hunyuan3D-2"
                logger.info(f"Falling back to HuggingFace repo id: {repo_id}")
                try:
                    # Force ignore local cache to ensure fresh download
                    import os
                    os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'

                    pipeline = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(
                        repo_id,
                        cache_dir=str(self.model_dir.parent),  # Use our models directory as cache
                        local_files_only=False,  # Allow download
                        force_download=False  # But don't force re-download if complete
                    )
                    logger.info("Loaded model from HuggingFace (cache or freshly downloaded)")
                except Exception as hf_err:
                    tried.append(f"remote:{hf_err}")
                    raise RuntimeError(f"Failed all load attempts. Attempts: {tried}") from hf_err

            logger.info(f"Pipeline created: {type(pipeline)}")

            # Move to GPU if available
            logger.info(f"Moving pipeline to device: {self.device}")
            try:
                moved_pipeline = pipeline.to(self.device)
                if moved_pipeline is not None:
                    self.pipeline = moved_pipeline
                    logger.info("Pipeline successfully moved to device")
                else:
                    logger.warning(".to() returned None, using original pipeline")
                    self.pipeline = pipeline
            except Exception as device_error:
                logger.warning(f"Failed to move pipeline to device: {device_error}")
                logger.warning("Using pipeline on original device")
                self.pipeline = pipeline

            logger.info(f"Final pipeline type: {type(self.pipeline)}")
            logger.info("Models loaded successfully")
            return True

        except ImportError as e:
            logger.error(f"Import error: {e}")
            logger.error("Make sure hy3dgen is installed")
            return False
        except Exception as e:
            logger.error(f"Failed to load models: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return False

    def generate_shape(self, prompt: str, seed: Optional[int] = None) -> Dict[str, Any]:
        """
        Generate a 3D shape from text prompt using image conditioning

        Args:
            prompt: Text description of the shape to generate
            seed: Random seed for reproducible generation

        Returns:
            Dictionary containing generation results
        """
        try:
            logger.info(f"Generating shape for prompt: {prompt}")

            # Set seed for reproducibility
            if seed is not None:
                torch.manual_seed(seed)
                np.random.seed(seed)

            # Time the generation
            start_time = time.time()

            # Check if pipeline is loaded
            if not hasattr(self, 'pipeline') or self.pipeline is None:
                raise ValueError("Pipeline not loaded. Call load_models() first.")

            # Generate conditioning image from text prompt
            logger.info("Generating conditioning image...")
            conditioning_image = self.generate_conditioning_image(prompt, seed)
            
            if conditioning_image is None:
                raise ValueError("Failed to generate conditioning image")

            # Generate mesh using the pipeline with image conditioning
            logger.info("Calling Hunyuan3D pipeline for generation...")
            result = self.pipeline(conditioning_image)

            # Handle different return types
            if isinstance(result, list) and len(result) > 0:
                mesh = result[0]
            elif hasattr(result, 'vertices'):  # Direct mesh object
                mesh = result
            else:
                raise ValueError(f"Unexpected pipeline output type: {type(result)}")

            generation_time = time.time() - start_time

            result = {
                "success": True,
                "prompt": prompt,
                "seed": seed,
                "mesh": mesh,  # The actual trimesh object
                "vertices": len(mesh.vertices),
                "faces": len(mesh.faces),
                "generation_time": generation_time,
                "model_used": "hunyuan3d-dit-v2-0",
                "conditioning_image": conditioning_image
            }

            logger.info(f"Shape generation completed: {result['vertices']} vertices, {result['faces']} faces in {generation_time:.2f}s")
            return result

        except Exception as e:
            logger.error(f"Shape generation failed: {e}")
            logger.error(f"Error type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                "success": False,
                "error": str(e),
                "prompt": prompt
            }

def main():
    """Main function for testing baseline inference"""
    print("Hunyuan3D Baseline Inference Test")
    print("=" * 40)

    # Create outputs directory
    output_dir = Path(__file__).parent / "outputs"
    output_dir.mkdir(exist_ok=True)

    # Initialize inference
    try:
        inference = Hunyuan3DInference()
        print("✓ Inference class initialized")

        # Load models
        if inference.load_models():
            print("✓ Models loaded successfully")
            print(f"  Pipeline loaded: {hasattr(inference, 'pipeline') and inference.pipeline is not None}")
            
            # Additional check for pipeline
            if hasattr(inference, 'pipeline') and inference.pipeline is not None:
                print(f"  Pipeline type: {type(inference.pipeline)}")
            else:
                print("✗ Pipeline not properly initialized")
                return 1

            # Load text-to-image model for conditioning
            if inference.load_text_to_image_model():
                print("✓ Text-to-image model loaded successfully")
            else:
                print("✗ Failed to load text-to-image model")
                return 1

            # Test generation with multiple prompts
            test_prompts = [
                "a modern lounge chair",
                "a wooden dining table", 
                "a minimalist desk lamp"
            ]

            for i, prompt in enumerate(test_prompts):
                print(f"\nGenerating shape {i+1}/{len(test_prompts)}: '{prompt}'")
                result = inference.generate_shape(prompt, seed=42 + i)

                if result["success"]:
                    print("✓ Shape generation successful")
                    print(f"  Vertices: {result['vertices']}")
                    print(f"  Faces: {result['faces']}")
                    print(f"  Generation time: {result['generation_time']:.2f}s")

                    # Save mesh as GLB
                    safe_prompt = prompt.replace(" ", "_").replace(",", "")
                    output_file = output_dir / f"shape_{i+1}_{safe_prompt}.glb"
                    result["mesh"].export(str(output_file))
                    print(f"  Saved to: {output_file}")

                else:
                    print("✗ Shape generation failed")
                    print(f"  Error: {result.get('error', 'Unknown error')}")

        else:
            print("✗ Failed to load models")

    except Exception as e:
        print(f"✗ Error during inference test: {e}")
        return 1

    print("\nBaseline inference test completed!")
    print(f"Generated shapes saved to: {output_dir}")
    return 0

if __name__ == "__main__":
    sys.exit(main())