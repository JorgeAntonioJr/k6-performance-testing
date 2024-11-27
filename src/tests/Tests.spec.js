import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Métricas personalizadas
export const getCryptoPriceDuration = new Trend(
  'get_crypto_price_duration',
  true
); // Duração da chamada GET
export const successRate = new Rate('success_rate'); // Taxa de respostas bem-sucedidas

// Configuração de carga
export const options = {
  thresholds: {
    get_crypto_price_duration: ['p(95)<5700'], // 95% das respostas abaixo de 5700ms
    success_rate: ['rate>0.88'] // Menos de 12% das requisições com erro
  },
  stages: [
    { duration: '1m', target: 10 }, // Iniciar com 10 VUs em 1 minuto
    { duration: '3m', target: 300 }, // Aumentar para 300 VUs em 3 minutos
    { duration: '1m', target: 0 } // Encerrar reduzindo para 0 VUs em 1 minuto
  ]
};

// Geração de relatórios
export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data), // Relatório em HTML
    stdout: textSummary(data, { indent: ' ', enableColors: true }) // Resumo no console
  };
}

// Teste principal
export default function () {
  const baseUrl = 'https://api.coingecko.com/api/v3';
  const endpoint = '/simple/price?ids=bitcoin&vs_currencies=usd';

  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const OK = 200;

  // Chamada GET para obter o preço do Bitcoin
  const res = http.get(`${baseUrl}${endpoint}`, params);

  // Adicionar o tempo de duração da requisição às métricas
  getCryptoPriceDuration.add(res.timings.duration);

  // Adicionar a taxa de sucesso às métricas
  successRate.add(res.status === OK);

  // Validações
  check(res, {
    'GET Crypto Price - Status 200': () => res.status === OK,
    'GET Crypto Price - Resposta não vazia': () =>
      res.json('bitcoin.usd') !== undefined
  });
}
