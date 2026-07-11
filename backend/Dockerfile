FROM node:alpine

WORKDIR /build

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

RUN yarn run build

EXPOSE 3001

CMD ["yarn", "start"]