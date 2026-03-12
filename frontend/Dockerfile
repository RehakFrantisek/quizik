FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV PORT=3100
EXPOSE 3100
CMD ["npm", "run", "dev"]
