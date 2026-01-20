FROM node:20-bullseye

# Install LibreOffice for DOCX->PDF fallback + Playwright/Chromium system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    # LibreOffice packages
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-common \
    libreoffice-core \
    # Fonts
    fonts-dejavu \
    fonts-liberation \
    fonts-freefont-ttf \
    fontconfig \
    # Utilities
    procps \
    # Chromium/Playwright dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxext6 \
    libxi6 \
    libxtst6 \
  && rm -rf /var/lib/apt/lists/* \
  && fc-cache -f -v

# Create a dedicated user for running the app (avoids permission issues)
RUN useradd -m -s /bin/bash appuser \
  && mkdir -p /home/appuser/.config/libreoffice \
  && mkdir -p /home/appuser/.cache/ms-playwright \
  && chown -R appuser:appuser /home/appuser

# Pre-initialize LibreOffice profile to speed up first conversion
RUN su - appuser -c "soffice --headless --terminate_after_init" || true

# Create temp directories
RUN mkdir -p /tmp/libreoffice-convert \
  && chmod 1777 /tmp/libreoffice-convert

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Set Playwright browser path before installing browsers
ENV PLAYWRIGHT_BROWSERS_PATH=/home/appuser/.cache/ms-playwright

# Install Playwright Chromium browser (as root, then fix permissions)
RUN npx playwright install chromium \
  && chown -R appuser:appuser /home/appuser/.cache/ms-playwright

# Copy application code
COPY . .

# Ensure storage directories exist with proper permissions
RUN mkdir -p /app/storage/outputs /app/storage/temp \
  && chown -R appuser:appuser /app

# Environment variables for LibreOffice
ENV NODE_ENV=production
ENV LIBREOFFICE_PATH=/usr/bin/soffice
ENV LIBREOFFICE_TIMEOUT=30000
ENV LIBREOFFICE_TEMP_DIR=/tmp/libreoffice-convert
ENV HOME=/home/appuser

# PDF render defaults
ENV PDF_RENDER_TIMEOUT=60000
ENV PDF_RENDER_FORMAT=A4
ENV PDF_RENDER_MARGIN_MM=20

EXPOSE 3000

# Run as appuser for security
USER appuser

CMD ["node", "server.js"]
