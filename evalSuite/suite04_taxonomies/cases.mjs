/**
 * Suite 04 - Taxonomies and Properties
 *
 * Tests hierarchical classifications and properties.
 * Uses anonymous facts (persistent in KB).
 *
 * Core theories: 00-types, 09-roles, 10-properties
 */

export const name = 'Taxonomies and Properties';
export const description = 'Learn and query hierarchical classifications and spatial relations';

export const theories = [
  '00-types.sys2',
  '09-roles.sys2',
  '10-properties.sys2'
];

export const steps = [
  // === PHASE 1: Learn deep animal taxonomy ===
  {
    action: 'learn',
    input_nl: 'Mammals are animals. Birds are animals. Dogs are mammals. Cats are mammals.',
    input_dsl: `
      isA Mammal Animal
      isA Bird Animal
      isA Dog Mammal
      isA Cat Mammal
    `,
    expected_nl: 'Learned 4 facts'
  },

  // === PHASE 2: Query parent class ===
  {
    action: 'query',
    input_nl: 'What category is a dog?',
    input_dsl: '@q isA Dog ?parent',
    expected_nl: 'Dog is a mammal'
  },

  // === PHASE 3: Query mammal parent ===
  {
    action: 'query',
    input_nl: 'What category is a mammal?',
    input_dsl: '@q isA Mammal ?parent',
    expected_nl: 'Mammal is an animal'
  },

  // === PHASE 4: Learn color properties ===
  {
    action: 'learn',
    input_nl: 'The sky is blue. The ocean is blue. The grass is green. Snow is white.',
    input_dsl: `
      hasProperty Sky blue
      hasProperty Ocean blue
      hasProperty Grass green
      hasProperty Snow white
    `,
    expected_nl: 'Learned 4 facts'
  },

  // === PHASE 5: Query property ===
  {
    action: 'query',
    input_nl: 'What color is the sky?',
    input_dsl: '@q hasProperty Sky ?prop',
    expected_nl: 'Sky is blue'
  },

  // === PHASE 6: Query grass color ===
  {
    action: 'query',
    input_nl: 'What color is the grass?',
    input_dsl: '@q hasProperty Grass ?prop',
    expected_nl: 'Grass is green'
  },

  // === PHASE 7: Learn geographic hierarchy ===
  {
    action: 'learn',
    input_nl: 'Paris is in France. Lyon is in France. France is in Europe. Berlin is in Germany.',
    input_dsl: `
      locatedIn Paris France
      locatedIn Lyon France
      locatedIn France Europe
      locatedIn Berlin Germany
    `,
    expected_nl: 'Learned 4 facts'
  },

  // === PHASE 8: Query city location ===
  {
    action: 'query',
    input_nl: 'Where is Paris?',
    input_dsl: '@q locatedIn Paris ?country',
    expected_nl: 'Paris is in France'
  },

  // === PHASE 9: Query multiple cities in France ===
  {
    action: 'query',
    input_nl: 'What is in France?',
    input_dsl: '@q locatedIn ?what France',
    expected_nl: 'Paris is in France. Lyon is in France'
  },

  // === PHASE 10: Learn biological classification ===
  {
    action: 'learn',
    input_nl: 'Plants are organisms. Animals are organisms. Trees are plants.',
    input_dsl: `
      isA Plant Organism
      isA Animal Organism
      isA Tree Plant
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 11: Query tree classification ===
  {
    action: 'query',
    input_nl: 'What category is a tree?',
    input_dsl: '@q isA Tree ?parent',
    expected_nl: 'Tree is a plant'
  },

  // === PHASE 12: Learn object categories ===
  {
    action: 'learn',
    input_nl: 'Chairs are furniture. Tables are furniture. Hammers are tools.',
    input_dsl: `
      isA Chair Furniture
      isA Table Furniture
      isA Hammer Tool
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 13: Query furniture (multiple) ===
  {
    action: 'query',
    input_nl: 'What is furniture?',
    input_dsl: '@q isA ?what Furniture',
    expected_nl: 'Chair is a furniture. Table is a furniture'
  },

  // === PHASE 14: Learn landmarks ===
  {
    action: 'learn',
    input_nl: 'The Louvre is in Paris. The Eiffel Tower is in Paris. Big Ben is in London.',
    input_dsl: `
      locatedIn Louvre Paris
      locatedIn EiffelTower Paris
      locatedIn BigBen London
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 15: Query landmarks in Paris (multiple) ===
  {
    action: 'query',
    input_nl: 'What is in Paris?',
    input_dsl: '@q locatedIn ?what Paris',
    expected_nl: 'Louvre is in Paris. EiffelTower is in Paris'
  },

  // === PHASE 16: Prove Louvre is in Paris ===
  {
    action: 'prove',
    input_nl: 'Is the Louvre in Paris?',
    input_dsl: '@goal locatedIn Louvre Paris',
    expected_nl: 'True: Louvre is in Paris'
  },

  // === PHASE 17: Learn more properties ===
  {
    action: 'learn',
    input_nl: 'Fire is hot. Ice is cold. The sun is bright.',
    input_dsl: `
      hasProperty Fire hot
      hasProperty Ice cold
      hasProperty Sun bright
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 18: Prove fire is hot ===
  {
    action: 'prove',
    input_nl: 'Is fire hot?',
    input_dsl: '@goal hasProperty Fire hot',
    expected_nl: 'True: Fire is hot'
  }
];

export default { name, description, theories, steps };
