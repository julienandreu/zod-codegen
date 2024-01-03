import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export class SwaggerPetstore {
  #baseUrl: string;

  constructor(baseUrl: string) {
    this.#baseUrl = baseUrl;
  }

  async #makeApiRequest<T>(
    method: string,
    path: string,
    data?: unknown
  ): Promise<AxiosResponse<T>> {
    const url = `${this.#baseUrl}${path}`;

    // Set up the Axios request configuration
    const config: AxiosRequestConfig = {
      method,
      url,
      data,
      headers: {
        'Content-Type': 'application/json', // Adjust based on your API's requirements
      },
    };

    return axios(config);
  }

  async createPet(data: unknown): Promise<AxiosResponse> {
    return this.#makeApiRequest('post', '/pet', data);
  }

  async getPetById(petId: number): Promise<AxiosResponse> {
    return this.#makeApiRequest('get', `/pet/${petId}`);
  }

  async updatePet(petId: number, data: unknown): Promise<AxiosResponse> {
    return this.#makeApiRequest('put', `/pet/${petId}`, data);
  }

  async deletePet(petId: number): Promise<AxiosResponse> {
    return this.#makeApiRequest('delete', `/pet/${petId}`);
  }

  async createUser(data: unknown): Promise<AxiosResponse> {
    return this.#makeApiRequest('post', '/user', data);
  }

  async getUserByUsername(username: string): Promise<AxiosResponse> {
    return this.#makeApiRequest('get', `/user/${username}`);
  }

  async updateUser(username: string, data: unknown): Promise<AxiosResponse> {
    return this.#makeApiRequest('put', `/user/${username}`, data);
  }

  async deleteUser(username: string): Promise<AxiosResponse> {
    return this.#makeApiRequest('delete', `/user/${username}`);
  }
}
