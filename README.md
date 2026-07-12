# AI Code Review Assistant

## About This Project
AI Code Review Assistant is an intelligent, automated platform designed to help developers and teams improve their code quality seamlessly. By leveraging advanced Generative AI (like Google Gemini and OpenAI), the application analyzes source code from uploaded zip archives or public Git repositories to identify bugs, security vulnerabilities, performance bottlenecks, and maintainability issues. It provides a comprehensive dashboard and detailed reports complete with an overall score, specific metrics, and line-by-line actionable suggestions for code improvements.

## Existing System
In traditional software development lifecycles, code reviews are a primarily manual process. This involves developers reading through their peers' code to spot logical errors, style guide violations, and security flaws. 

**Drawbacks of the Existing System:**
- **Time-Consuming:** Manual inspection of large codebases takes significant time and creates bottlenecks in the delivery pipeline.
- **Subjectivity & Inconsistency:** Reviews can vary greatly depending on the reviewer's personal experience, expertise, and current workload.
- **Human Error:** Subtle bugs, complex edge cases, and deep security vulnerabilities are frequently overlooked by human eyes.
- **Scalability Issues:** As project sizes grow and team velocity increases, it becomes extremely difficult to maintain consistent and thorough code review standards.

## Objective
The primary objective of the AI Code Review Assistant is to automate, standardize, and accelerate the code review process. 
- **Instant Analysis:** Provide rapid, automated feedback on code to speed up the development cycle.
- **Enhanced Accuracy:** Utilize Large Language Models (LLMs) to reliably catch hidden security vulnerabilities and complex logic errors.
- **Boost Developer Productivity:** Free up developers' time from mundane syntax and standard checks, allowing them to focus on architectural decisions and feature development.
- **Actionable Insights:** Generate detailed, easy-to-read reports that pinpoint the exact file paths and line numbers of issues, complete with suggested code snippets for quick resolution.

## Key Features
- **Automated Code Analysis:** Deep semantic scanning of code repositories using advanced AI models.
- **Multiple Input Methods:** Support for seamlessly cloning public Git repositories or uploading local code via ZIP files.
- **Comprehensive Dashboard:** An intuitive UI to track total projects, view audit history, and monitor average code quality scores over time.
- **Detailed Reporting:** Generates severity-based issue tracking categorized by Security, Performance, Quality, and Maintainability.
- **User Authentication:** Secure user registration and login system (JWT) to keep project data private and organized.

## Technology Stack
- **Frontend:** Next.js (React), Tailwind CSS, Lucide React, Zustand, Axios, Radix UI
- **Backend:** Python, FastAPI, Motor (Async MongoDB client), Beanie (ODM), PyJWT, Uvicorn
- **Database:** MongoDB (Atlas / Local)
- **AI Integration:** Google Generative AI (Gemini) / OpenAI APIs

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- MongoDB instance (Local or Atlas)
- Git (for repository cloning)

### Backend Setup
1. Navigate to the `backend` directory: 
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies: 
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend` directory with the required environment variables:
   ```env
   MONGO_URI=your_mongodb_connection_string
   DATABASE_NAME=ai_code_review
   SECRET_KEY=your_jwt_secret_key
   OPENAI_API_KEY=your_openai_api_key
   GEMINI_API_KEY=your_gemini_api_key
   ```
5. Run the FastAPI development server: 
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

### Frontend Setup
1. Navigate to the `frontend` directory: 
   ```bash
   cd frontend
   ```
2. Install dependencies: 
   ```bash
   npm install
   ```
3. (Optional) Configure environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```
4. Start the Next.js development server: 
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## 🚀 Deployment Guide

### Deploying the Frontend (Vercel)
Vercel is the optimal platform for deploying Next.js applications. 

1. Push your code to GitHub.
2. Log in to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your GitHub repository.
4. **CRITICAL:** In the "Configure Project" screen, change the **Root Directory** from `./` to `frontend`.
5. In the **Environment Variables** section, add your production backend URL:
   - `NEXT_PUBLIC_API_URL` = `https://your-deployed-backend-url.com/api/v1`
6. Click **Deploy**. Vercel will automatically detect Next.js and build the frontend.

### Deploying the Backend (Render / Railway)
*Note: We do not recommend deploying the FastAPI backend on Vercel because AI code generation can easily exceed Vercel's 10-15 second Serverless timeout limit.*

1. Create a Web Service on a platform like [Render](https://render.com) or [Railway](https://railway.app).
2. Connect your GitHub repository.
3. Set the Root Directory to `backend` (if supported) OR configure the Build/Start commands:
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT` (Make sure your paths align with the working directory)
4. Add all required Environment Variables (`MONGO_URI`, `OPENAI_API_KEY`, etc.) in the dashboard.
5. Deploy and grab the resulting URL to use as your `NEXT_PUBLIC_API_URL` in Vercel.

