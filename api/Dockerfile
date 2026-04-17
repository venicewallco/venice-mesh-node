FROM node:18-alpine 
 
 WORKDIR /app 
 
 # Install curl for healthcheck 
 RUN apk add --no-cache curl 
 
 # Copy package files 
 COPY package*.json ./ 
 
 # Install dependencies 
 RUN npm ci --only=production 
 
 # Copy source code 
 COPY . . 
 
 # Create log directory 
 RUN mkdir -p /var/log/venice-api 
 
 # Expose port 
 EXPOSE 3000 
 
 # Healthcheck 
 HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \ 
  CMD curl -f http://localhost:3000/health || exit 1 
 
 # Start server 
 CMD ["node", "server.js"]