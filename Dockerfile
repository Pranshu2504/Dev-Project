# Base image
FROM node:18

# Create app directory
WORKDIR /app

# Copy package.json and install deps
COPY package*.json ./
RUN npm install

# Copy rest of backend code
COPY . .

# Expose backend port
EXPOSE 5000

# Start the server
CMD ["node", "app.js"]
