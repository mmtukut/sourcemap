# Use official Python image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt --no-cache-dir

# Copy the Django project
COPY . .

EXPOSE 9000


EXPOSE 9000


CMD ["sh", "-c", "gunicorn sourcemap_project.wsgi:application --bind 0.0.0.0:9000 --workers 2 --timeout 120 --keep-alive 5 --max-requests 1000 --max-requests-jitter 100"]
