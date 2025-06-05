FROM node:18-alpine

# Instalar dependências de segurança
RUN apk add --no-cache tini

# Configurar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    mkdir -p /app/logs && \
    chown -R nodejs:nodejs /app

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install --omit=dev --ignore-scripts && \
    npm cache clean --force

# Copiar código fonte
COPY --chown=nodejs:nodejs . .

# Build da aplicação
RUN npm run build && \
    rm -rf src/ && \
    rm -rf node_modules/@types

# Configurar permissões
RUN chown -R nodejs:nodejs /app

# Mudar para usuário não-root
USER nodejs

# Expor porta
EXPOSE 3000

# Configurar healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Usar tini como init system
ENTRYPOINT ["/sbin/tini", "--"]

# Iniciar aplicação
CMD ["npm", "start"]