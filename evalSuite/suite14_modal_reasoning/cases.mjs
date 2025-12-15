/**
 * Suite 14 - Modal Reasoning
 *
 * Tests direct modal relations: necessary, possible, can, cannot,
 * obligatory, permitted, forbidden.
 *
 * Core theories: 05-logic, 07-modal
 */

export const name = 'Modal Reasoning';
export const description = 'Test direct modal facts';

export const theories = [
  '05-logic.sys2',
  '07-modal.sys2'
];

export const timeout = 2000;

// Simplified - test direct modal facts
export const steps = [
  // === PHASE 1: Learn necessary truths ===
  {
    action: 'learn',
    input_nl: 'Mathematical truths and logic are necessary.',
    input_dsl: `
      necessary MathTruths
      necessary Logic
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 2: Prove necessity ===
  {
    action: 'prove',
    input_nl: 'Are mathematical truths necessary?',
    input_dsl: '@goal necessary MathTruths',
    expected_nl: 'True: MathTruths is necessary'
  },

  // === PHASE 3: Query necessary things ===
  {
    action: 'query',
    input_nl: 'What is necessary?',
    input_dsl: '@q necessary ?thing',
    expected_nl: 'MathTruths is necessary'
  },

  // === PHASE 4: Learn possibilities ===
  {
    action: 'learn',
    input_nl: 'Time travel and teleportation are possible.',
    input_dsl: `
      possible TimeTravel
      possible Teleportation
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 5: Prove possibility ===
  {
    action: 'prove',
    input_nl: 'Is time travel possible?',
    input_dsl: '@goal possible TimeTravel',
    expected_nl: 'True: TimeTravel is possible'
  },

  // === PHASE 6: Learn abilities ===
  {
    action: 'learn',
    input_nl: 'Birds can fly. Fish can swim.',
    input_dsl: `
      can Bird Fly
      can Fish Swim
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 7: Prove ability ===
  {
    action: 'prove',
    input_nl: 'Can birds fly?',
    input_dsl: '@goal can Bird Fly',
    expected_nl: 'True: Bird can Fly'
  },

  // === PHASE 8: Query abilities ===
  {
    action: 'query',
    input_nl: 'What can Bird do?',
    input_dsl: '@q can Bird ?ability',
    expected_nl: 'Bird can Fly'
  },

  // === PHASE 9: Learn inabilities ===
  {
    action: 'learn',
    input_nl: 'Humans cannot fly unaided. Snakes cannot walk.',
    input_dsl: `
      cannot Human FlyUnaided
      cannot Snake Walk
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 10: Prove inability ===
  {
    action: 'prove',
    input_nl: 'Can humans fly unaided?',
    input_dsl: '@goal cannot Human FlyUnaided',
    expected_nl: 'True: Human cannot FlyUnaided'
  },

  // === PHASE 11: Learn obligations ===
  {
    action: 'learn',
    input_nl: 'Paying taxes is obligatory. Following laws is obligatory.',
    input_dsl: `
      obligatory PayTaxes
      obligatory FollowLaws
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 12: Prove obligation ===
  {
    action: 'prove',
    input_nl: 'Is paying taxes obligatory?',
    input_dsl: '@goal obligatory PayTaxes',
    expected_nl: 'True: PayTaxes is obligatory'
  },

  // === PHASE 13: Learn permissions ===
  {
    action: 'learn',
    input_nl: 'Free speech is permitted. Peaceful assembly is permitted.',
    input_dsl: `
      permitted FreeSpeech
      permitted PeaceAssembly
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 14: Prove permission ===
  {
    action: 'prove',
    input_nl: 'Is free speech permitted?',
    input_dsl: '@goal permitted FreeSpeech',
    expected_nl: 'True: FreeSpeech is permitted'
  },

  // === PHASE 15: Learn prohibitions ===
  {
    action: 'learn',
    input_nl: 'Murder is forbidden. Theft is forbidden.',
    input_dsl: `
      forbidden Murder
      forbidden Theft
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 16: Prove prohibition ===
  {
    action: 'prove',
    input_nl: 'Is murder forbidden?',
    input_dsl: '@goal forbidden Murder',
    expected_nl: 'True: Murder is forbidden'
  },

  // === PHASE 17: Query forbidden things ===
  {
    action: 'query',
    input_nl: 'What is forbidden?',
    input_dsl: '@q forbidden ?thing',
    expected_nl: 'Murder is forbidden'
  },

  // === PHASE 18: Negative - not possible ===
  {
    action: 'prove',
    input_nl: 'Is invisibility possible?',
    input_dsl: '@goal possible Invisibility',
    expected_nl: 'Cannot prove: Invisibility is possible'
  },

  // === PHASE 19: Negative - not permitted ===
  {
    action: 'prove',
    input_nl: 'Is speeding permitted?',
    input_dsl: '@goal permitted Speeding',
    expected_nl: 'Cannot prove: Speeding is permitted'
  },

  // === PHASE 20: Negative - not forbidden ===
  {
    action: 'prove',
    input_nl: 'Is breathing forbidden?',
    input_dsl: '@goal forbidden Breathing',
    expected_nl: 'Cannot prove: Breathing is forbidden'
  }
];

export default { name, description, theories, steps };
