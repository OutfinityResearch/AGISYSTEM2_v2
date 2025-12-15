/**
 * Suite 05 - Negation & Exceptions
 *
 * Not operator blocking proofs, defaults with exceptions.
 * Tests: explicit negation, default rules, exception overrides.
 */

export const name = 'Negation & Exceptions';
export const description = 'Not blocking, defaults, exception overrides';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Default rule with exceptions (Birds fly, Penguins don't) ===
  {
    action: 'learn',
    input_nl: 'Birds fly by default. Penguins are birds but cannot fly. Ostriches cannot fly either.',
    input_dsl: `
      isA Bird Animal
      isA Penguin Bird
      isA Ostrich Bird
      isA Canary Bird
      isA Tweety Canary
      isA Opus Penguin
      isA Oscar Ostrich
      isA Robin Bird
      @birdCond isA ?x Bird
      @birdFly can ?x Fly
      Implies $birdCond $birdFly
      @negOpusFly can Opus Fly
      Not $negOpusFly
      @negOscarFly can Oscar Fly
      Not $negOscarFly
    `,
    expected_nl: 'Learned 15 facts'
  },

  // === PROVE: Default applies (Tweety can fly) ===
  {
    action: 'prove',
    input_nl: 'Can Tweety fly? (default rule applies)',
    input_dsl: '@goal can Tweety Fly',
    expected_nl: 'True: Tweety can Fly'
  },

  // === PROVE: Default applies (Robin can fly) ===
  {
    action: 'prove',
    input_nl: 'Can Robin fly?',
    input_dsl: '@goal can Robin Fly',
    expected_nl: 'True: Robin can Fly'
  },

  // === PROVE: Exception blocks (Opus cannot fly) ===
  {
    action: 'prove',
    input_nl: 'Can Opus fly? (exception blocks)',
    input_dsl: '@goal can Opus Fly',
    expected_nl: 'Cannot prove: Opus can Fly'
  },

  // === PROVE: Exception blocks (Oscar cannot fly) ===
  {
    action: 'prove',
    input_nl: 'Can Oscar fly? (exception blocks)',
    input_dsl: '@goal can Oscar Fly',
    expected_nl: 'Cannot prove: Oscar can Fly'
  },

  // === PROVE: Opus is still a Bird (negation doesn't affect isA) ===
  {
    action: 'prove',
    input_nl: 'Is Opus a Bird?',
    input_dsl: '@goal isA Opus Bird',
    expected_nl: 'True: Opus is a bird. Proof: Opus is a penguin. Penguin is a bird.'
  },

  // === SETUP: Driver license with violations ===
  {
    action: 'learn',
    input_nl: 'Good driver needs license AND NOT violations.',
    input_dsl: `
      has Alice License
      @negAliceViol has Alice Violations
      Not $negAliceViol
      has Bob License
      has Bob Violations
      @gdLic has ?x License
      @gdViol has ?x Violations
      @gdNot Not $gdViol
      @gdAnd And $gdLic $gdNot
      @gdConc hasStatus ?x GoodDriver
      Implies $gdAnd $gdConc
    `,
    expected_nl: 'Learned 11 facts'
  },

  // === PROVE: No violations -> good driver ===
  {
    action: 'prove',
    input_nl: 'Is Alice a good driver? (no violations)',
    input_dsl: '@goal hasStatus Alice GoodDriver',
    expected_nl: 'True: Alice is gooddriver'
  },

  // === PROVE: Has violations -> not good driver ===
  {
    action: 'prove',
    input_nl: 'Is Bob a good driver? (has violations)',
    input_dsl: '@goal hasStatus Bob GoodDriver',
    expected_nl: 'Cannot prove: Bob is gooddriver'
  },

  // === QUERY: Who can fly ===
  {
    action: 'query',
    input_nl: 'Who can fly?',
    input_dsl: '@q can ?who Fly',
    expected_nl: 'Tweety can Fly. Robin can Fly.'
  },

  // === NEGATIVE ===
  {
    action: 'prove',
    input_nl: 'Can a Rock fly?',
    input_dsl: '@goal can Rock Fly',
    expected_nl: 'Cannot prove: Rock can Fly'
  }
];

export default { name, description, theories, steps };
