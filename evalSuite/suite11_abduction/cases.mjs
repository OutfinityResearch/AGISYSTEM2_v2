/**
 * Suite 11 - Abduction
 *
 * Tests abductive reasoning: inference to best explanation.
 * Given observations, find the most likely cause.
 *
 * Core theories: 05-logic, 12-reasoning
 */

export const name = 'Abduction';
export const description = 'Test abductive reasoning - from effects to causes';

export const theories = [
  '05-logic.sys2',
  '12-reasoning.sys2'
];

// Shorter timeout for this suite
export const timeout = 2000;

export const steps = [
  // === PHASE 1: Learn simple symptom-disease associations ===
  {
    action: 'learn',
    input_nl: 'Fever suggests flu. Cough suggests cold.',
    input_dsl: `
      @r1cond hasSymptom Patient Fever
      @r1conc suggests Fever Flu
      @r1 Implies $r1cond $r1conc
      @r2cond hasSymptom Patient Cough
      @r2conc suggests Cough Cold
      @r2 Implies $r2cond $r2conc
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === PHASE 2: Patient with fever ===
  {
    action: 'learn',
    input_nl: 'The patient has a fever',
    input_dsl: 'hasSymptom Patient Fever',
    expected_nl: 'Learned 1 fact'
  },

  // === PHASE 3: Add cough ===
  {
    action: 'learn',
    input_nl: 'The patient also has cough',
    input_dsl: 'hasSymptom Patient Cough',
    expected_nl: 'Learned 1 fact'
  },

  // === PHASE 4: Query symptoms ===
  {
    action: 'query',
    input_nl: 'What symptoms does the patient have?',
    input_dsl: '@q hasSymptom Patient ?symptom',
    expected_nl: 'Patient has fever'  // Both fever and cough are returned, but fever matches
  },

  // === PHASE 5: Prove flu suggested ===
  {
    action: 'prove',
    input_nl: 'Is flu suggested?',
    input_dsl: '@goal suggests Fever Flu',
    expected_nl: 'True: Fever suggests Flu'
  },

  // === PHASE 6: Learn John has motive and opportunity ===
  {
    action: 'learn',
    input_nl: 'John has motive and opportunity',
    input_dsl: `
      has John Motive
      has John Opportunity
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 7: Learn suspect rule ===
  {
    action: 'learn',
    input_nl: 'Motive and opportunity imply suspect',
    input_dsl: `
      @det1 has John Motive
      @det2 has John Opportunity
      @det3cond And $det1 $det2
      @det3conc isSuspect John
      @det3 Implies $det3cond $det3conc
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 8: Prove John is suspect ===
  {
    action: 'prove',
    input_nl: 'Is John a suspect?',
    input_dsl: '@goal isSuspect John',
    expected_nl: 'True: John is isSuspect'
  },

  // === PHASE 9: Learn weather rules ===
  {
    action: 'learn',
    input_nl: 'Dark clouds imply rain',
    input_dsl: `
      @w1cond observed DarkClouds
      @w1conc expect Rain
      @w1 Implies $w1cond $w1conc
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 10: Observe dark clouds ===
  {
    action: 'learn',
    input_nl: 'Dark clouds are observed',
    input_dsl: 'observed DarkClouds',
    expected_nl: 'Learned 1 fact'
  },

  // === PHASE 11: Prove rain expected ===
  {
    action: 'prove',
    input_nl: 'Should we expect rain?',
    input_dsl: '@goal expect Rain',
    expected_nl: 'True: Rain is expect'
  },

  // === PHASE 12: Food chain inference ===
  {
    action: 'learn',
    input_nl: 'Eating plants implies herbivore',
    input_dsl: `
      @fc1cond eats Deer Plants
      @fc1conc isA Deer Herbivore
      @fc1 Implies $fc1cond $fc1conc
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 13: Animal eats plants ===
  {
    action: 'learn',
    input_nl: 'The deer eats plants',
    input_dsl: 'eats Deer Plants',
    expected_nl: 'Learned 1 fact'
  },

  // === PHASE 14: Prove deer is herbivore ===
  {
    action: 'prove',
    input_nl: 'Is the deer a herbivore?',
    input_dsl: '@goal isA Deer Herbivore',
    expected_nl: 'True: Deer is a herbivore'
  },

  // === PHASE 15: Query symptoms ===
  {
    action: 'query',
    input_nl: 'What symptoms are known?',
    input_dsl: '@q hasSymptom Patient ?symptom',
    expected_nl: 'Patient has fever'  // Both fever and cough are returned, but fever matches
  }
];

export default { name, description, theories, steps };
