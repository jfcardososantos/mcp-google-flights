import CircuitBreaker from 'opossum';

const circuitBreaker = new CircuitBreaker(async (fn: () => Promise<any>) => {
  return await fn();
}, {
  timeout: 3000, // 3 segundos
  errorThresholdPercentage: 50, // 50% de erros
  resetTimeout: 30000, // 30 segundos
  rollingCountTimeout: 10000, // 10 segundos
  rollingCountBuckets: 10,
  name: 'google-flights-api',
  volumeThreshold: 10 // mínimo de 10 requisições
});

// Adicionar listeners para eventos
circuitBreaker.on('open', () => {
  console.warn('Circuit Breaker aberto - API indisponível');
});

circuitBreaker.on('halfOpen', () => {
  console.info('Circuit Breaker meio aberto - Testando API');
});

circuitBreaker.on('close', () => {
  console.info('Circuit Breaker fechado - API disponível');
});

circuitBreaker.on('reject', () => {
  console.warn('Circuit Breaker rejeitando requisição');
});

export default circuitBreaker; 