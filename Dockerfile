FROM node:20
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3030
COPY ./images /usr/src/app/images
EXPOSE 3050
ENV WS_PORT 3050
EXPOSE 443
CMD ["npm", "run", "dev"]
