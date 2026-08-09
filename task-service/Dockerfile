# ---- Build stage ----
FROM node:20.18.0-alpine3.20 AS build
WORKDIR /app
RUN npm install -g pnpm@9
COPY package.json ./
RUN pnpm install --prod=false
COPY . .

# ---- Runtime stage ----
FROM node:20.18.0-alpine3.20 AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/src ./src
USER node
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=5 \
  CMD curl -fsS http://localhost:3001/health || exit 1
CMD ["node", "src/index.js"]
