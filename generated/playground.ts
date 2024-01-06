import {SwaggerPetstoreOpenAPI30} from './type';

const client = new SwaggerPetstoreOpenAPI30();

export async function test() {
  const {data: createdPet} = await client.addPet({
    name: 'PetTest',
    category: {
      id: 1,
      name: 'CategoryTest',
    },
    photoUrls: [],
  });
  console.log(createdPet);

  const {data: pet} = await client.getPetById(1);
  console.log(pet);
}
