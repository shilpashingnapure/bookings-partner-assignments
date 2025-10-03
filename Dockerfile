# Start from a Node image
FROM node:20-slim

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all project files
COPY . .

# Expose the Next.js port
EXPOSE 3000

# Run the app in development mode
CMD ["npm", "run", "dev"]