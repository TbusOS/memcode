import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { CodeLoader } from "../loader";

export async function runServer(loader: CodeLoader): Promise<void> {
  const server = new Server(
    {
      name: "memcode",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "memory_code_read",
          description: "Read file content from memory. Returns the content of a file that was loaded into memory.",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "File path (relative or absolute)",
              },
            },
            required: ["path"],
          },
        },
        {
          name: "memory_code_grep",
          description: "Search for a pattern in code loaded into memory. Returns matching lines with file and line number.",
          inputSchema: {
            type: "object",
            properties: {
              pattern: {
                type: "string",
                description: "Regex pattern to search for",
              },
              path: {
                type: "string",
                description: "Optional file path to search in",
              },
            },
            required: ["pattern"],
          },
        },
        {
          name: "memory_code_glob",
          description: "Find files matching a glob pattern in memory. Returns list of file paths.",
          inputSchema: {
            type: "object",
            properties: {
              pattern: {
                type: "string",
                description: "Glob pattern (e.g., '*.ts', 'src/**/*.js')",
              },
            },
            required: ["pattern"],
          },
        },
        {
          name: "memory_code_stats",
          description: "Get statistics about the code loaded into memory.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === "memory_code_read") {
        const content = loader.read(args.path as string);
        if (content === null) {
          return {
            content: [{ type: "text", text: `File not found: ${args.path}` }],
          };
        }
        return { content: [{ type: "text", text: content }] };
      }

      if (name === "memory_code_grep") {
        const results = loader.grep(args.pattern as string, args.path as string | undefined);
        if (results.length === 0) {
          return {
            content: [{ type: "text", text: `No matches found for: ${args.pattern}` }],
          };
        }
        const maxResults = 1000;
        const limitedResults = results.slice(0, maxResults);
        if (results.length > maxResults) {
          limitedResults.push({ message: `... and ${results.length - maxResults} more matches (truncated)` } as any);
        }
        return { content: [{ type: "text", text: JSON.stringify(limitedResults) }] };
      }

      if (name === "memory_code_glob") {
        const results = loader.glob(args.pattern as string);
        if (results.length === 0) {
          return {
            content: [{ type: "text", text: `No files match pattern: ${args.pattern}` }],
          };
        }
        return { content: [{ type: "text", text: JSON.stringify(results) }] };
      }

      if (name === "memory_code_stats") {
        const stats = loader.getStats();
        const sizeMb = stats.totalSize / (1024 * 1024);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              fileCount: stats.fileCount,
              totalSize: stats.totalSize,
              totalSizeMb: Math.round(sizeMb * 100) / 100,
              loadTime: stats.loadTime,
              watchEnabled: stats.watchEnabled,
              codePath: stats.codePath,
            }),
          }],
        };
      }

      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error}` }],
        isError: true,
      };
    }
  });

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
