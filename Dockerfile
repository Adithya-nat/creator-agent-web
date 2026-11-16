# Creator Agent web app (Next.js standalone server).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_* values are baked in at build time.
ARG NEXT_PUBLIC_API_BASE
ARG NEXT_PUBLIC_AUTH_ENABLED=true
ARG NEXT_PUBLIC_HOMEPAGE_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
