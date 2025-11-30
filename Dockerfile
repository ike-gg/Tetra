# Start od oficjalnego obrazu Bun
FROM oven/bun:latest

WORKDIR /app

# Instalacja pakietów systemowych
RUN apt-get update && apt-get install -y \
    python3.9 \
    python3.9-venv \
    python3.9-dev \
    ffmpeg \
    autoconf \
    automake \
    gcc \
    gawk \
    && rm -rf /var/lib/apt/lists/*

# Kopiowanie plików projektu
COPY . .

# Instalacja zależności Bun
RUN bun install

# Expose port (jeśli projekt uruchamia serwer)
EXPOSE 3000

# Komenda startowa
CMD ["bun", "run", "start"]
