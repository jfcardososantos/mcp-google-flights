import { IExecuteFunctions } from 'n8n-core';
import {
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

export class McpGoogleFlights implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'MCP Google Flights',
    name: 'mcpGoogleFlights',
    icon: 'file:googleFlights.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Busca de voos usando Google Flights via MCP',
    defaults: {
      name: 'MCP Google Flights',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'mcpGoogleFlightsApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Search Flights',
            value: 'searchFlights',
            description: 'Buscar voos entre dois aeroportos',
            action: 'Search flights between two airports',
          },
          {
            name: 'Search Airports',
            value: 'searchAirports',
            description: 'Buscar aeroportos por nome ou código',
            action: 'Search airports by name or code',
          },
          {
            name: 'Get Flight Insights',
            value: 'getFlightInsights',
            description: 'Obter insights sobre voos',
            action: 'Get insights about flights',
          },
        ],
        default: 'searchFlights',
      },
      {
        displayName: 'Departure Airport',
        name: 'departureId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['searchFlights'],
          },
        },
        description: 'Código IATA do aeroporto de origem (ex: GRU, JFK)',
      },
      {
        displayName: 'Arrival Airport',
        name: 'arrivalId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['searchFlights'],
          },
        },
        description: 'Código IATA do aeroporto de destino (ex: GRU, JFK)',
      },
      {
        displayName: 'Outbound Date',
        name: 'outboundDate',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['searchFlights'],
          },
        },
        description: 'Data de partida no formato YYYY-MM-DD',
      },
      {
        displayName: 'Return Date',
        name: 'returnDate',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            operation: ['searchFlights'],
          },
        },
        description: 'Data de retorno no formato YYYY-MM-DD (opcional)',
      },
      {
        displayName: 'Search Query',
        name: 'query',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['searchAirports'],
          },
        },
        description: 'Nome da cidade, aeroporto ou código IATA para buscar',
      },
      {
        displayName: 'Flights Data',
        name: 'flightsData',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['getFlightInsights'],
          },
        },
        description: 'Dados dos voos em formato JSON para análise',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        let result;

        if (operation === 'searchFlights') {
          const departureId = this.getNodeParameter('departureId', i) as string;
          const arrivalId = this.getNodeParameter('arrivalId', i) as string;
          const outboundDate = this.getNodeParameter('outboundDate', i) as string;
          const returnDate = this.getNodeParameter('returnDate', i) as string;

          result = {
            command: 'search_flights',
            arguments: {
              departure_id: departureId,
              arrival_id: arrivalId,
              outbound_date: outboundDate,
              return_date: returnDate,
            },
          };
        } else if (operation === 'searchAirports') {
          const query = this.getNodeParameter('query', i) as string;

          result = {
            command: 'search_airports',
            arguments: {
              query,
            },
          };
        } else if (operation === 'getFlightInsights') {
          const flightsData = this.getNodeParameter('flightsData', i) as string;

          result = {
            command: 'get_flight_insights',
            arguments: {
              flights_data: flightsData,
            },
          };
        }

        returnData.push({
          json: result,
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error.message,
            },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
} 