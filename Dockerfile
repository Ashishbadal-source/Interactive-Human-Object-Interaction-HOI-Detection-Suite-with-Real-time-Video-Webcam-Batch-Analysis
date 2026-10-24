# Stage 1: Build React Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend & Model Server
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PORT=7860

WORKDIR /app

# Install system dependencies for OpenCV and video/image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU directly
RUN pip install --no-cache-dir torch==2.1.2+cpu torchvision==0.16.2+cpu --extra-index-url https://download.pytorch.org/whl/cpu

# Install backend python dependencies
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy source code and models
COPY models /app/models
COPY util /app/util
COPY datasets /app/datasets
COPY pretrained /app/pretrained
COPY backend /app/backend

# Copy built frontend assets from stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Create necessary upload/result directories and set write permissions
RUN mkdir -p /app/backend/uploads /app/backend/results /app/backend/video_uploads /app/backend/video_results \
    && chmod -R 777 /app/backend

# Hugging Face Spaces standard non-root user (UID 1000)
RUN useradd -m -u 1000 user || true
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

EXPOSE 7860

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "7860"]
