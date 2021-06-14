FROM node:15

# create app directory
WORKDIR /usr/src/app

RUN npm install -g pm2
# RUN pm2 startup

COPY package*.json ./

# RUN npm install
# If you are building your code for production
# RUN npm ci --only=production
RUN npm ci

# bundle app source
COPY . .

EXPOSE 80
EXPOSE 3001

ENTRYPOINT [ "pm2-runtime", "start", "ecosystem.config.js" ]