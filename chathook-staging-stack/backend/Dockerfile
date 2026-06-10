FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY prisma ./prisma

RUN npm install --omit=dev
RUN npx prisma generate

CMD ["node", "dist/index.js"]
