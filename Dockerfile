FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate --schema=./database/schema.prisma

# Expose the mandatory Hugging Face port to clear the app file error
EXPOSE 7860

CMD ["npm", "start"]
