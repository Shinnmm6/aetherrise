# Use the official Node.js image
FROM node:22

# Install dependencies needed by 'canvas' and Prisma
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# --- ADD THIS LINE ---
# This generates the Prisma Client
RUN npx prisma generate

# Copy the rest of your app code
COPY . .

# Start the bot
CMD ["node", "index.js"]
