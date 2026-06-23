FROM node:20-alpine

WORKDIR /app

# Copy server package files and install
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm ci --production

# Copy all source
COPY . .

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "server/index.js"]