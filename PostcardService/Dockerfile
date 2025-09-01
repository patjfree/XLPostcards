FROM python:3.11-slim

WORKDIR /app

# Install system dependencies and fonts
RUN apt-get update && \
    apt-get install -y fonts-dejavu-core fonts-liberation && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["python", "main.py"]