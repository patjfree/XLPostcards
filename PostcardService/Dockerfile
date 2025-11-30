FROM python:3.11-slim

WORKDIR /app

# Install system dependencies and fonts
RUN apt-get update && \
    apt-get install -y fonts-dejavu-core fonts-liberation && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Debug: Test imports to catch failures early
RUN python -c "import main; print('Main import successful')"

EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --log-level info"]