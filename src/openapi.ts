import { z } from 'zod';

const Reference = z.object({
  $ref: z.string().optional(),
});

const BaseSchemaProperties = z.object({
  title: z.string().optional(),
  multipleOf: z.number().optional(),
  maximum: z.number().optional(),
  exclusiveMaximum: z.boolean().optional(),
  minimum: z.number().optional(),
  exclusiveMinimum: z.boolean().optional(),
  maxLength: z.number().optional(),
  minLength: z.number().optional(),
  pattern: z.string().optional(),
  maxItems: z.number().optional(),
  minItems: z.number().optional(),
  uniqueItems: z.boolean().optional(),
  maxProperties: z.number().optional(),
  minProperties: z.number().optional(),
  required: z.array(z.string()).optional(),
  enum: z.array(z.unknown()).optional(),
  type: z.string().optional(),
  allOf: z.array(Reference).optional(),
  oneOf: z.array(Reference).optional(),
  anyOf: z.array(Reference).optional(),
  not: Reference.optional(),
  additionalProperties: z.unknown().optional(),
  description: z.string().optional(),
  format: z.string().optional(),
  default: z.unknown().optional(),
  nullable: z.boolean().optional(),
  discriminator: Reference.optional(),
  readOnly: z.boolean().optional(),
  writeOnly: z.boolean().optional(),
  xml: z.object({
    name: z.string().optional(),
    wrapped: z.boolean().optional(),
  }).optional(),
  externalDocs: Reference.optional(),
  example: z.unknown().optional(),
  deprecated: z.boolean().optional(),
});

export const SchemaProperties: z.ZodType<
  z.infer<typeof BaseSchemaProperties> & {
    properties?: Record<string, z.infer<typeof SchemaProperties>>;
    items?: z.infer<typeof SchemaProperties>;
  }
> = BaseSchemaProperties.extend({
  properties: z.lazy(() => z.record(SchemaProperties).optional()),
  items: z.lazy(() => SchemaProperties.optional()),
});

const ServerVariable = z.object({
  default: z.string(),
  description: z.string().optional(),
  enum: z.array(z.string()).optional(),
});

const Server = z.object({
  url: z.string().url(),
  description: z.string().optional(),
  variables: z.record(ServerVariable).optional(),
});

const Parameter = z.object({
  $ref: z.string().optional(),
  name: z.string(),
  in: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  deprecated: z.boolean().optional(),
  allowEmptyValue: z.boolean().optional(),
  style: z.string().optional(),
  explode: z.boolean().optional(),
  allowReserved: z.boolean().optional(),
  schema: Reference.optional(),
});

const ResponseHeader = z.object({
  $ref: z.string().optional(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  deprecated: z.boolean().optional(),
  allowEmptyValue: z.boolean().optional(),
  style: z.string().optional(),
  explode: z.boolean().optional(),
  allowReserved: z.boolean().optional(),
  schema: Reference.optional(),
});

const Response = z.object({
  $ref: z.string().optional(),
  description: z.string(),
  headers: z.record(ResponseHeader).optional(),
  content: z.record(z.object({
    $ref: z.string().optional(),
    name: z.string().optional(),
    in: z.string().optional(),
    description: z.string().optional(),
    required: z.boolean().optional(),
    deprecated: z.boolean().optional(),
    allowEmptyValue: z.boolean().optional(),
    style: z.string().optional(),
    explode: z.boolean().optional(),
    allowReserved: z.boolean().optional(),
    schema: Reference.optional(),
  })).optional(),
});

export const PathItem = z.object({
  $ref: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  get: z.object({
    summary: z.string().optional(),
    description: z.string().optional(),
    operationId: z.string().optional(),
    parameters: z.array(Parameter).optional(),
    responses: z.record(Response).optional(),
  }).optional(),
  post: z.object({
    summary: z.string().optional(),
    description: z.string().optional(),
    operationId: z.string().optional(),
    parameters: z.array(Parameter).optional(),
    requestBody: z.object({
      $ref: z.string().optional(),
      description: z.string().optional(),
      required: z.boolean().optional(),
      content: z.record(z.object({
        'application/json': z.object({
          schema: Reference.optional(),
        }).optional(),
        // Add other media types as needed
      })).optional(),
    }).optional(),
    responses: z.record(Response).optional(),
  }).optional(),
  put: z.object({
    summary: z.string().optional(),
    description: z.string().optional(),
    operationId: z.string().optional(),
    parameters: z.array(Parameter).optional(),
    requestBody: z.object({
      $ref: z.string().optional(),
      description: z.string().optional(),
      required: z.boolean().optional(),
      content: z.record(z.object({
        'application/json': z.object({
          schema: Reference.optional(),
        }).optional(),
        // Add other media types as needed
      })).optional(),
    }).optional(),
    responses: z.record(Response).optional(),
  }).optional(),
  patch: z.object({
    summary: z.string().optional(),
    description: z.string().optional(),
    operationId: z.string().optional(),
    parameters: z.array(Parameter).optional(),
    requestBody: z.object({
      $ref: z.string().optional(),
      description: z.string().optional(),
      required: z.boolean().optional(),
      content: z.record(z.object({
        'application/json': z.object({
          schema: Reference.optional(),
        }).optional(),
        // Add other media types as needed
      })).optional(),
    }).optional(),
    responses: z.record(Response).optional(),
  }).optional(),
  delete: z.object({
    summary: z.string().optional(),
    description: z.string().optional(),
    operationId: z.string().optional(),
    parameters: z.array(Parameter).optional(),
    requestBody: z.object({
      $ref: z.string().optional(),
      description: z.string().optional(),
      required: z.boolean().optional(),
      content: z.record(z.object({
        'application/json': z.object({
          schema: Reference.optional(),
        }).optional(),
        // Add other media types as needed
      })).optional(),
    }).optional(),
    responses: z.record(Response).optional(),
  }).optional(),
});

const Info = z.object({
  title: z.string(),
  version: z.string(),
  description: z.string().optional(),
  termsOfService: z.string().url().optional(),
  contact: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    url: z.string().url().optional(),
  }).optional(),
  license: z.object({
    name: z.string(),
    url: z.string().url().optional(),
  }).optional(),
});

const SecurityRequirement = z.record(z.array(z.string()));

const Tag = z.object({
  name: z.string(),
  description: z.string().optional(),
  externalDocs: Reference.optional(),
});

const ExternalDocumentation = z.object({
  description: z.string().optional(),
  url: z.string().url(),
});

export const OpenApiSpec = z.object({
  openapi: z.string().refine(version => version.startsWith('3.'), {
    message: 'OpenAPI version must start with "3."',
  }),
  info: Info,
  servers: z.array(Server).optional(),
  paths: z.record(PathItem),
  components: z.object({
    schemas: z.record(SchemaProperties).optional(),
    responses: z.record(Response).optional(),
    parameters: z.record(Parameter).optional(),
    examples: z.record(Reference).optional(),
    requestBodies: z.record(
      z.object({
        $ref: z.string().optional(),
        description: z.string().optional(),
        content: z.record(z.object({
          'application/json': z.object({
            schema: Reference.optional(),
          }).optional(),
          // Add other media types as needed
        })).optional(),
      })
    ).optional(),
    headers: z.record(ResponseHeader).optional(),
    securitySchemes: z.record(Reference).optional(),
    links: z.record(Reference).optional(),
    callbacks: z.record(Reference).optional(),
  }).optional(),
  security: z.array(SecurityRequirement).optional(),
  tags: z.array(Tag).optional(),
  externalDocs: ExternalDocumentation.optional(),
});
