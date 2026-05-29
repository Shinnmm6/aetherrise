# Use the official Node.js image
FROM node:22

# Install dependencies needed by 'canvas' and Prisma
# These are the system libraries required by the canvas package
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory inside the container
WORKDIR /app

# Copy package files first (to optimize build cache)
COPY package*.json ./

# Copy the prisma folder to the container
COPY prisma ./prisma/

# Install npm dependencies
RUN npm install

# Generate the Prisma Client
RUN npx prisma generate

# Copy the rest of your app code
COPY . .

# Start the bot
# Make sure index.js is the correct entry point file for your project
CMD ["node", "index.js"]
