FROM node:20-alpine

# Instalar dependências necessárias
RUN apk add --no-cache python3 make g++

# Criar usuário não-root
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de configuração
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependências
RUN npm install --ignore-scripts

# Copiar código fonte
COPY --chown=nodejs:nodejs . .

# Build da aplicação
RUN npm run build && \
    # Remover arquivos desnecessários
    rm -rf src/ && \
    rm -rf node_modules/@types && \
    # Remover dependências de desenvolvimento
    npm prune --production && \
    # Limpar cache
    npm cache clean --force

# Mudar para usuário não-root
USER nodejs

# Expor porta
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]