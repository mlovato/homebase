import { NextResponse } from "next/server";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "Homebase Public API",
    version: "1.0.0",
    description: "Public read-only API for Homebase service discovery.",
  },
  paths: {
    "/api/public/services": {
      get: {
        summary: "List available services",
        description:
          "Returns the list of services configured in Homebase, including their primary and alternative URLs.",
        operationId: "getServices",
        responses: {
          "200": {
            description: "Array of services",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["name", "url", "url_alt"],
                    properties: {
                      name: { type: "string", example: "Plex" },
                      url: {
                        type: "string",
                        format: "uri",
                        example: "http://plex.local:32400",
                      },
                      url_alt: {
                        type: ["string", "null"],
                        format: "uri",
                        example: "https://plex.example.com",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/openapi": {
      get: {
        summary: "OpenAPI specification",
        description: "Returns this OpenAPI 3.0 specification document.",
        operationId: "getOpenApiSpec",
        responses: {
          "200": {
            description: "OpenAPI 3.0 JSON document",
            content: {
              "application/json": {
                schema: { type: "object" },
              },
            },
          },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec);
}
