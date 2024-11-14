FROM node:20-alpine

RUN apk add --no-cache ffmpeg python3 py3-pip

WORKDIR /app

COPY . .

RUN npm install

RUN npm run deployCommands

EXPOSE 3000

CMD ["npm", "run", "start"]
