# Production Dockerfile for QFlow Full-Stack System
FROM node:22-alpine

WORKDIR /app

# Install build tools if needed
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install all dependencies
RUN npm run install:all

# Copy all source files
COPY . .

# Generate Prisma client and build frontend and backend
RUN cd backend && npx prisma generate
RUN npm run build

# Seed default database
RUN npm run seed

# Expose unified application port
EXPOSE 5001

ENV PORT=5001
ENV NODE_ENV=production

# Start unified server
CMD ["node", "backend/dist/server.js"]

