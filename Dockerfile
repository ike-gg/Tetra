FROM oven/bun:latest

WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3.9 \
    python3.9-venv \
    python3.9-dev \
    ffmpeg \
    autoconf \
    automake \
    gcc \
    gawk \

COPY . .

RUN bun install

EXPOSE 3000

CMD ["bun", "run", "start"]
