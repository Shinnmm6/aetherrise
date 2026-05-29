FROM node:22

# Install dependencies for canvas and Prisma
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy everything (this includes your database/ folder)
COPY . .

# Install dependencies
RUN npm install

# Generate Prisma Client pointing to your specific schema file
RUN npx prisma generate --schema=./database/schema.prisma

# Start the bot
CMD ["node", "index.js"]
