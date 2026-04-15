FROM node:20-alpine AS build

WORKDIR /app/dashboard

COPY dashboard/package*.json ./
RUN npm ci

COPY dashboard/ ./
RUN npm run build


FROM nginx:1.29-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/runtime-config.js.template /etc/nginx/templates/runtime-config.js.template
COPY --from=build /app/dashboard/dist /usr/share/nginx/html

ENV NGINX_ENVSUBST_OUTPUT_DIR=/usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
