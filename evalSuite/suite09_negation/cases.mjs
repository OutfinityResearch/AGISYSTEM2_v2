/**
 * Suite 09 - Negation
 *
 * Tests explicit negation with Not operator.
 * Negated facts should not prove as true.
 *
 * Core theories: 05-logic
 */

export const name = 'Negation';
export const description = 'Test explicit negation with Not operator';

export const theories = [
  '05-logic.sys2'
];

export const steps = [
  // === PHASE 1: Setup hierarchy for transitive proofs ===
  // Creates: Mammal -> Animal, Bird -> Animal (for multi-step proofs)
  {
    action: 'learn',
    input_nl: 'Mammals are animals. Birds are animals.',
    input_dsl: `
      isA Mammal Animal
      isA Bird Animal
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 2: Learn positive and negative love facts with concrete rule ===
  {
    action: 'learn',
    input_nl: 'John loves Mary. If John loves Mary then John trusts Mary. John does not love Alice.',
    input_dsl: `
      love John Mary
      @trustCond love John Mary
      @trustConc trust John Mary
      @trustRule Implies $trustCond $trustConc
      @neg1 love John Alice
      Not $neg1
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === PHASE 3: Query positive fact ===
  {
    action: 'query',
    input_nl: 'Who does John love?',
    input_dsl: '@q love John ?who',
    expected_nl: 'John loves Mary'
  },

  // === PHASE 4: Prove trust via rule (2 steps: love -> trust) ===
  // CHAIN: love(John,Mary) + rule => trust(John,Mary)
  {
    action: 'prove',
    input_nl: 'Does John trust Mary?',
    input_dsl: '@goal trust John Mary',
    expected_nl: 'True: John trusts Mary'
  },

  // === PHASE 5: Prove negated fact fails ===
  // NEGATION CHECK: Not(love John Alice) blocks proof
  {
    action: 'prove',
    input_nl: 'Does John love Alice?',
    input_dsl: '@goal love John Alice',
    expected_nl: 'Cannot prove: John loves Alice'
  },

  // === PHASE 6: Learn whale classification with negation ===
  {
    action: 'learn',
    input_nl: 'A whale is a mammal. A whale is not a fish.',
    input_dsl: `
      isA Whale Mammal
      @negw isA Whale Fish
      Not $negw
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 7: Query whale class ===
  {
    action: 'query',
    input_nl: 'What is a whale?',
    input_dsl: '@q isA Whale ?class',
    expected_nl: 'Whale is a mammal'
  },

  // === PHASE 8: Prove whale is animal (2-step transitive) ===
  // CHAIN: Whale -> Mammal -> Animal
  {
    action: 'prove',
    input_nl: 'Is a whale an animal?',
    input_dsl: '@goal isA Whale Animal',
    expected_nl: 'True: Whale is an animal'
  },

  // === PHASE 9: Prove whale is not fish (negation check) ===
  {
    action: 'prove',
    input_nl: 'Is a whale a fish?',
    input_dsl: '@goal isA Whale Fish',
    expected_nl: 'Cannot prove: Whale is a fish'
  },

  // === PHASE 10: Learn bat classification ===
  {
    action: 'learn',
    input_nl: 'A bat is a mammal. A bat is not a bird.',
    input_dsl: `
      isA Bat Mammal
      @negb isA Bat Bird
      Not $negb
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 11: Prove bat is animal (2-step transitive) ===
  // CHAIN: Bat -> Mammal -> Animal
  {
    action: 'prove',
    input_nl: 'Is a bat an animal?',
    input_dsl: '@goal isA Bat Animal',
    expected_nl: 'True: Bat is an animal'
  },

  // === PHASE 12: Prove bat is not bird (negation check) ===
  {
    action: 'prove',
    input_nl: 'Is a bat a bird?',
    input_dsl: '@goal isA Bat Bird',
    expected_nl: 'Cannot prove: Bat is a bird'
  },

  // === PHASE 13: Learn sky properties with concrete rule chain ===
  {
    action: 'learn',
    input_nl: 'The sky is blue. If the sky is blue, then the sky is calming. The sky is not green.',
    input_dsl: `
      hasProperty Sky blue
      @calmCond hasProperty Sky blue
      @calmConc hasProperty Sky calming
      @calmRule Implies $calmCond $calmConc
      @negs hasProperty Sky green
      Not $negs
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === PHASE 14: Prove sky is calming (2-step rule chain) ===
  // CHAIN: blue(Sky) + rule => calming(Sky)
  {
    action: 'prove',
    input_nl: 'Is the sky calming?',
    input_dsl: '@goal hasProperty Sky calming',
    expected_nl: 'True: Sky is calming'
  },

  // === PHASE 15: Prove sky is not green (negation check) ===
  {
    action: 'prove',
    input_nl: 'Is the sky green?',
    input_dsl: '@goal hasProperty Sky green',
    expected_nl: 'Cannot prove: Sky is green'
  },

  // === PHASE 16: Learn temperature concrete rule chain ===
  {
    action: 'learn',
    input_nl: 'Fire is hot. If fire is hot, then fire is dangerous. Fire is not cold. Ice is cold. Ice is not hot.',
    input_dsl: `
      hasProperty Fire hot
      @dangerCond hasProperty Fire hot
      @dangerConc hasProperty Fire dangerous
      @dangerRule Implies $dangerCond $dangerConc
      @negf hasProperty Fire cold
      Not $negf
      hasProperty Ice cold
      @negi hasProperty Ice hot
      Not $negi
    `,
    expected_nl: 'Learned 9 facts'
  },

  // === PHASE 17: Prove fire is dangerous (2-step rule chain) ===
  // CHAIN: hot(Fire) + rule => dangerous(Fire)
  {
    action: 'prove',
    input_nl: 'Is fire dangerous?',
    input_dsl: '@goal hasProperty Fire dangerous',
    expected_nl: 'True: Fire is dangerous'
  },

  // === PHASE 18: Prove fire is not cold (negation check) ===
  {
    action: 'prove',
    input_nl: 'Is fire cold?',
    input_dsl: '@goal hasProperty Fire cold',
    expected_nl: 'Cannot prove: Fire is cold'
  },

  // === PHASE 19: Query mammals (should find whale and bat) ===
  {
    action: 'query',
    input_nl: 'What are the mammals?',
    input_dsl: '@q isA ?what Mammal',
    expected_nl: 'Whale is a mammal. Bat is a mammal'
  },

  // === PHASE 20: Final negation check - ice is not hot ===
  {
    action: 'prove',
    input_nl: 'Is ice hot?',
    input_dsl: '@goal hasProperty Ice hot',
    expected_nl: 'Cannot prove: Ice is hot'
  }
];

export default { name, description, theories, steps };
