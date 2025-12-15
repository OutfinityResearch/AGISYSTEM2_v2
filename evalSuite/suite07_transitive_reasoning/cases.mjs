/**
 * Suite 07 - Transitive Reasoning
 *
 * Tests transitive closure inference.
 * If A->B and B->C then A->C (transitively)
 *
 * Theories loaded: taxonomy-hierarchy.sys2, geographic-containment.sys2
 */

export const name = 'Transitive Reasoning';
export const description = 'Test transitive inference chains';

export const theories = [
  '05-logic.sys2',
  '09-roles.sys2'
];

export const steps = [
  // === STEP 1: Load theories ===
  {
    action: 'learn',
    input_nl: 'Load taxonomy hierarchy and geographic containment theories',
    input_dsl: `
      @_ Load "./evalSuite/suite07_transitive_reasoning/theories/taxonomy-hierarchy.sys2"
      @_ Load "./evalSuite/suite07_transitive_reasoning/theories/geographic-containment.sys2"
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === STEP 2: Query direct fact (establishes baseline) ===
  {
    action: 'query',
    input_nl: 'What is Socrates?',
    input_dsl: '@q isA Socrates ?what',
    expected_nl: 'Socrates is a philosopher'
  },

  // === STEP 3: Two-step transitive ===
  // CHAIN: Socrates -> Philosopher -> Human (2 hops)
  {
    action: 'prove',
    input_nl: 'Is Socrates a Human?',
    input_dsl: '@goal isA Socrates Human',
    expected_nl: 'True: Socrates is a human'
  },

  // === STEP 4: Three-step transitive ===
  // CHAIN: Socrates -> Philosopher -> Human -> Primate (3 hops)
  {
    action: 'prove',
    input_nl: 'Is Socrates a Primate?',
    input_dsl: '@goal isA Socrates Primate',
    expected_nl: 'True: Socrates is a primate'
  },

  // === STEP 5: Four-step transitive ===
  // CHAIN: Socrates -> Philosopher -> Human -> Primate -> Mammal (4 hops)
  {
    action: 'prove',
    input_nl: 'Is Socrates a Mammal?',
    input_dsl: '@goal isA Socrates Mammal',
    expected_nl: 'True: Socrates is a mammal'
  },

  // === STEP 6: Five-step transitive ===
  // CHAIN: Socrates -> ... -> Animal (5 hops)
  {
    action: 'prove',
    input_nl: 'Is Socrates an Animal?',
    input_dsl: '@goal isA Socrates Animal',
    expected_nl: 'True: Socrates is an animal'
  },

  // === STEP 7: Six-step transitive ===
  // CHAIN: Socrates -> ... -> LivingThing (6 hops - max depth test)
  {
    action: 'prove',
    input_nl: 'Is Socrates a LivingThing?',
    input_dsl: '@goal isA Socrates LivingThing',
    expected_nl: 'True: Socrates is a livingthing'
  },

  // === STEP 8: Geographic 2-step ===
  // CHAIN: SacreCoeur -> Montmartre -> Paris (2 hops)
  {
    action: 'prove',
    input_nl: 'Is Sacre Coeur in Paris?',
    input_dsl: '@goal locatedIn SacreCoeur Paris',
    expected_nl: 'True: SacreCoeur is in Paris'
  },

  // === STEP 9: Geographic 3-step ===
  // CHAIN: SacreCoeur -> Montmartre -> Paris -> IleDeFrance (3 hops)
  {
    action: 'prove',
    input_nl: 'Is Sacre Coeur in Ile-de-France?',
    input_dsl: '@goal locatedIn SacreCoeur IleDeFrance',
    expected_nl: 'True: SacreCoeur is in IleDeFrance'
  },

  // === STEP 10: Geographic 4-step ===
  // CHAIN: SacreCoeur -> ... -> France (4 hops)
  {
    action: 'prove',
    input_nl: 'Is Sacre Coeur in France?',
    input_dsl: '@goal locatedIn SacreCoeur France',
    expected_nl: 'True: SacreCoeur is in France'
  },

  // === STEP 11: Geographic 5-step ===
  // CHAIN: SacreCoeur -> ... -> Europe (5 hops)
  {
    action: 'prove',
    input_nl: 'Is Sacre Coeur in Europe?',
    input_dsl: '@goal locatedIn SacreCoeur Europe',
    expected_nl: 'True: SacreCoeur is in Europe'
  },

  // === STEP 12: Geographic 6-step ===
  // CHAIN: SacreCoeur -> ... -> Earth (6 hops - max depth)
  {
    action: 'prove',
    input_nl: 'Is Sacre Coeur on Earth?',
    input_dsl: '@goal locatedIn SacreCoeur Earth',
    expected_nl: 'True: SacreCoeur is in Earth'
  },

  // === STEP 13: Query - direct lookup is OK for queries ===
  {
    action: 'query',
    input_nl: 'What landmarks are in Montmartre?',
    input_dsl: '@q locatedIn ?what Montmartre',
    expected_nl: 'SacreCoeur is in Montmartre'
  },

  // === STEP 14: Negative transitive - branch mismatch ===
  // Rex -> Canine -> Mammal (but not in Human branch)
  {
    action: 'prove',
    input_nl: 'Is Rex a Human?',
    input_dsl: '@goal isA Rex Human',
    expected_nl: 'Cannot prove: Rex is a human'
  },

  // === STEP 15: Different branch transitive ===
  // CHAIN: Rex -> Canine -> Mammal -> Animal (3 hops)
  {
    action: 'prove',
    input_nl: 'Is Rex an Animal?',
    input_dsl: '@goal isA Rex Animal',
    expected_nl: 'True: Rex is an animal'
  },

  // === STEP 16: Query primates ===
  {
    action: 'query',
    input_nl: 'What things are Primates?',
    input_dsl: '@q isA ?what Primate',
    expected_nl: 'Human is a primate'
  },

  // === STEP 17: Tokyo 3-step transitive ===
  // CHAIN: Tokyo -> Kanto -> Japan -> Asia (3 hops)
  {
    action: 'prove',
    input_nl: 'Is Tokyo in Asia?',
    input_dsl: '@goal locatedIn Tokyo Asia',
    expected_nl: 'True: Tokyo is in Asia'
  },

  // === STEP 18: Cross-continent disjoint proof ===
  // REASONING: Tokyo in Asia, Asia disjoint from Europe => Tokyo NOT in Europe
  {
    action: 'prove',
    input_nl: 'Is Tokyo in Europe?',
    input_dsl: '@goal locatedIn Tokyo Europe',
    expected_nl: 'False: NOT Tokyo is in Europe. Proof: Tokyo is in Kanto. Kanto is in Japan. Japan is in Asia. Asia and Europe are disjoint.'
  }
];

export default { name, description, theories, steps };
