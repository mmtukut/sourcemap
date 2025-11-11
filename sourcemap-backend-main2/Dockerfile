FROM python:3.12-slim-bookworm

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies for Pillow and other potential needs
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    build-essential \
    libpq-dev \
    python3-dev \
    pkg-config \
    gcc \
    libcairo2-dev \
    libjpeg-dev \
    libtiff5-dev \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Collect static files (if you have any)
# RUN python manage.py collectstatic --noinput
