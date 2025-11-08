# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/remix-run/react-router-templates/tree/main/default)

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

## Langfuse tracing

Tracing for the chat API is wired up through Langfuse and OpenTelemetry.

1. Set `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and `LANGFUSE_BASEURL` (plus optional `LANGFUSE_SERVICE_NAME`) in `.env`. Without these values the instrumentation remains dormant.
2. The bootstrap file at `app/lib/langfuse.server.ts` registers a `NodeTracerProvider` together with the Langfuse span processor so traces from every server render and tool call are exported automatically.
3. The server action inside `app/routes/api.ts` is wrapped with `@langfuse/tracing`'s `observe` helper. It captures each user prompt, the streamed assistant response, tool usage, and error cases while propagating metadata such as the chosen model and web search preference.
4. When running in short-lived environments, the stream finalizers flush any buffered spans to Langfuse before closing the HTTP response to avoid losing telemetry.

---

Built with ❤️ using React Router.
