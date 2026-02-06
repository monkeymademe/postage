# Postage Social AI - Blog Content Generator

A web application that helps users write blog posts and automatically generate content length specific content for platforms like X, Facebook, LinkedIn, Instagram, and Email using local Ollama.

## Features

- User authentication (signup/login)
- Rich blog post editor
- Automatic content generation for multiple content profiles
- Editable generated content
- Copy-to-clipboard functionality
- Automatically adds UTM parameters to URL for tracking

## Tech Stack

- **Backend**: Node.js/Express
- **Frontend**: React with Vite
- **Database**: PostgreSQL
- **LLM**: Ollama (local instance)

## Setup

### Prerequisites

- Node.js (v18+)
- PostgreSQL
- Ollama running on accessible network

### Installation

1. Clone the repository
2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

4. Set up environment variables:
   - Copy `backend/.env.example` to `backend/.env` and fill in values
   - Copy `frontend/.env.example` to `frontend/.env` and fill in values

5. Run database migrations:
   ```bash
   cd backend
   npm run migrate
   ```

6. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

7. Start the frontend dev server:
   ```bash
   cd frontend
   npm run dev
   ```

## Environment Variables

### Backend (.env)
- `PORT=3001`
- `DATABASE_URL=postgresql://user:password@localhost:5432/postage`
- `JWT_SECRET=<your-secret-key>`
- `OLLAMA_URL=http://MAC_IP:11434`

### Frontend (.env)
- `VITE_API_URL=http://localhost:3001`

## Usage

1. Register a new account or login
2. Create a new blog post
3. Click "Generate Content" to create platform-specific versions
4. Edit the generated content as needed
5. Copy content to clipboard for each platform
