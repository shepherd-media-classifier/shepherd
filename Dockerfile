FROM node:15

# turn off the nuisance update message 
ARG NO_UPDATE_NOTIFIER=true
ENV NO_UPDATE_NOTIFIER=true
RUN npm config set update-notifier false

# install ffmpeg dependency
RUN apt update 
RUN apt install ffmpeg -y

# create app directory
WORKDIR /app

COPY package*.json ./

# If you are building your code for production
# RUN npm ci --only=production
RUN npm ci

# bundle app source
COPY . .

EXPOSE 80
EXPOSE 3001

ENV NODE_ENV=production
ENV TF_CPP_MIN_LOG_LEVEL=2
ENTRYPOINT node -r ts-node/register src/$PROCESS_NAME/index.ts