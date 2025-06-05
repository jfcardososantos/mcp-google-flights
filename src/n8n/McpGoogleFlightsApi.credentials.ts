import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class McpGoogleFlightsApi implements ICredentialType {
  name = 'mcpGoogleFlightsApi';
  displayName = 'MCP Google Flights API';
  documentationUrl = 'https://github.com/jfcardososantos/mcp-google-flights';
  properties: INodeProperties[] = [
    {
      displayName: 'SERP API Key',
      name: 'serpApiKey',
      type: 'string',
      default: '',
      required: true,
      description: 'Chave da API do SerpAPI',
    },
  ];
} 