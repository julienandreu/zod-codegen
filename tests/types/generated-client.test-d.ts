import { describe, expectTypeOf, it } from 'vitest';
import type PetAPI from '../fixtures/error-schema/api';
import type { EchoResponse, GetInventoryResponse, ListPetsResponse, Pet } from '../fixtures/error-schema/api';

describe('generated client methods', () => {
  it('return the union of the declared success types', () => {
    expectTypeOf<ReturnType<PetAPI['getPet']>>().toEqualTypeOf<Promise<Pet>>();
    expectTypeOf<ReturnType<PetAPI['createPet']>>().toEqualTypeOf<Promise<Pet | undefined>>();
    expectTypeOf<ReturnType<PetAPI['deletePet']>>().toEqualTypeOf<Promise<void>>();
    expectTypeOf<ReturnType<PetAPI['petExists_head']>>().toEqualTypeOf<Promise<void>>();
    expectTypeOf<ReturnType<PetAPI['getPetStatus']>>().toEqualTypeOf<Promise<string>>();
  });

  it('name inline success responses after the operation', () => {
    expectTypeOf<ReturnType<PetAPI['listPets']>>().toEqualTypeOf<Promise<ListPetsResponse>>();
    expectTypeOf<ListPetsResponse>().toEqualTypeOf<Pet[]>();
    expectTypeOf<ReturnType<PetAPI['getInventory']>>().toEqualTypeOf<Promise<GetInventoryResponse>>();
    expectTypeOf<ReturnType<PetAPI['echo']>>().toEqualTypeOf<Promise<EchoResponse>>();
    expectTypeOf<EchoResponse>().toEqualTypeOf<{ ok: boolean }>();
  });
});
