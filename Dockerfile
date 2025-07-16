# Stage 1: Build the React app
FROM node:18 as build
WORKDIR /app

# Copy only dependency files first
COPY oj_auth/frontend/client/package*.json ./client/

# Install dependencies
WORKDIR /app/client
RUN npm ci

# Copy the rest of the frontend code
COPY oj_auth/frontend/client/ ./

# Build the React app
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/client/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
