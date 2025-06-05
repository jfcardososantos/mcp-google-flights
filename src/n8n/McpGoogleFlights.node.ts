import { getExecuteFunctions } from 'n8n-core';
import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData } from 'n8n-workflow';
import type { INodeType } from 'n8n-workflow';
import type { INodeTypeDescription } from 'n8n-workflow';
import type { IDataObject } from 'n8n-workflow';
import type { NodeConnectionType } from 'n8n-workflow';
import type { INodeInputConfiguration } from 'n8n-workflow';
import type { INodeOutputConfiguration } from 'n8n-workflow';

export class McpGoogleFlights implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'MCP Google Flights',
    name: 'mcpGoogleFlights',
    icon: 'file:google-flights.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Busca de voos usando Google Flights via MCP',
    defaults: {
      name: 'MCP Google Flights',
    },
    inputs: ['main'] as NodeConnectionType[],
    outputs: ['main'] as NodeConnectionType[],
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
          },
          {
            name: 'Search Airports',
            value: 'searchAirports',
            description: 'Buscar aeroportos por nome ou código',
          },
          {
            name: 'Get Flight Insights',
            value: 'getFlightInsights',
            description: 'Obter insights sobre voos',
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
    const returnData: IDataObject[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        let command: IDataObject | undefined;

        if (operation === 'searchFlights') {
          command = {
            command: 'search_flights',
            arguments: {
              departure_id: this.getNodeParameter('departureId', i) as string,
              arrival_id: this.getNodeParameter('arrivalId', i) as string,
              outbound_date: this.getNodeParameter('outboundDate', i) as string,
              return_date: this.getNodeParameter('returnDate', i) as string,
            },
          };
        } else if (operation === 'searchAirports') {
          command = {
            command: 'search_airports',
            arguments: {
              query: this.getNodeParameter('query', i) as string,
            },
          };
        } else if (operation === 'getFlightInsights') {
          command = {
            command: 'get_flight_insights',
            arguments: {
              flights_data: this.getNodeParameter('flightsData', i) as string,
              criteria: this.getNodeParameter('criteria', i) as string,
            },
          };
        }

        if (command) {
          returnData.push(command);
        }
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Error in item ${i}: ${error.message}`);
        }
        throw error;
      }
    }

    return [this.helpers.returnJsonArray(returnData)];
  }
} 