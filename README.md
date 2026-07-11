# GrowEasy CRM - AI CSV Importer

An intelligent CRM Lead Import system built for GrowEasy. It allows users to upload unstructured CSV files (e.g., from Facebook Ads, Google Ads, arbitrary spreadsheets) and automatically extracts, maps, and standardizes lead information into the GrowEasy CRM format using AI.

## Architecture

The project consists of two main parts:
- **Frontend (Next.js)**: Modern, responsive UI for uploading, previewing, and viewing CRM leads.
- **Backend (Express + BullMQ + Gemini)**: Robust background processing and AI integration to intelligently parse and map CSV rows to the required CRM schema.

### Tech Stack

#### Frontend
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4, custom theme tokens (amber/purple aesthetic)
- **Components**: Shadcn UI / Base UI, Lucide React
- **CSV Parsing**: PapaParse (client-side preview)
- **Features**: Dark mode (`next-themes`), Drag-and-drop file upload, Responsive tables with sticky headers.

#### Backend
- **Framework**: Express.js (TypeScript)
- **Message Queue**: BullMQ (with Redis) for robust background job processing.
- **AI Integration**: `@google/genai` (Gemini 3.5 Flash) for intelligent column mapping and data extraction.
- **Features**: Batch processing of CSV records, AI schema alignment, error handling, robust parsing logic.



## Running Locally

### Prerequisites
- Node.js (v20+)
- Redis (running locally or via Docker on `localhost:6379`)
- Gemini API Key

### Backend Setup
1. Navigate to the `backend` directory.
2. Install dependencies: `yarn install`
3. Create a `.env` file with your credentials:
   ```env
   PORT=3001
   GEMINI_API_KEY=your_api_key_here
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   ```
4. Start the development server: `yarn run dev`

### Frontend Setup
1. Navigate to the `frontend` directory.
2. Install dependencies: `npm install`
3. Create a `.env` file pointing to the backend:
   ```env
   NEXT_PUBLIC_API=http://localhost:3001
   ```
4. Start the development server: `npm run dev`

### Docker (Optional Backend)
A `Dockerfile` is provided in the `backend` for containerization.
```bash
docker build -t groweasy-backend .
docker run -p 3001:3001 groweasy-backend
```

## Features Delivered
- ✅ **Drag & Drop Upload**: Seamless file picker and drag-and-drop CSV uploads.
- ✅ **CSV Preview**: Inspect rows client-side before committing to AI processing.
- ✅ **AI Processing & Extraction**: Maps ambiguous column names (e.g. "Phone", "Mobile No", "Contact") correctly.
- ✅ **Job Queuing & Progress**: Background processing using BullMQ with UI polling for status updates.
- ✅ **Beautiful UI & UX**: Custom amber/purple theme, responsive tables, empty states, and Dark Mode.
