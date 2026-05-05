# Dockerfile for the Wealthly backend (FastAPI + Postgres)
# Build: docker build -t wealthly-backend ./backend
# Run standalone: docker run -p 8000:8000 wealthly-backend

FROM python:3.12-slim

# System deps for psycopg2 and bcrypt
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (cached layer if requirements don't change)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY ./app ./app

# Run as non-root user for safety
RUN useradd --create-home --shell /bin/bash wealthly && chown -R wealthly:wealthly /app
USER wealthly

# Healthcheck used by docker-compose
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
