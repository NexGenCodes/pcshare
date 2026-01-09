FROM node:20-slim

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install

# Copy source and config (Vite/TS/Tailwind)
COPY . .

# Expose Vite dev port
EXPOSE 5173

# Turbo TSX/Tailwind Dev Command
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
