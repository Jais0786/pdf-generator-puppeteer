# Use official Node LTS image with Debian base
FROM node:22-bullseye

# Install dependencies required for Chromium
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libxcb1 \
    libx11-6 \
    libxss1 \
    libasound2 \
    wget \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files first for caching
COPY package.json package-lock.json* ./

# Install deps (puppeteer will download chromium)
RUN npm ci --only=production

# Copy app
COPY . .

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
