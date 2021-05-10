FROM node:14-alpine
WORKDIR /usr/app

COPY package*.json tsconfig.json ./
RUN npm ci
COPY src src/
RUN npm run build

CMD [ "npm", "start" ]

