# Build stage
FROM node:alpine3.22 AS builder

WORKDIR /app

# Accept build arguments for environment variables
ARG VITE_API_ENV=prod
ARG VITE_POSTHOG_KEY="phc_bhHb3fJjR52we1wcI10jCRwTrhr6Iem6nfn5DfM9Iji"
ARG VITE_POSTHOG_HOST="https://us.i.posthog.com"

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Build the application with environment variables
RUN VITE_API_ENV=${VITE_API_ENV} \
    VITE_POSTHOG_KEY=${VITE_POSTHOG_KEY} \
    VITE_POSTHOG_HOST=${VITE_POSTHOG_HOST} \
    npm run build

# Production stage
FROM node:alpine3.22

WORKDIR /app

# Install serve globally for static file serving
RUN npm install -g serve

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Expose port 5173 (matches docker-compose mapping)
EXPOSE 5173

# Serve the static files with SPA fallback routing
# Use SERVER_PORT env var if set, otherwise default to 5173
CMD ["sh", "-c", "serve -s dist -l ${SERVER_PORT:-5173}"]

