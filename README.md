# Channel Factory RFI Application

An AI-powered Q&A application that allows users to ask questions about Channel Factory and receive accurate answers based on provided documentation.

## Features

- AI-powered responses using OpenAI API
- User-friendly chat interface
- Response feedback system
- Conversation history
- Feedback statistics
- Document-based knowledge source
- Docker support for easy deployment

## Tech Stack

- **Frontend**: React, Vite
- **Backend**: Python, Flask
- **AI**: OpenAI API
- **Deployment**: Docker, Render.com

## Local Development

### Prerequisites

- Node.js (v16+)
- Python (v3.8+)
- Docker and Docker Compose (optional)

### Setup

1. Clone this repository
   ```bash
   git clone https://github.com/AIspowers/channel-factory-rfi.git
   cd channel-factory-rfi
   ```

2. Set up environment variables
   ```bash
   # Create a .env file in the root directory with your OpenAI API key
   echo "OPENAI_API_KEY=your_openai_api_key" > .env
   ```

3. Option 1: Run with Docker
   ```bash
   docker-compose up --build
   ```
   
4. Option 2: Run without Docker
   
   a. Start the backend
   ```bash
   pip install -r requirements.txt
   python responses_api.py
   ```
   
   b. Start the frontend (in a separate terminal)
   ```bash
   cd rfi-interface
   npm install
   npm run dev
   ```

5. Access the application
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8001

## Deployment

This application is designed to be deployed on Render.com with the following setup:

1. Connect your GitHub repository to Render.com
2. Set up a Web Service with the following settings:
   - Build Command: `npm install --prefix rfi-interface && npm run build --prefix rfi-interface && pip install -r requirements.txt`
   - Start Command: `gunicorn responses_api:app --bind 0.0.0.0:$PORT`
3. Add the environment variable `OPENAI_API_KEY` in the Render.com dashboard

## License

MIT 