import {z} from 'zod';

export const Reference = z.object({
  $ref: z.string().optional(),
});

const BaseSchemaProperties = z.object({
  $ref: z.string().optional(),
  title: z.string().optional(),
  multipleOf: z.number().positive().optional(),
  maximum: z.number().optional(),
  exclusiveMaximum: z.boolean().optional(),
  minimum: z.number().optional(),
  exclusiveMinimum: z.boolean().optional(),
  maxLength: z.number().int().nonnegative().optional(),
  minLength: z.number().int().nonnegative().optional(),
  pattern: z.string().optional(),
  maxItems: z.number().int().nonnegative().optional(),
  minItems: z.number().int().nonnegative().optional(),
  uniqueItems: z.boolean().optional(),
  maxProperties: z.number().int().nonnegative().optional(),
  minProperties: z.number().int().nonnegative().optional(),
  required: z.array(z.string()).optional(),
  enum: z.array(z.unknown()).optional(),
  type: z.string().optional(),
  allOf: z.array(z.unknown()).optional(),
  oneOf: z.array(z.unknown()).optional(),
  anyOf: z.array(z.unknown()).optional(),
  not: z.unknown().optional(),
  additionalProperties: z.unknown().optional(),
  description: z.string().optional(),
  format: z.string().optional(),
  default: z.unknown().optional(),
  nullable: z.boolean().optional(),
  discriminator: Reference.optional(),
  readOnly: z.boolean().optional(),
  writeOnly: z.boolean().optional(),
  xml: z
    .object({
      name: z.string().optional(),
      wrapped: z.boolean().optional(),
    })
    .optional(),
  externalDocs: Reference.optional(),
  example: z.unknown().optional(),
  deprecated: z.boolean().optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SchemaProperties: z.ZodLazy<z.ZodObject<any>> = z.lazy(() =>
  BaseSchemaProperties.extend({
    properties: z.record(z.string(), SchemaProperties).optional(),
    items: SchemaProperties.optional(),
  }),
);

const ServerVariable = z.object({
  default: z.string(),
  description: z.string().optional(),
  enum: z.array(z.string()).optional(),
});

const Server = z.object({
  url: z.url(),
  description: z.string().optional(),
  variables: z.record(z.string(), ServerVariable).optional(),
});

export const Parameter = z.object({
  $ref: z.string().optional(),
  name: z.string(),
  in: z.enum(['query', 'header', 'path', 'cookie']),
  description: z.string().optional(),
  required: z.boolean().optional(),
  deprecated: z.boolean().optional(),
  allowEmptyValue: z.boolean().optional(),
  style: z.string().optional(),
  explode: z.boolean().optional(),
  allowReserved: z.boolean().optional(),
  schema: SchemaProperties.optional(),
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

const MediaType = z.object({
  schema: z.unknown().optional(),
});

export const Response = z.object({
  $ref: z.string().optional(),
  description: z.string(),
  headers: z.record(z.string(), ResponseHeader).optional(),
  content: z.record(z.string(), MediaType).optional(),
});

export const RequestBody = z.object({
  $ref: z.string().optional(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  content: z.record(z.string(), MediaType).optional(),
});

export const MethodSchema = z.object({
  summary: z.string().optional(),
  description: z.string().optional(),
  operationId: z.string().optional(),
  parameters: z.array(Parameter).optional(),
  requestBody: RequestBody.optional(),
  responses: z.record(z.string(), Response).optional(),
  tags: z.array(z.string()).optional(),
  deprecated: z.boolean().optional(),
});

export const PathItem = z.object({
  $ref: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  get: MethodSchema.optional(),
  post: MethodSchema.optional(),
  put: MethodSchema.optional(),
  patch: MethodSchema.optional(),
  delete: MethodSchema.optional(),
  head: MethodSchema.optional(),
  options: MethodSchema.optional(),
  trace: MethodSchema.optional(),
  parameters: z.array(Parameter).optional(),
});

const Info = z.object({
  title: z.string().min(1),
  version: z.string().min(1),
  description: z.string().optional(),
  termsOfService: z.url().optional(),
  contact: z
    .object({
      name: z.string().optional(),
      email: z.email().optional(),
      url: z.url().optional(),
    })
    .optional(),
  license: z
    .object({
      name: z.string().min(1),
      url: z.url().optional(),
    })
    .optional(),
});

const SecurityRequirement = z.record(z.string(), z.array(z.string()));

const Tag = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  externalDocs: Reference.optional(),
});

const ExternalDocumentation = z.object({
  description: z.string().optional(),
  url: z.url(),
});

const Components = z.object({
  schemas: z.record(z.string(), SchemaProperties).optional(),
  responses: z.record(z.string(), Response).optional(),
  parameters: z.record(z.string(), Parameter).optional(),
  examples: z.record(z.string(), Reference).optional(),
  requestBodies: z.record(z.string(), RequestBody).optional(),
  headers: z.record(z.string(), ResponseHeader).optional(),
  securitySchemes: z.record(z.string(), Reference).optional(),
  links: z.record(z.string(), Reference).optional(),
  callbacks: z.record(z.string(), Reference).optional(),
});

export const OpenApiSpec = z.object({
  openapi: z.string().regex(/^3\.\d+\.\d+$/, 'OpenAPI version must be in format 3.x.x'),
  info: Info,
  servers: z.array(Server).optional(),
  paths: z.record(z.string(), PathItem),
  components: Components.optional(),
  security: z.array(SecurityRequirement).optional(),
  tags: z.array(Tag).optional(),
  externalDocs: ExternalDocumentation.optional(),
});

export type OpenApiSpecType = z.infer<typeof OpenApiSpec>;
export type SchemaPropertiesType = z.infer<typeof SchemaProperties>;
export type ParameterType = z.infer<typeof Parameter>;
export type ResponseType = z.infer<typeof Response>;
export type RequestBodyType = z.infer<typeof RequestBody>;
export type MethodSchemaType = z.infer<typeof MethodSchema>;
export type PathItemType = z.infer<typeof PathItem>;
export type ReferenceType = z.infer<typeof Reference>;
