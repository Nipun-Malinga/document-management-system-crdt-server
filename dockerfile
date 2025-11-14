FROM node:lts-alpine

RUN addgroup app && adduser -S -G app app

WORKDIR /usr/src/app

COPY package*.json .

RUN npm install --omit=dev

COPY dist ./dist

RUN chown -R app:app /usr/src/app

USER app

EXPOSE 1234

CMD ["node", "dist/index.js"]


