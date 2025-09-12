import {SarisAPIMetro} from './type';

const client = new SarisAPIMetro('https://api.saris.io', undefined);

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
