import CircuitBreaker from 'circuit-breaker-js';

const circuitBreaker = new CircuitBreaker({
  windowDuration: 10000, // 10 segundos
  numBuckets: 10,
  timeoutDuration: 3000, // 3 segundos
  errorThreshold: 50, // 50% de erros
  volumeThreshold: 10, // mínimo de 10 requisições
});

export default circuitBreaker; 