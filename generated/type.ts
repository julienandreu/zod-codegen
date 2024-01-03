// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.
// Built with zod-codegen@0.1.0-alpha.1
// Latest edit: Wed, 03 Jan 2024 12:15:58 GMT
// Source file: ./samples/swagger-petstore.yaml
// API: $api.info.title v$api.info.version

{
  "openapi": "3.0.0",
  "info": {
    "title": "Swagger Petstore",
    "version": "1.0.0",
    "description": "This is a sample server Petstore server.\nYou can find out more about Swagger at\n[http://swagger.io](http://swagger.io) or on [irc.freenode.net, #swagger](http://swagger.io/irc/).\nFor this sample, you can use the api key `special-key` to test the authorization filters.\n\n# Introduction\nThis API is documented in **OpenAPI format** and is based on\n[Petstore sample](http://petstore.swagger.io/) provided by [swagger.io](http://swagger.io) team.\nIt was **extended** to illustrate features of [generator-openapi-repo](https://github.com/Rebilly/generator-openapi-repo)\ntool and [ReDoc](https://github.com/Redocly/redoc) documentation. In addition to standard\nOpenAPI syntax we use a few [vendor extensions](https://github.com/Redocly/redoc/blob/main/docs/redoc-vendor-extensions.md).\n\n# OpenAPI Specification\nThis API is documented in **OpenAPI format** and is based on\n[Petstore sample](http://petstore.swagger.io/) provided by [swagger.io](http://swagger.io) team.\nIt was **extended** to illustrate features of [generator-openapi-repo](https://github.com/Rebilly/generator-openapi-repo)\ntool and [ReDoc](https://github.com/Redocly/redoc) documentation. In addition to standard\nOpenAPI syntax we use a few [vendor extensions](https://github.com/Redocly/redoc/blob/main/docs/redoc-vendor-extensions.md).\n\n# Cross-Origin Resource Sharing\nThis API features Cross-Origin Resource Sharing (CORS) implemented in compliance with  [W3C spec](https://www.w3.org/TR/cors/).\nAnd that allows cross-domain communication from the browser.\nAll responses have a wildcard same-origin which makes them completely public and accessible to everyone, including any code on any site.\n\n# Authentication\n\nPetstore offers two forms of authentication:\n  - API Key\n  - OAuth2\nOAuth2 - an open protocol to allow secure authorization in a simple\nand standard method from web, mobile and desktop applications.\n\n<SecurityDefinitions />\n",
    "termsOfService": "http://swagger.io/terms/",
    "contact": {
      "name": "API Support",
      "email": "apiteam@swagger.io",
      "url": "https://github.com/Redocly/redoc"
    },
    "license": {
      "name": "Apache 2.0",
      "url": "http://www.apache.org/licenses/LICENSE-2.0.html"
    }
  },
  "servers": [
    {
      "url": "https://petstore.swagger.io/v2",
      "description": "Default server"
    },
    {
      "url": "https://petstore.swagger.io/sandbox",
      "description": "Sandbox server"
    }
  ],
  "paths": {
    "/pet": {
      "post": {
        "summary": "Add a new pet to the store",
        "description": "Add new pet to the store inventory.",
        "operationId": "addPet",
        "requestBody": {
          "$ref": "#/components/requestBodies/Pet"
        },
        "responses": {
          "405": {
            "description": "Invalid input"
          }
        }
      },
      "put": {
        "summary": "Update an existing pet",
        "description": "",
        "operationId": "updatePet",
        "requestBody": {
          "$ref": "#/components/requestBodies/Pet"
        },
        "responses": {
          "400": {
            "description": "Invalid ID supplied"
          },
          "404": {
            "description": "Pet not found"
          },
          "405": {
            "description": "Validation exception"
          }
        }
      }
    },
    "/pet/{petId}": {
      "get": {
        "summary": "Find pet by ID",
        "description": "Returns a single pet",
        "operationId": "getPetById",
        "parameters": [
          {
            "name": "petId",
            "in": "path",
            "description": "ID of pet to return",
            "required": true,
            "deprecated": true,
            "schema": {}
          }
        ],
        "responses": {
          "200": {
            "description": "successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Pet"
                }
              },
              "application/xml": {
                "schema": {
                  "$ref": "#/components/schemas/Pet"
                }
              }
            }
          },
          "400": {
            "description": "Invalid ID supplied"
          },
          "404": {
            "description": "Pet not found"
          }
        }
      },
      "post": {
        "summary": "Updates a pet in the store with form data",
        "description": "",
        "operationId": "updatePetWithForm",
        "parameters": [
          {
            "name": "petId",
            "in": "path",
            "description": "ID of pet that needs to be updated",
            "required": true,
            "schema": {}
          }
        ],
        "requestBody": {
          "content": {
            "application/x-www-form-urlencoded": {}
          }
        },
        "responses": {
          "405": {
            "description": "Invalid input"
          }
        }
      },
      "delete": {
        "summary": "Deletes a pet",
        "description": "",
        "operationId": "deletePet",
        "parameters": [
          {
            "name": "api_key",
            "in": "header",
            "required": false,
            "schema": {}
          },
          {
            "name": "petId",
            "in": "path",
            "description": "Pet id to delete",
            "required": true,
            "schema": {}
          }
        ],
        "responses": {
          "400": {
            "description": "Invalid pet value"
          }
        }
      }
    },
    "/pet/{petId}/uploadImage": {
      "post": {
        "summary": "uploads an image",
        "description": "",
        "operationId": "uploadFile",
        "parameters": [
          {
            "name": "petId",
            "in": "path",
            "description": "ID of pet to update",
            "required": true,
            "schema": {}
          }
        ],
        "requestBody": {
          "content": {
            "application/octet-stream": {}
          }
        },
        "responses": {
          "200": {
            "description": "successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiResponse"
                }
              }
            }
          }
        }
      }
    },
    "/pet/findByStatus": {
      "get": {
        "summary": "Finds Pets by status",
        "description": "Multiple status values can be provided with comma separated strings",
        "operationId": "findPetsByStatus",
        "parameters": [
          {
            "name": "status",
            "in": "query",
            "description": "Status values that need to be considered for filter",
            "required": true,
            "style": "form",
            "schema": {}
          }
        ],
        "responses": {
          "200": {
            "description": "successful operation",
            "content": {
              "application/json": {
                "schema": {}
              },
              "application/xml": {
                "schema": {}
              }
            }
          },
          "400": {
            "description": "Invalid status value"
          }
        }
      }
    },
    "/pet/findByTags": {
      "get": {
        "summary": "Finds Pets by tags",
        "description": "Multiple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing.",
        "operationId": "findPetsByTags",
        "parameters": [
          {
            "name": "tags",
            "in": "query",
            "description": "Tags to filter by",
            "required": true,
            "style": "form",
            "schema": {}
          }
        ],
        "responses": {
          "200": {
            "description": "successful operation",
            "content": {
              "application/json": {
                "schema": {}
              },
              "application/xml": {
                "schema": {}
              }
            }
          },
          "400": {
            "description": "Invalid tag value"
          }
        }
      }
    },
    "/store/inventory": {
      "get": {
        "summary": "Returns pet inventories by status",
        "description": "Returns a map of status codes to quantities",
        "operationId": "getInventory",
        "responses": {
          "200": {
            "description": "successful operation",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          }
        }
      }
    },
    "/store/order": {
      "post": {
        "summary": "Place an order for a pet",
        "description": "",
        "operationId": "placeOrder",
        "requestBody": {
          "description": "order placed for purchasing the pet",
          "required": true,
          "content": {
            "application/json": {}
          }
        },
        "responses": {
          "200": {
            "description": "successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Order"
                }
              },
              "application/xml": {
                "schema": {
                  "$ref": "#/components/schemas/Order"
                }
              }
            }
          },
          "400": {
            "description": "Invalid Order",
            "content": {
              "application/json": {}
            }
          }
        }
      }
    },
    "/store/order/{orderId}": {
      "get": {
        "summary": "Find purchase order by ID",
        "description": "For valid response try integer IDs with value <= 5 or > 10. Other values will generated exceptions",
        "operationId": "getOrderById",
        "parameters": [
          {
            "name": "orderId",
            "in": "path",
            "description": "ID of pet that needs to be fetched",
            "required": true,
            "schema": {}
          }
        ],
        "responses": {
          "200": {
            "description": "successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Order"
                }
              },
              "application/xml": {
                "schema": {
                  "$ref": "#/components/schemas/Order"
                }
              }
            }
          },
          "400": {
            "description": "Invalid ID supplied"
          },
          "404": {
            "description": "Order not found"
          }
        }
      },
      "delete": {
        "summary": "Delete purchase order by ID",
        "description": "For valid response try integer IDs with value < 1000. Anything above 1000 or nonintegers will generate API errors",
        "operationId": "deleteOrder",
        "parameters": [
          {
            "name": "orderId",
            "in": "path",
            "description": "ID of the order that needs to be deleted",
            "required": true,
            "schema": {}
          }
        ],
        "responses": {
          "400": {
            "description": "Invalid ID supplied"
          },
          "404": {
            "description": "Order not found"
          }
        }
      }
    },
    "/store/subscribe": {
      "post": {
        "summary": "Subscribe to the Store events",
        "description": "Add subscription for a store events",
        "requestBody": {
          "content": {
            "application/json": {}
          }
        },
        "responses": {
          "201": {
            "description": "Subscription added",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          }
        }
      }
    },
    "/user": {
      "post": {
        "summary": "Create user",
        "description": "This can only be done by the logged in user.",
        "operationId": "createUser",
        "requestBody": {
          "description": "Created user object",
          "required": true,
          "content": {
            "application/json": {}
          }
        },
        "responses": {
          "default": {
            "description": "successful operation"
          }
        }
      }
    },
    "/user/{username}": {
      "get": {
        "summary": "Get user by user name",
        "description": "",
        "operationId": "getUserByName",
        "parameters": [
          {
            "name": "username",
            "in": "path",
            "description": "The name that needs to be fetched. Use user1 for testing. ",
            "required": true,
            "schema": {}
          }
        ],
        "responses": {
          "200": {
            "description": "successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/User"
                }
              },
              "application/xml": {
                "schema": {
                  "$ref": "#/components/schemas/User"
                }
              }
            }
          },
          "400": {
            "description": "Invalid username supplied"
          },
          "404": {
            "description": "User not found"
          }
        }
      },
      "put": {
        "summary": "Updated user",
        "description": "This can only be done by the logged in user.",
        "operationId": "updateUser",
        "parameters": [
          {
            "name": "username",
            "in": "path",
            "description": "name that need to be deleted",
            "required": true,
            "schema": {}
          }
        ],
        "requestBody": {
          "description": "Updated user object",
          "required": true,
          "content": {
            "application/json": {}
          }
        },
        "responses": {
          "400": {
            "description": "Invalid user supplied"
          },
          "404": {
            "description": "User not found"
          }
        }
      },
      "delete": {
        "summary": "Delete user",
        "description": "This can only be done by the logged in user.",
        "operationId": "deleteUser",
        "parameters": [
          {
            "name": "username",
            "in": "path",
            "description": "The name that needs to be deleted",
            "required": true,
            "schema": {}
          }
        ],
        "responses": {
          "400": {
            "description": "Invalid username supplied"
          },
          "404": {
            "description": "User not found"
          }
        }
      }
    },
    "/user/createWithArray": {
      "post": {
        "summary": "Creates list of users with given input array",
        "description": "",
        "operationId": "createUsersWithArrayInput",
        "requestBody": {
          "$ref": "#/components/requestBodies/UserArray"
        },
        "responses": {
          "default": {
            "description": "successful operation"
          }
        }
      }
    },
    "/user/createWithList": {
      "post": {
        "summary": "Creates list of users with given input array",
        "description": "",
        "operationId": "createUsersWithListInput",
        "requestBody": {
          "$ref": "#/components/requestBodies/UserArray"
        },
        "responses": {
          "default": {
            "description": "successful operation"
          }
        }
      }
    },
    "/user/login": {
      "get": {
        "summary": "Logs user into the system",
        "description": "",
        "operationId": "loginUser",
        "parameters": [
          {
            "name": "username",
            "in": "query",
            "description": "The user name for login",
            "required": true,
            "schema": {}
          },
          {
            "name": "password",
            "in": "query",
            "description": "The password for login in clear text",
            "required": true,
            "schema": {}
          }
        ],
        "responses": {
          "200": {
            "description": "successful operation",
            "headers": {
              "X-Rate-Limit": {
                "description": "calls per hour allowed by the user",
                "schema": {}
              },
              "X-Expires-After": {
                "description": "date in UTC when token expires",
                "schema": {}
              }
            },
            "content": {
              "application/json": {
                "schema": {}
              },
              "application/xml": {
                "schema": {}
              },
              "text/plain": {}
            }
          },
          "400": {
            "description": "Invalid username/password supplied"
          }
        }
      }
    },
    "/user/logout": {
      "get": {
        "summary": "Logs out current logged in user session",
        "description": "",
        "operationId": "logoutUser",
        "responses": {
          "default": {
            "description": "successful operation"
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "ApiResponse": {
        "type": "object",
        "properties": {}
      },
      "Cat": {
        "allOf": [
          {
            "$ref": "#/components/schemas/Pet"
          },
          {}
        ],
        "description": "A representation of a cat"
      },
      "Category": {
        "type": "object",
        "properties": {},
        "xml": {}
      },
      "Dog": {
        "allOf": [
          {
            "$ref": "#/components/schemas/Pet"
          },
          {}
        ],
        "description": "A representation of a dog"
      },
      "HoneyBee": {
        "allOf": [
          {
            "$ref": "#/components/schemas/Pet"
          },
          {}
        ],
        "description": "A representation of a honey bee"
      },
      "Id": {
        "type": "integer",
        "format": "int64",
        "readOnly": true
      },
      "Order": {
        "type": "object",
        "properties": {},
        "xml": {}
      },
      "Pet": {
        "required": [
          "name",
          "photoUrls"
        ],
        "type": "object",
        "properties": {},
        "discriminator": {},
        "xml": {}
      },
      "Tag": {
        "type": "object",
        "properties": {},
        "xml": {}
      },
      "User": {
        "type": "object",
        "properties": {},
        "xml": {}
      }
    },
    "examples": {
      "Order": {}
    },
    "requestBodies": {
      "Pet": {
        "description": "Pet object that needs to be added to the store",
        "content": {
          "application/json": {},
          "application/xml": {}
        }
      },
      "UserArray": {
        "description": "List of user object",
        "content": {
          "application/json": {}
        }
      }
    },
    "securitySchemes": {
      "petstore_auth": {},
      "api_key": {}
    }
  },
  "tags": [
    {
      "name": "pet",
      "description": "Everything about your Pets"
    },
    {
      "name": "store",
      "description": "Access to Petstore orders"
    },
    {
      "name": "user",
      "description": "Operations about user"
    },
    {
      "name": "pet_model",
      "description": "<SchemaDefinition schemaRef=\"#/components/schemas/Pet\" />\n"
    },
    {
      "name": "store_model",
      "description": "<SchemaDefinition schemaRef=\"#/components/schemas/Order\" exampleRef=\"#/components/examples/Order\" showReadOnly={true} showWriteOnly={true} />\n"
    }
  ],
  "externalDocs": {
    "description": "Find out how to create Github repo for your OpenAPI spec.",
    "url": "https://github.com/Rebilly/generator-openapi-repo"
  }
}