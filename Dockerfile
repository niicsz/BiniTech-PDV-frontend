FROM node:25-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration=production

FROM nginx:alpine AS runtime

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

COPY docker-entrypoint.d/40-env-js.sh /docker-entrypoint.d/40-env-js.sh
RUN chmod +x /docker-entrypoint.d/40-env-js.sh

COPY --from=build /app/dist/binitech-pdv-frontend/browser /usr/share/nginx/html

ENV PORT=8080
EXPOSE 8080
