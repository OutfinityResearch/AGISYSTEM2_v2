/**
 * Suite 05 - Logic and Relations
 *
 * Tests logical reasoning with positive facts.
 * Uses anonymous facts (persistent in KB).
 *
 * NOTE: Negation is not yet implemented, so we test positive facts only.
 * Core theories: 05-logic
 */

export const name = 'Logic and Relations';
export const description = 'Learn and query various relationship patterns';

export const theories = [
  '05-logic.sys2'
];

export const steps = [
  // === PHASE 1: Learn love relationships ===
  {
    action: 'learn',
    input_nl: 'John loves Mary. Mary loves John. Alice loves Bob.',
    input_dsl: `
      love John Mary
      love Mary John
      love Alice Bob
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 2: Query who John loves ===
  {
    action: 'query',
    input_nl: 'Who does John love?',
    input_dsl: '@q love John ?who',
    expected_nl: 'John loves Mary'
  },

  // === PHASE 3: Prove John loves Mary ===
  {
    action: 'prove',
    input_nl: 'Does John love Mary?',
    input_dsl: '@goal love John Mary',
    expected_nl: 'True: John loves Mary'
  },

  // === PHASE 4: Learn whale classification ===
  {
    action: 'learn',
    input_nl: 'A whale is a mammal. A dolphin is a mammal. A shark is a fish.',
    input_dsl: `
      isA Whale Mammal
      isA Dolphin Mammal
      isA Shark Fish
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 5: Query what whale is ===
  {
    action: 'query',
    input_nl: 'What is a whale?',
    input_dsl: '@q isA Whale ?class',
    expected_nl: 'Whale is a mammal'
  },

  // === PHASE 6: Query mammals (multiple) ===
  {
    action: 'query',
    input_nl: 'What are the mammals?',
    input_dsl: '@q isA ?what Mammal',
    expected_nl: 'Whale is a mammal. Dolphin is a mammal'
  },

  // === PHASE 7: Learn sky properties ===
  {
    action: 'learn',
    input_nl: 'The sky is blue. The grass is green. The sun is yellow.',
    input_dsl: `
      hasProperty Sky blue
      hasProperty Grass green
      hasProperty Sun yellow
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 8: Query sky property ===
  {
    action: 'query',
    input_nl: 'What color is the sky?',
    input_dsl: '@q hasProperty Sky ?prop',
    expected_nl: 'Sky is blue'
  },

  // === PHASE 9: Prove sky is blue ===
  {
    action: 'prove',
    input_nl: 'Is the sky blue?',
    input_dsl: '@goal hasProperty Sky blue',
    expected_nl: 'True: Sky is blue'
  },

  // === PHASE 10: Learn help relationships ===
  {
    action: 'learn',
    input_nl: 'John helps Mary. Alice teaches Bob. Carol helps Alice.',
    input_dsl: `
      help John Mary
      teach Alice Bob
      help Carol Alice
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 11: Query who John helps ===
  {
    action: 'query',
    input_nl: 'Who does John help?',
    input_dsl: '@q help John ?who',
    expected_nl: 'John helps Mary'
  },

  // === PHASE 12: Prove Alice teaches Bob ===
  {
    action: 'prove',
    input_nl: 'Does Alice teach Bob?',
    input_dsl: '@goal teach Alice Bob',
    expected_nl: 'True: Alice teaches Bob'
  }
];

export default { name, description, theories, steps };
