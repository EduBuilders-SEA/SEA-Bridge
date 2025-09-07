""
Initialize the application with all necessary setup steps.
"""
import logging
import os
import subprocess
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_command(cmd: str, cwd: str = None) -> bool:
    """Run a shell command and return True if successful."""
    try:
        logger.info(f"Running: {cmd}")
        result = subprocess.run(cmd, shell=True, check=True, cwd=cwd, 
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                              text=True)
        logger.debug(f"Output: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Command failed with error: {e.stderr}")
        return False

def setup_environment():
    """Set up the environment variables."""
    env_file = ".env"
    if not os.path.exists(env_file):
        logger.info("Creating .env file from template...")
        if os.path.exists(".env.template"):
            with open(".env.template", "r") as src, open(env_file, "w") as dst:
                dst.write(src.read())
            logger.info("Please update the .env file with your configuration")
        else:
            logger.error("No .env.template file found!")
            return False
    return True

def install_dependencies():
    """Install Python dependencies."""
    logger.info("Installing Python dependencies...")
    return run_command("pip install -r requirements.txt")

def setup_database():
    """Set up the database."""
    logger.info("Setting up database...")
    return run_command("python -m scripts.init_db")

def setup_aws_resources():
    """Set up AWS resources for local development."""
    logger.info("Setting up AWS resources...")
    return run_command("python -m scripts.setup_aws_local")

def main():
    """Main function to run all setup steps."""
    try:
        # Change to project root directory
        project_root = Path(__file__).parent.parent
        os.chdir(project_root)
        
        logger.info("Starting application setup...")
        
        # Run setup steps
        if not setup_environment():
            return 1
            
        if not install_dependencies():
            return 1
            
        if not setup_database():
            return 1
            
        if not setup_aws_resources():
            logger.warning("AWS resource setup failed - continuing with setup")
        
        logger.info("\nSetup completed successfully!")
        logger.info("You can now start the application with:\n")
        logger.info("  uvicorn src.main:app --reload\n")
        return 0
        
    except Exception as e:
        logger.error(f"Setup failed: {str(e)}")
        return 1

if __name__ == "__main__":
    exit(main())
