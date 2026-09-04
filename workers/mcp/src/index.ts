// Production entry: OAuth-gated + metered MCP server.
//
// @cloudflare/workers-oauth-provider terminates OAuth (Dynamic Client Registration +
// PKCE S256, which Claude.ai requires) and only forwards authenticated requests to
// the McpAgent. The authenticated customer arrives as `this.props` inside the agent,
// where metering keys on it. Streamable HTTP at /mcp, legacy SSE at /sse.
import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { FindLocalMCP } from "./mcp";
import { defaultHandler } from "./auth";

// The Durable Object class must be exported so the runtime can instantiate it.
export { FindLocalMCP };

export default new OAuthProvider({
  apiHandlers: {
    "/mcp": FindLocalMCP.serve("/mcp"),
    "/sse": FindLocalMCP.serveSSE("/sse"),
  },
  defaultHandler: defaultHandler as any,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
  scopesSupported: ["mcp:read"],
});
