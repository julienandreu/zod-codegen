// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.
// Built with zod-codegen@0.1.0-alpha.1
// Latest edit: Sat, 06 Jan 2024 07:34:56 GMT
// Source file: ./samples/swagger-petstore.yaml
// API: Swagger Petstore - OpenAPI 3.0 v1.0.11

// Imports
import axios, { type AxiosResponse } from 'axios';
import z from 'zod';

// Components schemas
export const Order = z.object({
  id: z.number().int().optional(),
  petId: z.number().int().optional(),
  quantity: z.number().int().optional(),
  shipDate: z.string().optional(),
  status: z.string().optional(),
  complete: z.boolean().optional()
});
export const Address = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional()
});
export const Customer = z.object({
  id: z.number().int().optional(),
  username: z.string().optional(),
  address: z.array(Address).optional()
});
export const Category = z.object({
  id: z.number().int().optional(),
  name: z.string().optional()
});
export const User = z.object({
  id: z.number().int().optional(),
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
  phone: z.string().optional(),
  userStatus: z.number().int().optional()
});
export const Tag = z.object({
  id: z.number().int().optional(),
  name: z.string().optional()
});
export const Pet = z.object({
  id: z.number().int().optional(),
  name: z.string(),
  category: Category,
  photoUrls: z.array(z.string()),
  tags: z.array(Tag).optional(),
  status: z.string().optional()
});
export const ApiResponse = z.object({
  code: z.number().int().optional(),
  type: z.string().optional(),
  message: z.string().optional()
});
const FindPetsByStatusResponse = z.array(Pet);
const FindPetsByTagsResponse = z.array(Pet);
const GetInventoryResponse = z.object({});
const LoginUserResponse = z.string();

// Default base URL
const defaultBaseUrl = 'https://petstore3.swagger.io/api/v3';

// Client class
export class SwaggerPetstoreOpenAPI30 {
  readonly #baseUrl: string;
  constructor(baseUrl: string = defaultBaseUrl) {
    this.#baseUrl = baseUrl;
  }
  async #makeApiRequest<T>(method: string, path: string, data?: unknown): Promise<AxiosResponse<T>> {
    return axios<T>({
      method,
      url: `${this.#baseUrl}${path}`,
      data,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  async addPet(pet: z.infer<typeof Pet>): Promise<AxiosResponse<z.infer<typeof Pet>>> {
    const safeData = Pet.parse(pet);
    const response = await this.#makeApiRequest('post', '/pet', safeData);
    const safeResponseData = Pet.parse(response.data);
    return {
      ...response,
      data: safeResponseData
    };
  }
  async updatePet(pet: z.infer<typeof Pet>): Promise<AxiosResponse<z.infer<typeof Pet>>> {
    const safeData = Pet.parse(pet);
    const response = await this.#makeApiRequest('put', '/pet', safeData);
    const safeResponseData = Pet.parse(response.data);
    return {
      ...response,
      data: safeResponseData
    };
  }
  async findPetsByStatus(): Promise<AxiosResponse<z.infer<typeof FindPetsByStatusResponse>>> {
    const response = await this.#makeApiRequest('get', '/pet/findByStatus');
    const safeResponseData = FindPetsByStatusResponse.parse(response.data);
    return {
      ...response,
      data: safeResponseData
    };
  }
  async findPetsByTags(): Promise<AxiosResponse<z.infer<typeof FindPetsByTagsResponse>>> {
    const response = await this.#makeApiRequest('get', '/pet/findByTags');
    const safeResponseData = FindPetsByTagsResponse.parse(response.data);
    return {
      ...response,
      data: safeResponseData
    };
  }
  async getPetById(): Promise<AxiosResponse<z.infer<typeof Pet>>> {
    const response = await this.#makeApiRequest('get', '/pet/{petId}');
    const safeResponseData = Pet.parse(response.data);
    return {
      ...response,
      data: safeResponseData
    };
  }
  async updatePetWithForm() {
    const response = await this.#makeApiRequest('post', '/pet/{petId}');
    return response;
  }
  async deletePet() {
    const response = await this.#makeApiRequest('delete', '/pet/{petId}');
    return response;
  }
  async uploadFile(): Promise<AxiosResponse<z.infer<typeof ApiResponse>>> {
    const response = await this.#makeApiRequest('post', '/pet/{petId}/uploadImage');
    const safeResponseData = ApiResponse.parse(response.data);
    return {
      ...response,
      data: safeResponseData
    };
  }
  async getInventory(): Promise<AxiosResponse<z.infer<typeof GetInventoryResponse>>> {
    const response = await this.#makeApiRequest('get', '/store/inventory');
    const safeResponseData = GetInventoryResponse.parse(response.data);
    return {
      ...response,
      data: safeResponseData
    };
  }
  async placeOrder(order: z.infer<typeof Order>): Promise<AxiosResponse<z.infer<typeof Order>>> {
    const safeData = Order.parse(order);
    const response = await this.#makeApiRequest('post', '/store/order', safeData);
    const safeResponseData = Order.parse(response.data);
    return {
      ...response,
      data: safeResponseData
    };
  }
  async getOrderById(): Promise<AxiosResponse<z.infer<typeof Order>>> {
    const response = await this.#makeApiRequest('get', '/store/order/{orderId}');
    const safeResponseData = Order.parse(response.data);
    return {
      ...response,
      data: safeResponseData
    };
  }
  async deleteOrder() {
    const response = await this.#makeApiRequest('delete', '/store/order/{orderId}');
    return response;
  }
  async createUser(user: z.infer<typeof User>) {
    const safeData = User.parse(user);
    const response = await this.#makeApiRequest('post', '/user', safeData);
    return response;
  }
  async createUsersWithListInput(): Promise<AxiosResponse<z.infer<typeof User>>> {
    const response = await this.#makeApiRequest('post', '/user/createWithList');
    const safeResponseData = User.parse(response.data);
    return {
      ...response,
      data: safeResponseData
    };
  }
  async loginUser(): Promise<AxiosResponse<z.infer<typeof LoginUserResponse>>> {
    const response = await this.#makeApiRequest('get', '/user/login');
    const safeResponseData = LoginUserResponse.parse(response.data);
    return {
      ...response,
      data: safeResponseData
    };
  }
  async logoutUser() {
    const response = await this.#makeApiRequest('get', '/user/logout');
    return response;
  }
  async getUserByName(): Promise<AxiosResponse<z.infer<typeof User>>> {
    const response = await this.#makeApiRequest('get', '/user/{username}');
    const safeResponseData = User.parse(response.data);
    return {
      ...response,
      data: safeResponseData
    };
  }
  async updateUser(user: z.infer<typeof User>) {
    const safeData = User.parse(user);
    const response = await this.#makeApiRequest('put', '/user/{username}', safeData);
    return response;
  }
  async deleteUser() {
    const response = await this.#makeApiRequest('delete', '/user/{username}');
    return response;
  }
}
