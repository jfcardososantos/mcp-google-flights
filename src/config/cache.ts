import NodeCache from 'node-cache';

const cache = new NodeCache({
  stdTTL: 600, // 10 minutos
  checkperiod: 120, // 2 minutos
  useClones: false,
});

export default cache; 