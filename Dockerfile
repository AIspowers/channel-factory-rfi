FROM node:18 AS frontend-builder

WORKDIR /app/frontend
COPY rfi-interface/package*.json ./
RUN npm install
COPY rfi-interface/ ./
RUN npm run build

FROM python:3.10-slim

WORKDIR /app

# Install required system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install backend requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY responses_api.py .
COPY rfi-docs ./rfi-docs

# Copy frontend build from the frontend-builder stage
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Setup environment variables
ENV PORT=8001
ENV OPENAI_API_KEY="YOUR_OPENAI_API_KEY"

# Expose the port the app runs on
EXPOSE 8001

# Start command
CMD ["python", "responses_api.py"] 