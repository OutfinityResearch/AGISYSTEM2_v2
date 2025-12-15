/**
 * Suite 01 - Basic Facts and Queries
 *
 * Tests multi-step reasoning with deep taxonomic hierarchies.
 * All prove actions require 3-6 transitive steps.
 *
 * REASONING DEPTHS:
 * - Minimum proof steps: 3
 * - Maximum proof steps: 6
 * - Target average: 4-5
 */

export const name = 'Basic Facts and Queries';
export const description = 'Multi-step reasoning with deep taxonomic hierarchies';

export const theories = [
  '00-types.sys2',
  '05-logic.sys2'
];

export const steps = [
  // === PHASE 1: Build 6-level animal hierarchy ===
  // Entity -> LivingThing -> Animal -> Mammal -> Canine -> Dog
  {
    action: 'learn',
    input_nl: 'Build deep animal taxonomy: Entity > LivingThing > Animal > Mammal > Canine > Dog',
    input_dsl: `
      isA LivingThing Entity
      isA Animal LivingThing
      isA Mammal Animal
      isA Canine Mammal
      isA Feline Mammal
      isA Dog Canine
      isA Cat Feline
    `,
    expected_nl: 'Learned 7 facts'
  },

  // === PHASE 2: Add instances at bottom of hierarchy ===
  {
    action: 'learn',
    input_nl: 'Rex is a dog. Whiskers is a cat.',
    input_dsl: `
      isA Rex Dog
      isA Whiskers Cat
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 3: Query direct fact (OK for queries) ===
  {
    action: 'query',
    input_nl: 'What is Rex?',
    input_dsl: '@q isA Rex ?what',
    expected_nl: 'Rex is a dog'
  },

  // === PHASE 4: Prove 3-step transitive ===
  // CHAIN: Rex -> Dog -> Canine -> Mammal (3 hops)
  {
    action: 'prove',
    input_nl: 'Is Rex a mammal?',
    input_dsl: '@goal isA Rex Mammal',
    expected_nl: 'True: Rex is a mammal. Proof: Rex is a dog. Dog is a canine. Canine is a mammal.'
  },

  // === PHASE 5: Prove 4-step transitive ===
  // CHAIN: Rex -> Dog -> Canine -> Mammal -> Animal (4 hops)
  {
    action: 'prove',
    input_nl: 'Is Rex an animal?',
    input_dsl: '@goal isA Rex Animal',
    expected_nl: 'True: Rex is an animal. Proof: Rex is a dog. Dog is a canine. Canine is a mammal. Mammal is an animal.'
  },

  // === PHASE 6: Prove 5-step transitive ===
  // CHAIN: Rex -> Dog -> Canine -> Mammal -> Animal -> LivingThing (5 hops)
  {
    action: 'prove',
    input_nl: 'Is Rex a living thing?',
    input_dsl: '@goal isA Rex LivingThing',
    expected_nl: 'True: Rex is a livingthing. Proof: Rex is a dog. Dog is a canine. Canine is a mammal. Mammal is an animal. Animal is a livingthing.'
  },

  // === PHASE 7: Prove 6-step transitive (max depth) ===
  // CHAIN: Rex -> Dog -> Canine -> Mammal -> Animal -> LivingThing -> Entity (6 hops)
  {
    action: 'prove',
    input_nl: 'Is Rex an entity?',
    input_dsl: '@goal isA Rex Entity',
    expected_nl: 'True: Rex is an entity. Proof: Rex is a dog. Dog is a canine. Canine is a mammal. Mammal is an animal. Animal is a livingthing. LivingThing is an entity.'
  },

  // === PHASE 8: Build 6-level location hierarchy ===
  // Earth -> Continent -> Country -> Region -> City -> Landmark
  {
    action: 'learn',
    input_nl: 'Build deep location hierarchy',
    input_dsl: `
      locatedIn Europe Earth
      locatedIn France Europe
      locatedIn IleDeFrance France
      locatedIn Paris IleDeFrance
      locatedIn Montmartre Paris
      locatedIn SacreCoeur Montmartre
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === PHASE 9: Query location (direct) ===
  {
    action: 'query',
    input_nl: 'Where is Sacre Coeur?',
    input_dsl: '@q locatedIn SacreCoeur ?where',
    expected_nl: 'SacreCoeur is in Montmartre'
  },

  // === PHASE 10: Prove 3-step location ===
  // CHAIN: SacreCoeur -> Montmartre -> Paris -> IleDeFrance (3 hops)
  {
    action: 'prove',
    input_nl: 'Is Sacre Coeur in Ile-de-France?',
    input_dsl: '@goal locatedIn SacreCoeur IleDeFrance',
    expected_nl: 'True: SacreCoeur is in IleDeFrance. Proof: SacreCoeur is in Montmartre. Montmartre is in Paris. Paris is in IleDeFrance.'
  },

  // === PHASE 11: Prove 4-step location ===
  // CHAIN: SacreCoeur -> Montmartre -> Paris -> IleDeFrance -> France (4 hops)
  {
    action: 'prove',
    input_nl: 'Is Sacre Coeur in France?',
    input_dsl: '@goal locatedIn SacreCoeur France',
    expected_nl: 'True: SacreCoeur is in France. Proof: SacreCoeur is in Montmartre. Montmartre is in Paris. Paris is in IleDeFrance. IleDeFrance is in France.'
  },

  // === PHASE 12: Prove 5-step location ===
  // CHAIN: SacreCoeur -> Montmartre -> Paris -> IleDeFrance -> France -> Europe (5 hops)
  {
    action: 'prove',
    input_nl: 'Is Sacre Coeur in Europe?',
    input_dsl: '@goal locatedIn SacreCoeur Europe',
    expected_nl: 'True: SacreCoeur is in Europe. Proof: SacreCoeur is in Montmartre. Montmartre is in Paris. Paris is in IleDeFrance. IleDeFrance is in France. France is in Europe.'
  },

  // === PHASE 13: Prove 6-step location (max depth) ===
  // CHAIN: SacreCoeur -> ... -> Earth (6 hops)
  {
    action: 'prove',
    input_nl: 'Is Sacre Coeur on Earth?',
    input_dsl: '@goal locatedIn SacreCoeur Earth',
    expected_nl: 'True: SacreCoeur is in Earth. Proof: SacreCoeur is in Montmartre. Montmartre is in Paris. Paris is in IleDeFrance. IleDeFrance is in France. France is in Europe. Europe is in Earth.'
  },

  // === PHASE 14: Build role hierarchy with rules ===
  {
    action: 'learn',
    input_nl: 'Person > Professional > Educator > Teacher. Teachers educate students.',
    input_dsl: `
      isA Professional Person
      isA Educator Professional
      isA Teacher Educator
      isA Mary Teacher
      @eduCond isA Mary Teacher
      @eduConc educates Mary Students
      @eduRule Implies $eduCond $eduConc
    `,
    expected_nl: 'Learned 7 facts'
  },

  // === PHASE 15: Prove 3-step role hierarchy ===
  // CHAIN: Mary -> Teacher -> Educator -> Professional (3 hops)
  {
    action: 'prove',
    input_nl: 'Is Mary a professional?',
    input_dsl: '@goal isA Mary Professional',
    expected_nl: 'True: Mary is a professional. Proof: Mary is a teacher. Teacher is an educator. Educator is a professional.'
  },

  // === PHASE 16: Prove 4-step role hierarchy ===
  // CHAIN: Mary -> Teacher -> Educator -> Professional -> Person (4 hops)
  {
    action: 'prove',
    input_nl: 'Is Mary a person?',
    input_dsl: '@goal isA Mary Person',
    expected_nl: 'True: Mary is a person. Proof: Mary is a teacher. Teacher is an educator. Educator is a professional. Professional is a person.'
  },

  // === PHASE 17: Prove via rule chain ===
  // CHAIN: Mary is Teacher + rule => Mary educates Students
  {
    action: 'prove',
    input_nl: 'Does Mary educate students?',
    input_dsl: '@goal educates Mary Students',
    expected_nl: 'True: Mary educates Students'
  },

  // === PHASE 18: Cross-branch negative proof ===
  // Whiskers -> Feline -> Mammal (not Canine branch)
  {
    action: 'prove',
    input_nl: 'Is Whiskers a canine?',
    input_dsl: '@goal isA Whiskers Canine',
    expected_nl: 'Cannot prove: Whiskers is a canine'
  },

  // === PHASE 19: Prove different branch 4-step ===
  // CHAIN: Whiskers -> Cat -> Feline -> Mammal -> Animal (4 hops)
  {
    action: 'prove',
    input_nl: 'Is Whiskers an animal?',
    input_dsl: '@goal isA Whiskers Animal',
    expected_nl: 'True: Whiskers is an animal. Proof: Whiskers is a cat. Cat is a feline. Feline is a mammal. Mammal is an animal.'
  },

  // === PHASE 20: Query hierarchy ===
  {
    action: 'query',
    input_nl: 'What things are mammals?',
    input_dsl: '@q isA ?what Mammal',
    expected_nl: 'Canine is a mammal'
  }
];

export default { name, description, theories, steps };
