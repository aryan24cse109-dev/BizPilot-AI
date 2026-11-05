# BizPilot AI – AI Service

The AI Service is a dedicated Node.js application responsible for understanding natural-language business requests and converting them into structured, validated workflow instructions.

## Technology Stack

- Node.js
- Express.js
- JavaScript ES Modules
- Sarvam AI (Primary Provider)
- Groq (Fallback Provider)
- Zod
- PostgreSQL is accessed only through the Backend, not this service.

## AI Providers

- Primary: Sarvam AI
- Fallback: Groq

## Architecture

The AI Service communicates with the Backend through authenticated server-to-server requests.

It does not directly access the database, execute Prisma queries, or modify payment records.

The Backend remains responsible for authentication, authorization, workflow execution, and database operations.

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Environment Variables

See `.env.example` for the required configuration.

Never commit actual API keys or secrets.

## Development

```bash
npm run dev
npm start
npm test
```

## Project Status

Stage 0 – Project Setup.
