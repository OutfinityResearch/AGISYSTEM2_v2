/**
 * Suite 12 - Multi-Hop Reasoning
 *
 * Tests deep reasoning chains requiring 3-6 steps.
 * Uses deep hierarchies for transitive isA and locatedIn reasoning.
 *
 * Core theories: 05-logic, 09-roles, 12-reasoning
 */

export const name = 'Multi-Hop Reasoning';
export const description = 'Test 3-6 step reasoning chains using deep hierarchies';

export const theories = [
  '05-logic.sys2',
  '09-roles.sys2',
  '12-reasoning.sys2'
];

export const steps = [
  // === PHASE 1: Build deep biological classification (6 levels) ===
  // Entity > Organism > Animal > Vertebrate > Mammal > Primate > Human > Student
  {
    action: 'learn',
    input_nl: 'Build deep classification: Entity > Organism > Animal > Vertebrate > Mammal > Primate > Human',
    input_dsl: `
      isA Organism Entity
      isA Animal Organism
      isA Vertebrate Animal
      isA Mammal Vertebrate
      isA Primate Mammal
      isA Human Primate
      isA Student Human
      isA Alice Student
    `,
    expected_nl: 'Learned 8 facts'
  },

  // === PHASE 2: Direct lookup ===
  {
    action: 'query',
    input_nl: 'What is Alice?',
    input_dsl: '@q isA Alice ?what',
    expected_nl: 'Alice is a student'
  },

  // === PHASE 3: 2-hop transitive ===
  // CHAIN: Alice -> Student -> Human
  {
    action: 'prove',
    input_nl: 'Is Alice a Human?',
    input_dsl: '@goal isA Alice Human',
    expected_nl: 'True: Alice is a human. Proof: Alice is a student. Student is a human.'
  },

  // === PHASE 4: 3-hop transitive ===
  // CHAIN: Alice -> Student -> Human -> Primate
  {
    action: 'prove',
    input_nl: 'Is Alice a Primate?',
    input_dsl: '@goal isA Alice Primate',
    expected_nl: 'True: Alice is a primate. Proof: Alice is a student. Student is a human. Human is a primate.'
  },

  // === PHASE 5: 4-hop transitive ===
  // CHAIN: Alice -> Student -> Human -> Primate -> Mammal
  {
    action: 'prove',
    input_nl: 'Is Alice a Mammal?',
    input_dsl: '@goal isA Alice Mammal',
    expected_nl: 'True: Alice is a mammal. Proof: Alice is a student. Student is a human. Human is a primate. Primate is a mammal.'
  },

  // === PHASE 6: 5-hop transitive ===
  // CHAIN: Alice -> Student -> Human -> Primate -> Mammal -> Vertebrate
  {
    action: 'prove',
    input_nl: 'Is Alice a Vertebrate?',
    input_dsl: '@goal isA Alice Vertebrate',
    expected_nl: 'True: Alice is a vertebrate. Proof: Alice is a student. Student is a human. Human is a primate. Primate is a mammal. Mammal is a vertebrate.'
  },

  // === PHASE 7: 6-hop transitive ===
  // CHAIN: Alice -> ... -> Animal
  {
    action: 'prove',
    input_nl: 'Is Alice an Animal?',
    input_dsl: '@goal isA Alice Animal',
    expected_nl: 'True: Alice is an animal. Proof: Alice is a student. Student is a human. Human is a primate. Primate is a mammal. Mammal is a vertebrate. Vertebrate is an animal.'
  },

  // === PHASE 8: Build deep location hierarchy (6 levels) ===
  // Universe > Galaxy > SolarSystem > Earth > Europe > France > Paris > Louvre
  {
    action: 'learn',
    input_nl: 'Build deep location: Universe > Galaxy > SolarSystem > Earth > Europe > France > Paris',
    input_dsl: `
      locatedIn Galaxy Universe
      locatedIn SolarSystem Galaxy
      locatedIn Earth SolarSystem
      locatedIn Europe Earth
      locatedIn France Europe
      locatedIn Paris France
      locatedIn Louvre Paris
    `,
    expected_nl: 'Learned 7 facts'
  },

  // === PHASE 9: Direct location ===
  {
    action: 'query',
    input_nl: 'Where is the Louvre?',
    input_dsl: '@q locatedIn Louvre ?where',
    expected_nl: 'Louvre is in Paris'
  },

  // === PHASE 10: 2-hop location ===
  // CHAIN: Louvre -> Paris -> France
  {
    action: 'prove',
    input_nl: 'Is the Louvre in France?',
    input_dsl: '@goal locatedIn Louvre France',
    expected_nl: 'True: Louvre is in France. Proof: Louvre is in Paris. Paris is in France.'
  },

  // === PHASE 11: 3-hop location ===
  // CHAIN: Louvre -> Paris -> France -> Europe
  {
    action: 'prove',
    input_nl: 'Is the Louvre in Europe?',
    input_dsl: '@goal locatedIn Louvre Europe',
    expected_nl: 'True: Louvre is in Europe. Proof: Louvre is in Paris. Paris is in France. France is in Europe.'
  },

  // === PHASE 12: 4-hop location ===
  // CHAIN: Louvre -> Paris -> France -> Europe -> Earth
  {
    action: 'prove',
    input_nl: 'Is the Louvre on Earth?',
    input_dsl: '@goal locatedIn Louvre Earth',
    expected_nl: 'True: Louvre is in Earth. Proof: Louvre is in Paris. Paris is in France. France is in Europe. Europe is in Earth.'
  },

  // === PHASE 13: 5-hop location ===
  // CHAIN: Louvre -> ... -> SolarSystem
  {
    action: 'prove',
    input_nl: 'Is the Louvre in the Solar System?',
    input_dsl: '@goal locatedIn Louvre SolarSystem',
    expected_nl: 'True: Louvre is in SolarSystem. Proof: Louvre is in Paris. Paris is in France. France is in Europe. Europe is in Earth. Earth is in SolarSystem.'
  },

  // === PHASE 14: Negative - no path ===
  {
    action: 'prove',
    input_nl: 'Is Alice located in Paris?',
    input_dsl: '@goal locatedIn Alice Paris',
    expected_nl: 'Cannot prove: Alice is in Paris'
  },

  // === PHASE 15: Negative - wrong branch ===
  {
    action: 'prove',
    input_nl: 'Is Human a Vertebrate?',
    input_dsl: '@goal isA Human Vertebrate',
    expected_nl: 'True: Human is a vertebrate. Proof: Human is a primate. Primate is a mammal. Mammal is a vertebrate.'
  }
];

export default { name, description, theories, steps };
