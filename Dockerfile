# 1. Zaczynamy od oficjalnego obrazu Pythona 3.9 (wersja slim jest lżejsza)
FROM python:3.9-slim

WORKDIR /app

# 2. Instalacja pakietów systemowych potrzebnych dla Twojej apki i instalacji Buna
# curl i unzip są potrzebne do pobrania Buna
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    ffmpeg \
    autoconf \
    automake \
    gcc \
    gawk \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 3. Instalacja Buna
# Ustawiamy zmienną środowiskową, żeby Bun był widoczny w terminalu
ENV BUN_INSTALL="/root/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"

# Pobranie i instalacja
RUN curl -fsSL https://bun.sh/install | bash

# Sprawdzenie wersji (opcjonalnie, dla pewności w logach)
RUN bun --version && python3 --version

# 4. Kopiowanie plików projektu
COPY . .

# 5. Instalacja zależności Bun
RUN bun install

# 6. Expose port
EXPOSE 3000

# 7. Komenda startowa
CMD ["bun", "run", "start"]