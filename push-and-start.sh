#!/bin/bash
echo "🔄 Checking and pushing database schema..."
npx prisma db push --schema=./database/schema.prisma --accept-data-loss
echo "🚀 Starting the Discord Bot..."
node index.js
