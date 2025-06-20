declare module '@modelcontextprotocol/sdk/server/index.js' {
  export class Server {
    constructor(
      info: {
        name: string;
        version: string;
      },
      capabilities: {
        tools: Record<string, unknown>;
      }
    );
    setRequestHandler<T = unknown, R = unknown>(
      schema: unknown,
      handler: (request: T) => Promise<R>
    ): void;
    connect(transport: unknown): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/server/stdio.js' {
  export class StdioServerTransport {
    constructor();
  }
}

declare module '@modelcontextprotocol/sdk/types.js' {
  export const CallToolRequestSchema: unknown;
  export const ListToolsRequestSchema: unknown;
  export type Tool = {
    name: string;
    description: string;
    inputSchema: {
      type: string;
      properties: Record<string, unknown>;
      required: string[];
    };
  };
  export type CallToolRequest = {
    params: {
      name: string;
      arguments: unknown;
    };
  };
  export type ToolResponse = {
    content: Array<{
      type: string;
      text: string;
    }>;
  };
} 