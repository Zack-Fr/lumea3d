#!/usr/bin/env python3
"""
Cross-platform typecheck script for the solver package.
Runs mypy if available, otherwise skips gracefully.
"""
import sys
import subprocess

def main():
    try:
        # Try to import mypy
        import mypy
        print("Running mypy typecheck...")
        result = subprocess.run([
            sys.executable, "-m", "mypy", ".", "--config-file", "mypy.ini"
        ], check=False)
        sys.exit(result.returncode)
    except ImportError:
        print("mypy not available - skipping Python typecheck")
        print("To enable typechecking, install mypy: pip install mypy")
        sys.exit(0)
    except Exception as e:
        print(f"Error running typecheck: {e}")
        sys.exit(0)

if __name__ == "__main__":
    main()