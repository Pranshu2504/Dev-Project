FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    g++ \
    openjdk-17-jdk \
    python3 \
    python3-pip \
    bash \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy files
COPY . /app

# Install backend dependencies including Gemini SDK
RUN npm install && npm install @google/generative-ai

# Optional: install dotenv if you're using .env
RUN npm install dotenv

# Expose port
EXPOSE 7000

# Start the app
CMD ["node", "app.js"]
