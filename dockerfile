FROM node:22-alpine

WORKDIR /app

COPY . .

RUN npm install -g pnpm@latest
RUN pnpm install

EXPOSE 9527

CMD ["pnpm", "run", "start"]