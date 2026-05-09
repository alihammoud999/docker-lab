FROM node:18-alpine

WORKDIR /app

ARG APP_VERSION=v1
ENV APP_VERSION=${APP_VERSION}
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --production

COPY src/ ./src/

EXPOSE 3000

CMD ["npm", "start"]
