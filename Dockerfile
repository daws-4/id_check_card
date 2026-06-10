FROM node:24-alpine AS base

# Habilitar corepack para usar pnpm de forma nativa e integrada en Node.js
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# 1. Instalar dependencias necesarias para Node.js en Alpine
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiar archivos de definición de dependencias de pnpm
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# 2. Construir el proyecto Next.js
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js recolecta telemetría anónima de forma predeterminada.
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# 3. Imagen de producción optimizada (Runner)
FROM base AS runner
WORKDIR /app

# Configuración de entorno para producción
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Es buena práctica no correr aplicaciones como root en contenedores
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

USER nextjs

# Copiar los artefactos construidos desde la etapa 'builder'
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Exponer el puerto configurado en Coolify/Render
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# Arrancar el servidor standalone generado por Next.js
CMD ["node", "server.js"]