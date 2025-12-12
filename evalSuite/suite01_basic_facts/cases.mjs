/**
 * Suite 01 - Basic Facts and Queries
 *
 * A conversation about basic knowledge: taxonomy, properties, relationships.
 * Tests the full pipeline: learn → query → prove on same session.
 *
 * Core theories: 00-types, 05-logic, 09-roles
 */

export const name = 'Basic Facts and Queries';
export const description = 'Learn facts progressively, then query and prove them';

export const theories = [
  '00-types.sys2',
  '05-logic.sys2',
  '09-roles.sys2'
];

export const steps = [
  // === PHASE 1: Learn animal taxonomy ===
  {
    action: 'learn',
    input_nl: `A dog is an animal. A cat is an animal. A bird is an animal.
               A fish is an animal. Mammals are animals.`,
    input_dsl: `
      isA Dog Animal
      isA Cat Animal
      isA Bird Animal
      isA Fish Animal
      isA Mammal Animal
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 2: Learn specific instances ===
  {
    action: 'learn',
    input_nl: `Rex is a dog. Whiskers is a cat. Tweety is a bird.
               Nemo is a fish. Dumbo is a mammal.`,
    input_dsl: `
      isA Rex Dog
      isA Whiskers Cat
      isA Tweety Bird
      isA Nemo Fish
      isA Dumbo Mammal
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 3: Query - what is Rex? ===
  {
    action: 'query',
    input_nl: 'What is Rex?',
    input_dsl: '@q isA Rex ?what',
    expected_nl: 'Rex is a dog'
  },

  // === PHASE 4: Query - what is Whiskers? ===
  {
    action: 'query',
    input_nl: 'What is Whiskers?',
    input_dsl: '@q isA Whiskers ?what',
    expected_nl: 'Whiskers is a cat'
  },

  // === PHASE 5: Prove direct fact ===
  {
    action: 'prove',
    input_nl: 'Is Rex a dog?',
    input_dsl: '@goal isA Rex Dog',
    expected_nl: 'Yes, Rex is a dog'
  },

  // === PHASE 6: Learn properties ===
  {
    action: 'learn',
    input_nl: `The sky is blue. The grass is green. Snow is white.
               Fire is hot. Ice is cold.`,
    input_dsl: `
      hasProperty Sky blue
      hasProperty Grass green
      hasProperty Snow white
      hasProperty Fire hot
      hasProperty Ice cold
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 7: Query property ===
  {
    action: 'query',
    input_nl: 'What color is the sky?',
    input_dsl: '@q hasProperty Sky ?color',
    expected_nl: 'The sky is blue'
  },

  // === PHASE 8: Learn relationships ===
  {
    action: 'learn',
    input_nl: `John loves Mary. Mary loves John. Alice knows Bob.
               Bob knows Alice. Peter helps Sarah.`,
    input_dsl: `
      love John Mary
      love Mary John
      know Alice Bob
      know Bob Alice
      help Peter Sarah
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 9: Query relationship ===
  {
    action: 'query',
    input_nl: 'Who does John love?',
    input_dsl: '@q love John ?who',
    expected_nl: 'John loves Mary'
  },

  // === PHASE 10: Prove relationship ===
  {
    action: 'prove',
    input_nl: 'Does John love Mary?',
    input_dsl: '@goal love John Mary',
    expected_nl: 'Yes, John loves Mary'
  },

  // === PHASE 11: Learn locations ===
  {
    action: 'learn',
    input_nl: `Paris is in France. France is in Europe.
               London is in England. Tokyo is in Japan.`,
    input_dsl: `
      locatedIn Paris France
      locatedIn France Europe
      locatedIn London England
      locatedIn Tokyo Japan
    `,
    expected_nl: 'Learned 4 facts'
  },

  // === PHASE 12: Query location ===
  {
    action: 'query',
    input_nl: 'Where is Paris?',
    input_dsl: '@q locatedIn Paris ?where',
    expected_nl: 'Paris is in France'
  },

  // === PHASE 13: Learn ownership ===
  {
    action: 'learn',
    input_nl: `John has a car. Alice has a house. Bob has a book.
               Mary has a garden.`,
    input_dsl: `
      has John Car
      has Alice House
      has Bob Book
      has Mary Garden
    `,
    expected_nl: 'Learned 4 facts'
  },

  // === PHASE 14: Query ownership ===
  {
    action: 'query',
    input_nl: 'What does John have?',
    input_dsl: '@q has John ?what',
    expected_nl: 'John has a car'
  },

  // === PHASE 15: Learn roles ===
  {
    action: 'learn',
    input_nl: `John is a student. Mary is a teacher. Bob is a doctor.
               Alice is an engineer. Peter is a lawyer.`,
    input_dsl: `
      isA John Student
      isA Mary Teacher
      isA Bob Doctor
      isA Alice Engineer
      isA Peter Lawyer
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 16: Query role ===
  {
    action: 'query',
    input_nl: 'What is John?',
    input_dsl: '@q isA John ?role',
    expected_nl: 'John is a student'
  },

  // === PHASE 17: Prove role ===
  {
    action: 'prove',
    input_nl: 'Is Mary a teacher?',
    input_dsl: '@goal isA Mary Teacher',
    expected_nl: 'Yes, Mary is a teacher'
  },

  // === PHASE 18: Query multiple animals ===
  {
    action: 'query',
    input_nl: 'What things are animals?',
    input_dsl: '@q isA ?what Animal',
    expected_nl: 'Dog is an animal'
  }
];

export default { name, description, theories, steps };
