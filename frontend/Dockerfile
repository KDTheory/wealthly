# Multi-stage build for the Wealthly frontend
# Stage 1: build the React app with Vite
# Stage 2: serve the static dist with nginx

# ----- Stage 1: build -----
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first (cached layer)
COPY package.json ./
RUN npm install --no-audit --no-fund

# Copy source and build
COPY . .

# Inject API URL at build time. Defaults to /api (proxied by nginx).
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ----- Stage 2: serve -----
FROM nginx:1.27-alpine

# Custom nginx config (proxy /api to backend, serve SPA fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static files
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
