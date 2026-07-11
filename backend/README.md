# GrowEasy CRM Backend

This is the backend service for the GrowEasy CRM CSV Importer. It provides APIs to handle file uploads, process CSVs asynchronously in the background using BullMQ, and extract relevant CRM fields using Google's Gemini AI.

## Features
- **CSV Upload API:** Endpoint to accept bulk CSV uploads.
- **AI-Powered Extraction:** Uses Gemini API to intelligently map arbitrary CSV columns to structured CRM fields.
- **Background Processing:** Uses BullMQ and Redis to handle batch AI processing asynchronously to prevent timeout errors.

## Prerequisites

- Node.js (v18 or higher recommended)
- Redis server running locally or remotely
- Google Gemini API Key

## Environment Setup

Create a `.env` file in the root of the backend directory with the following variables:

```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_USERNAME=
```

## Installation

1. Install dependencies:
   ```bash
   yarn install
   # or
   npm install
   ```

2. Start the Redis server (if not already running).

3. Run the development server:
   ```bash
   yarn run dev
   # or
   npm run dev
   ```

## API Endpoints

### `POST /bulk-upload`
Upload a CSV file to be processed.
- **Form Data:**
  - `file`: The CSV file

### `GET /bulk-upload`
Returns the status and results of all processing jobs.

### `GET /`
Returns all successfully imported and parsed CRM records.

## Architecture & Code Quality
- Clean architecture with `Controller`, `Service`, and `Repository` (via Redis/BullMQ) layers.
- Uses `csv-parse` for robust parsing of diverse CSV structures.
- Strict type safety with TypeScript interfaces.
