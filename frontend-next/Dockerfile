# Prospect Assist AI — Next.js frontend (static export served by nginx)
# Build context: ./frontend-next
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Leave NEXT_PUBLIC_API_BASE empty so the app derives the backend URL from the
# page hostname (works for localhost AND phones on the LAN). Pin it only when
# the API lives on a different host: --build-arg NEXT_PUBLIC_API_BASE=https://api.example.com/api
ARG NEXT_PUBLIC_API_BASE=""
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/out /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
