import axios, { type AxiosResponse } from 'axios';
import { z } from 'zod';

const Category = z.object({
  id: z.number().int().optional(),
  name: z.string().optional(),
  sub: z.object({
    prop1: z.string().optional(),
  }).optional(),
});

const Pet = z.object({
  id: z.number().int().optional(),
  category: Category.optional(),
  name: z.string(),
  photoUrls: z.array(z.string().url()).max(20),
});

const defaultBaseUrl = 'https://petstore.swagger.io/v2';

export class SwaggerPetstore {
  #baseUrl: string;

  constructor(baseUrl: string = defaultBaseUrl) {
    this.#baseUrl = baseUrl;
  }

  async #makeApiRequest<T>(
    method: string,
    path: string,
    data?: unknown
  ): Promise<AxiosResponse<T>> {
    return axios<T>({
      method,
      url: `${this.#baseUrl}${path}`,
      data,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async addPet(data: z.infer<typeof Pet>): Promise<AxiosResponse<z.infer<typeof Pet>>> {
    const safeData = Pet.parse(data);

    const response = await this.#makeApiRequest<z.infer<typeof Pet>>('post', '/pet', safeData);

    const safeResponseData = Pet.parse(response.data);

    return {
      ...response,
      data: safeResponseData,
    };
  }
}
