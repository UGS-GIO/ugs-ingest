# Build stage
FROM node:18.20.2-alpine as builder

WORKDIR /app
COPY package*.json ./
# Install ALL dependencies (including devDependencies) for build
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:18.20.2-alpine

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built assets and server
COPY --from=builder /app/dist ./dist
COPY server ./server

EXPOSE 8080

# Use the start script which runs the Express server
CMD ["npm", "start"]