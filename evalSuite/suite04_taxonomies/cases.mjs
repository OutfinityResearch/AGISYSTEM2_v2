/**
 * Suite 04 - Taxonomies and Properties
 *
 * A conversation about hierarchical classifications and properties.
 * Tests: deep taxonomy chains, property inheritance, geographic relations.
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
    input_nl: `Mammals are animals. Birds are animals. Dogs are mammals.
               Cats are mammals. Whales are mammals. Sparrows are birds.`,
    input_dsl: `
      @t1 isA Mammal Animal
      @t2 isA Bird Animal
      @t3 isA Dog Mammal
      @t4 isA Cat Mammal
      @t5 isA Whale Mammal
      @t6 isA Sparrow Bird
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === PHASE 2: Query parent class ===
  {
    action: 'query',
    input_nl: 'What category is a dog?',
    input_dsl: '@q isA Dog ?parent',
    expected_nl: 'Dog is a mammal'
  },

  // === PHASE 3: Learn color properties ===
  {
    action: 'learn',
    input_nl: `The sky is blue. The ocean is blue. The grass is green.
               Leaves are green. Snow is white. Clouds are white.`,
    input_dsl: `
      @c1 hasProperty Sky blue
      @c2 hasProperty Ocean blue
      @c3 hasProperty Grass green
      @c4 hasProperty Leaves green
      @c5 hasProperty Snow white
      @c6 hasProperty Clouds white
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === PHASE 4: Query property ===
  {
    action: 'query',
    input_nl: 'What color is the sky?',
    input_dsl: '@q hasProperty Sky ?prop',
    expected_nl: 'The sky is blue'
  },

  // === PHASE 5: Learn geographic hierarchy ===
  {
    action: 'learn',
    input_nl: `Paris is in France. Lyon is in France. France is in Europe.
               Germany is in Europe. Berlin is in Germany.`,
    input_dsl: `
      @g1 locatedIn Paris France
      @g2 locatedIn Lyon France
      @g3 locatedIn France Europe
      @g4 locatedIn Germany Europe
      @g5 locatedIn Berlin Germany
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 6: Query city location ===
  {
    action: 'query',
    input_nl: 'Where is Paris?',
    input_dsl: '@q locatedIn Paris ?country',
    expected_nl: 'Paris is in France'
  },

  // === PHASE 7: Learn car properties ===
  {
    action: 'learn',
    input_nl: `The car is red. The car is fast. The car is expensive.
               The house is big. The house is old.`,
    input_dsl: `
      @p1 hasProperty Car red
      @p2 hasProperty Car fast
      @p3 hasProperty Car expensive
      @p4 hasProperty House big
      @p5 hasProperty House old
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 8: Query car property ===
  {
    action: 'query',
    input_nl: 'What property does the car have?',
    input_dsl: '@q hasProperty Car ?prop',
    expected_nl: 'The car is red'
  },

  // === PHASE 9: Learn biological classification ===
  {
    action: 'learn',
    input_nl: `Plants are organisms. Animals are organisms. Trees are plants.
               Flowers are plants. Ferns are plants.`,
    input_dsl: `
      @b1 isA Plant Organism
      @b2 isA Animal Organism
      @b3 isA Tree Plant
      @b4 isA Flower Plant
      @b5 isA Fern Plant
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 10: Query tree classification ===
  {
    action: 'query',
    input_nl: 'What category is a tree?',
    input_dsl: '@q isA Tree ?parent',
    expected_nl: 'Tree is a plant'
  },

  // === PHASE 11: Learn Asian geography ===
  {
    action: 'learn',
    input_nl: `Japan is in Asia. China is in Asia. India is in Asia.
               Brazil is in South America. Egypt is in Africa.`,
    input_dsl: `
      @a1 locatedIn Japan Asia
      @a2 locatedIn China Asia
      @a3 locatedIn India Asia
      @a4 locatedIn Brazil SouthAmerica
      @a5 locatedIn Egypt Africa
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 12: Query Japan's continent ===
  {
    action: 'query',
    input_nl: 'What continent is Japan in?',
    input_dsl: '@q locatedIn Japan ?continent',
    expected_nl: 'Japan is in Asia'
  },

  // === PHASE 13: Learn object categories ===
  {
    action: 'learn',
    input_nl: `Chairs are furniture. Tables are furniture. Beds are furniture.
               Hammers are tools. Screwdrivers are tools.`,
    input_dsl: `
      @o1 isA Chair Furniture
      @o2 isA Table Furniture
      @o3 isA Bed Furniture
      @o4 isA Hammer Tool
      @o5 isA Screwdriver Tool
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 14: Query chair category ===
  {
    action: 'query',
    input_nl: 'What category is a chair?',
    input_dsl: '@q isA Chair ?category',
    expected_nl: 'Chair is furniture'
  },

  // === PHASE 15: Learn flower colors ===
  {
    action: 'learn',
    input_nl: `Roses are red. Violets are blue. Sunflowers are yellow.
               The sun is yellow. The moon is white.`,
    input_dsl: `
      @f1 hasProperty Rose red
      @f2 hasProperty Violet blue
      @f3 hasProperty Sunflower yellow
      @f4 hasProperty Sun yellow
      @f5 hasProperty Moon white
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 16: Query rose color ===
  {
    action: 'query',
    input_nl: 'What color is a rose?',
    input_dsl: '@q hasProperty Rose ?color',
    expected_nl: 'Roses are red'
  },

  // === PHASE 17: Learn Parisian landmarks ===
  {
    action: 'learn',
    input_nl: `The Louvre is in Paris. The Eiffel Tower is in Paris.
               The Colosseum is in Rome. Big Ben is in London.`,
    input_dsl: `
      @l1 locatedIn Louvre Paris
      @l2 locatedIn EiffelTower Paris
      @l3 locatedIn Colosseum Rome
      @l4 locatedIn BigBen London
    `,
    expected_nl: 'Learned 4 facts'
  },

  // === PHASE 18: Prove Louvre is in Paris ===
  {
    action: 'prove',
    input_nl: 'Is the Louvre in Paris?',
    input_dsl: '@goal locatedIn Louvre Paris',
    expected_nl: 'Yes, the Louvre is in Paris'
  }
];

export default { name, description, theories, steps };
