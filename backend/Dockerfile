FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm install --production=false

COPY . .
RUN npm run build

EXPOSE 8000
CMD ["npm", "run", "start:prod"]
