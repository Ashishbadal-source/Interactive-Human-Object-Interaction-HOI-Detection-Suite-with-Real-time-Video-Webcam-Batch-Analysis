"""
Core configuration for MUREN AI backend.
"""
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings, loaded from environment or .env file."""

    APP_NAME: str = "MUREN AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Path to the MUREN project root (parent of backend/)
    PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent.parent.parent

    # Checkpoint path relative to project root
    CHECKPOINT_FILENAME: str = "pretrained/hico-best.pth"

    # Upload and results settings
    MAX_UPLOAD_SIZE_MB: int = 20
    MAX_VIDEO_UPLOAD_SIZE_MB: int = 200
    RESULTS_DIR_NAME: str = "results"
    UPLOAD_DIR_NAME: str = "uploads"
    VIDEO_RESULTS_DIR_NAME: str = "video_results"
    VIDEO_UPLOAD_DIR_NAME: str = "video_uploads"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Inference defaults
    DEFAULT_MIN_ACTION_SCORE: float = 0.20
    DEFAULT_MIN_OBJECT_SCORE: float = 0.50
    DEFAULT_MAX_INTERACTIONS: int = 5

    @property
    def checkpoint_path(self) -> Path:
        return self.PROJECT_ROOT / self.CHECKPOINT_FILENAME

    @property
    def results_dir(self) -> Path:
        return self.PROJECT_ROOT / "backend" / self.RESULTS_DIR_NAME

    @property
    def upload_dir(self) -> Path:
        return self.PROJECT_ROOT / "backend" / self.UPLOAD_DIR_NAME

    @property
    def video_results_dir(self) -> Path:
        return self.PROJECT_ROOT / "backend" / self.VIDEO_RESULTS_DIR_NAME

    @property
    def video_upload_dir(self) -> Path:
        return self.PROJECT_ROOT / "backend" / self.VIDEO_UPLOAD_DIR_NAME

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
