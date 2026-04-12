FROM node:22-alpine

WORKDIR /app

# Install Vite project dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start dev server, bind to 0.0.0.0 so it's accessible from host
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
