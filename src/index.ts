#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type {
  Tool,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import { z } from 'zod';
import dotenv from 'dotenv';
import logger from './config/logger.js';

// Carregar variáveis de ambiente
dotenv.config();

// Esquemas de validação
const FlightSearchSchema = z.object({
  departure_id: z.string().min(3, 'Código do aeroporto de origem deve ter pelo menos 3 caracteres'),
  arrival_id: z.string().min(3, 'Código do aeroporto de destino deve ter pelo menos 3 caracteres'),
  outbound_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD').optional(),
  currency: z.string().default('BRL'),
  language: z.string().default('pt-BR'),
  adults: z.number().min(1).max(9).default(1),
  children: z.number().min(0).max(8).default(0),
  infants: z.number().min(0).max(8).default(0),
  travel_class: z.enum(['1', '2', '3', '4']).default('1'), // 1=Economy, 2=Premium Economy, 3=Business, 4=First
  max_price: z.number().positive().optional(),
  stops: z.enum(['0', '1', '2']).optional(), // 0=nonstop, 1=1 stop, 2=2+ stops
});

const AirportSearchSchema = z.object({
  query: z.string().min(2, 'Query deve ter pelo menos 2 caracteres'),
  language: z.string().default('pt-BR'),
});

// Interface para resultados de voo
interface FlightResult {
  flights: Array<{
    airline: string;
    airline_logo: string;
    flight_number: string;
    departure_airport: {
      name: string;
      id: string;
      time: string;
    };
    arrival_airport: {
      name: string;
      id: string;
      time: string;
    };
    duration: number;
    airplane: string;
    legroom: string;
    extensions: string[];
  }>;
  layovers?: Array<{
    duration: number;
    name: string;
    id: string;
  }>;
  total_duration: number;
  carbon_emissions: {
    this_flight: number;
    typical_for_this_route: number;
    difference_percent: number;
  };
  price: number;
  type: string;
  airline_logo: string;
  departure_token: string;
}

// Interface para aeroportos
interface Airport {
  id: string;
  name: string;
  city: string;
  country: string;
  country_code: string;
}

class GoogleFlightsMCPServer {
  private server: Server;
  private serpApiKey: string;

  constructor() {
    this.serpApiKey = process.env.SERP_API_KEY || '';
    if (!this.serpApiKey) {
      logger.error('SERP_API_KEY não encontrada nas variáveis de ambiente');
      process.exit(1);
    }

    this.server = new Server(
      {
        name: 'google-flights-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // Listar ferramentas disponíveis
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_flights',
            description: 'Buscar voos entre dois aeroportos com opções avançadas',
            inputSchema: {
              type: 'object',
              properties: {
                departure_id: {
                  type: 'string',
                  description: 'Código IATA do aeroporto de origem (ex: GRU, JFK, LHR)',
                },
                arrival_id: {
                  type: 'string',
                  description: 'Código IATA do aeroporto de destino (ex: GRU, JFK, LHR)',
                },
                outbound_date: {
                  type: 'string',
                  description: 'Data de partida no formato YYYY-MM-DD',
                },
                return_date: {
                  type: 'string',
                  description: 'Data de retorno no formato YYYY-MM-DD (opcional para viagem de ida)',
                },
                currency: {
                  type: 'string',
                  description: 'Código da moeda (BRL, USD, EUR, etc.)',
                  default: 'BRL',
                },
                language: {
                  type: 'string',
                  description: 'Código do idioma (pt-BR, en, es, etc.)',
                  default: 'pt-BR',
                },
                adults: {
                  type: 'number',
                  description: 'Número de adultos (1-9)',
                  default: 1,
                },
                children: {
                  type: 'number',
                  description: 'Número de crianças (0-8)',
                  default: 0,
                },
                infants: {
                  type: 'number',
                  description: 'Número de bebês (0-8)',
                  default: 0,
                },
                travel_class: {
                  type: 'string',
                  description: 'Classe de viagem: 1=Economy, 2=Premium Economy, 3=Business, 4=First',
                  default: '1',
                },
                max_price: {
                  type: 'number',
                  description: 'Preço máximo desejado',
                },
                stops: {
                  type: 'string',
                  description: 'Número de paradas: 0=direto, 1=1 parada, 2=2+ paradas',
                },
              },
              required: ['departure_id', 'arrival_id', 'outbound_date'],
            },
          },
          {
            name: 'search_airports',
            description: 'Buscar aeroportos por nome, cidade ou código',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Nome da cidade, aeroporto ou código IATA para buscar',
                },
                language: {
                  type: 'string',
                  description: 'Código do idioma para os resultados (ex: pt-BR, en)',
                  default: 'pt-BR',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_flight_insights',
            description: 'Obter insights e análises sobre voos encontrados',
            inputSchema: {
              type: 'object',
              properties: {
                flights_data: {
                  type: 'string',
                  description: 'Dados dos voos em formato JSON para análise',
                },
                criteria: {
                  type: 'string',
                  description: 'Critérios de análise: preco, duracao, emissoes, conforto, etc.',
                  default: 'price',
                },
              },
              required: ['flights_data'],
            },
          },
        ] as Tool[],
      };
    });

    // Manipular chamadas de ferramentas
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_flights':
            return await this.searchFlights(args as unknown as z.infer<typeof FlightSearchSchema>);
          case 'search_airports':
            return await this.searchAirports(args as unknown as z.infer<typeof AirportSearchSchema>);
          case 'get_flight_insights':
            return await this.getFlightInsights(args as unknown as { flights_data: string; criteria?: string });
          default:
            throw new Error(`Ferramenta desconhecida: ${name}`);
        }
      } catch (error) {
        logger.error(`Erro ao executar ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Erro ao executar ${name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
            },
          ],
        };
      }
    });
  }

  private async searchFlights(args: z.infer<typeof FlightSearchSchema>) {
    try {
      const params = {
        engine: 'google_flights',
        departure_id: args.departure_id,
        arrival_id: args.arrival_id,
        outbound_date: args.outbound_date,
        return_date: args.return_date,
        currency: args.currency,
        hl: args.language,
        adults: args.adults,
        children: args.children,
        infants_in_seat: args.infants,
        travel_class: args.travel_class,
        max_price: args.max_price,
        stops: args.stops,
        api_key: this.serpApiKey,
      };

      // Remover parâmetros undefined
      Object.keys(params).forEach(key => {
        if (params[key as keyof typeof params] === undefined) {
          delete params[key as keyof typeof params];
        }
      });

      const response = await axios.get('https://serpapi.com/search', { params });
      const data = response.data;

      // Processar e formatar resultados
      const flights = [
        ...(data.best_flights || []),
        ...(data.other_flights || []),
      ];

      const processedFlights = flights.map((flight: FlightResult) => ({
        airline: flight.flights[0]?.airline || 'N/A',
        airline_logo: flight.airline_logo,
        price: flight.price,
        currency: args.currency,
        total_duration: flight.total_duration,
        departure_time: flight.flights[0]?.departure_airport?.time,
        arrival_time: flight.flights[flight.flights.length - 1]?.arrival_airport?.time,
        departure_airport: flight.flights[0]?.departure_airport,
        arrival_airport: flight.flights[flight.flights.length - 1]?.arrival_airport,
        stops: flight.flights.length - 1,
        layovers: flight.layovers,
        carbon_emissions: flight.carbon_emissions,
        flight_details: flight.flights,
        type: flight.type,
        departure_token: flight.departure_token,
      }));

      const summary = {
        total_flights_found: processedFlights.length,
        price_range: {
          min: Math.min(...processedFlights.map(f => f.price)),
          max: Math.max(...processedFlights.map(f => f.price)),
          currency: args.currency,
        },
        airlines: [...new Set(processedFlights.map(f => f.airline))],
        search_parameters: {
          route: `${args.departure_id} → ${args.arrival_id}`,
          departure_date: args.outbound_date,
          return_date: args.return_date,
          passengers: {
            adults: args.adults,
            children: args.children,
            infants: args.infants,
          },
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary,
              flights: processedFlights,
              raw_data: data,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Erro ao buscar voos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private async searchAirports(args: z.infer<typeof AirportSearchSchema>) {
    try {
      const params = {
        engine: 'google_flights',
        type: 'airports',
        query: args.query,
        hl: args.language,
        api_key: this.serpApiKey,
      };

      const response = await axios.get('https://serpapi.com/search', { params });
      const data = response.data;

      const airports = (data.airports || []).map((airport: any) => ({
        id: airport.id,
        name: airport.name,
        city: airport.city,
        country: airport.country,
        country_code: airport.country_code,
        image: airport.image,
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query: args.query,
              total_airports_found: airports.length,
              airports,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Erro ao buscar aeroportos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private async getFlightInsights(args: { flights_data: string; criteria?: string }) {
    try {
      const flightsData = JSON.parse(args.flights_data);
      const criteria = args.criteria || 'preco'; // Alterado para 'preco' como padrão

      let insights = {
        analysis_criteria: criteria,
        recommendations: [] as any[],
        statistics: {} as any,
      };

      if (flightsData.flights && flightsData.flights.length > 0) {
        const flights = flightsData.flights;

        // Análise baseada no critério
        switch (criteria) {
          case 'preco': // Alterado para 'preco'
            const sortedByPrice = [...flights].sort((a, b) => a.price - b.price);
            insights.recommendations = [
              {
                type: 'best_price',
                flight: sortedByPrice[0],
                reason: 'Menor preço encontrado',
              },
              {
                type: 'best_value',
                flight: this.getBestValue(flights),
                reason: 'Melhor custo-benefício considerando duração e preço',
              },
            ];
            insights.statistics = {
              average_price: flights.reduce((sum: number, f: any) => sum + f.price, 0) / flights.length,
              price_range: {
                min: sortedByPrice[0].price,
                max: sortedByPrice[sortedByPrice.length - 1].price,
              },
            };
            break;

          case 'duracao': // Alterado para 'duracao'
            const sortedByDuration = [...flights].sort((a, b) => a.total_duration - b.total_duration);
            insights.recommendations = [
              {
                type: 'fastest_flight',
                flight: sortedByDuration[0],
                reason: 'Menor tempo de viagem',
              },
            ];
            break;

          case 'emissoes': // Alterado para 'emissoes'
            const withEmissions = flights.filter((f: any) => f.carbon_emissions);
            if (withEmissions.length > 0) {
              const sortedByEmissions = withEmissions.sort((a, b) => 
                a.carbon_emissions.this_flight - b.carbon_emissions.this_flight
              );
              insights.recommendations = [
                {
                  type: 'eco_friendly',
                  flight: sortedByEmissions[0],
                  reason: 'Menor emissão de carbono',
                },
              ];
            }
            break;
        }

        // Estatísticas gerais
        insights.statistics = {
          ...insights.statistics,
          total_flights: flights.length,
          airlines_count: new Set(flights.map((f: any) => f.airline)).size,
          direct_flights: flights.filter((f: any) => f.stops === 0).length,
          with_stops: flights.filter((f: any) => f.stops > 0).length,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(insights, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Erro ao analisar voos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private getBestValue(flights: FlightResult[]): FlightResult {
    return flights.reduce((a: FlightResult, b: FlightResult): FlightResult => {
      return a.price < b.price ? a : b;
    });
  }

  async start() {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      logger.info('Servidor MCP Google Flights iniciado');
    } catch (error) {
      logger.error('Erro ao iniciar servidor:', error);
      process.exit(1);
    }
  }
}

// Iniciar o servidor
const server = new GoogleFlightsMCPServer();
server.start().catch((error) => {
  logger.error('Erro fatal:', error);
  process.exit(1);
});