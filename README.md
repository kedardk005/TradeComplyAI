# TradeComplyAI

TradeComplyAI is an AI-powered export compliance platform designed specifically for Indian MSME exporters navigating the India-to-US trade corridor. The platform automates product classification (HS Codes/ECCNs), generates compliance checklists, draft trade documentation, and validates transactions against regulatory controls to streamline operations and mitigate risks.

## Repository Structure

The project is structured as a monorepo containing the following components:

- **`/frontend`**: React client application built with Vite, TypeScript, Tailwind CSS, and React Router.
- **`/backend`**: Express server built with Node.js and TypeScript, using Prisma ORM to interact with a Neon PostgreSQL cloud database.
- **`/ai-service`**: Python microservice built with FastAPI to handle LLM interactions, embedding creation, and custom compliance agents.
- **`/docs`**: Project documentation, notes, and PRDs.

---

## Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher recommended)
- **Python** (v3.10 or higher recommended)
- **pip** (Python package installer)

---

### Running the Services Locally

#### 1. Frontend Client
Navigate to the frontend directory, install dependencies, and start the Vite dev server:
```bash
cd frontend
npm install
npm run dev
```
By default, the frontend will be available at `http://localhost:5173`.

#### 2. Backend Server
Navigate to the backend directory, install dependencies, initialize database clients, and start the development server with hot-reloading:
```bash
cd backend
npm install
npx prisma generate
npm run dev
```
By default, the backend will run at `http://localhost:5000`.

#### 3. AI Service
Navigate to the AI service directory, set up your Python environment, install requirements, and run the FastAPI app:
```bash
cd ai-service
# (Optional) Create and activate a virtual environment
python -m venv venv
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```
By default, the AI service will run at `http://localhost:8000`.
