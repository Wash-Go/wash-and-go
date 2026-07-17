# /backend/Dockerfile
FROM python:3.11-slim

# Prevent Python from buffering outputs
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /Wash-Go

# Install system dependencies for PostgreSQL
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && apt-get clean

# Install Python requirements
COPY requirements.txt /Wash-Go/backend
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . /Wash-Go/

EXPOSE 8000