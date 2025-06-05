# MCP Google Flights

Servidor MCP para busca de voos usando a API do Google Flights através do SerpAPI.

## 🚀 Funcionalidades

- Busca de voos com múltiplos filtros
- Cache de resultados para melhor performance
- Circuit breaker para resiliência
- Rate limiting para proteção da API
- Logging estruturado
- Monitoramento de saúde
- Segurança reforçada

## 📋 Pré-requisitos

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker (opcional)

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/jfcardososantos/mcp-google-flights.git
cd mcp-google-flights
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

## 🚀 Uso

### Desenvolvimento

```bash
npm run dev
```

### Produção

```bash
npm run build
npm start
```

### Docker

```bash
docker build -t mcp-google-flights .
docker run -p 3000:3000 mcp-google-flights
```

## 🧪 Testes

```bash
# Rodar testes
npm test

# Verificar cobertura
npm run test:coverage
```

## 📦 Deploy

### Preparação

1. Configure as variáveis de ambiente de produção
2. Execute os testes
3. Faça o build da aplicação
4. Construa a imagem Docker

### Plataformas Recomendadas

- AWS ECS/EKS
- Google Cloud Run
- Azure Container Instances
- DigitalOcean App Platform

## 🔒 Segurança

- Rate limiting implementado
- CORS configurado
- Helmet para headers de segurança
- Usuário não-root no container
- Circuit breaker para resiliência

## 📊 Monitoramento

- Logs estruturados com Winston
- Health check endpoint
- Métricas de performance
- Circuit breaker status

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua branch de feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📫 Contato

Felipe Santos - [@jfcardososantos](https://github.com/jfcardososantos)

Link do Projeto: [https://github.com/jfcardososantos/mcp-google-flights](https://github.com/jfcardososantos/mcp-google-flights) 