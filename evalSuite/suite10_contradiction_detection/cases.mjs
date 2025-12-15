/**
 * Suite 10 - Contradiction Detection
 *
 * Tests detection of logical contradictions in knowledge base.
 * Contradictions occur when P and Not(P) or mutually exclusive facts exist.
 *
 * Core theories: 05-logic
 */

export const name = 'Contradiction Detection';
export const description = 'Test detection of logical contradictions in knowledge base';

export const theories = [
  '05-logic.sys2'
];

export const steps = [
  // === PHASE 1: Learn mutual exclusion rules (general) ===
  {
    action: 'learn',
    input_nl: 'Setup exclusion rules for contradictions',
    input_dsl: `
      @r1cond hasState ?x Open
      @r1conc Not (hasState ?x Closed)
      @r1 Implies $r1cond $r1conc
      @r2cond hasProperty ?x Hot
      @r2conc Not (hasProperty ?x Cold)
      @r2 Implies $r2cond $r2conc
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === PHASE 2: Learn box state with concrete inference rule ===
  {
    action: 'learn',
    input_nl: 'The box is closed. If the box is closed, the box is secure.',
    input_dsl: `
      hasState Box Closed
      @boxCond hasState Box Closed
      @boxConc hasProperty Box Secure
      @boxRule Implies $boxCond $boxConc
    `,
    expected_nl: 'Learned 4 facts'
  },

  // === PHASE 3: Prove box is secure (2-step rule chain) ===
  // CHAIN: closed(Box) + rule => secure(Box)
  {
    action: 'prove',
    input_nl: 'Is the box secure?',
    input_dsl: '@goal hasProperty Box Secure',
    expected_nl: 'True: Box is secure'
  },

  // === PHASE 4: Try to add contradictory fact ===
  {
    action: 'learn',
    input_nl: 'The box is also open (contradiction)',
    input_dsl: 'hasState Box Open',
    expected_nl: 'Warning: contradiction - Box is both Open and Closed'
  },

  // === PHASE 5: Learn water state with concrete inference rule ===
  {
    action: 'learn',
    input_nl: 'The water is hot. If the water is hot, it is steaming.',
    input_dsl: `
      hasProperty Water Hot
      @waterCond hasProperty Water Hot
      @waterConc hasProperty Water Steaming
      @waterRule Implies $waterCond $waterConc
    `,
    expected_nl: 'Learned 4 facts'
  },

  // === PHASE 6: Prove water is steaming (2-step rule chain) ===
  // CHAIN: hot(Water) + rule => steaming(Water)
  {
    action: 'prove',
    input_nl: 'Is the water steaming?',
    input_dsl: '@goal hasProperty Water Steaming',
    expected_nl: 'True: Water is steaming'
  },

  // === PHASE 7: Add contradictory temperature ===
  {
    action: 'learn',
    input_nl: 'The water is cold (contradiction)',
    input_dsl: 'hasProperty Water Cold',
    expected_nl: 'Warning: contradiction - Water is both Cold and Hot'
  },

  // === PHASE 8: Life state - alive ===
  {
    action: 'learn',
    input_nl: 'The cat is alive',
    input_dsl: 'hasState Cat Alive',
    expected_nl: 'Learned 1 fact'
  },

  // === PHASE 9: Life state - add dead (contradiction) ===
  {
    action: 'learn',
    input_nl: 'The cat is dead (Schrodinger paradox)',
    input_dsl: 'hasState Cat Dead',
    expected_nl: 'Warning: contradiction - Cat is both Dead and Alive'
  },

  // === PHASE 10: Direct P and Not(P) ===
  {
    action: 'learn',
    input_nl: 'The light is on',
    input_dsl: 'hasState Light On',
    expected_nl: 'Learned 1 fact'
  },

  // === PHASE 11: Add explicit negation ===
  {
    action: 'learn',
    input_nl: 'The light is not on',
    input_dsl: `
      @negL hasState Light On
      Not $negL
    `,
    expected_nl: 'Warning: direct contradiction detected'
  },

  // === PHASE 12: Category facts ===
  {
    action: 'learn',
    input_nl: 'A platypus is a mammal',
    input_dsl: 'isA Platypus Mammal',
    expected_nl: 'Learned 1 fact'
  },

  // === PHASE 13: Query platypus ===
  {
    action: 'query',
    input_nl: 'What is a platypus?',
    input_dsl: '@q isA Platypus ?what',
    expected_nl: 'Platypus is a mammal'
  },

  // === PHASE 14: Temporal facts ===
  {
    action: 'learn',
    input_nl: 'Event A is before Event B',
    input_dsl: 'before EventA EventB',
    expected_nl: 'Learned 1 fact'
  },

  // === PHASE 15: Temporal contradiction ===
  {
    action: 'learn',
    input_nl: 'Event A is after Event B (temporal paradox)',
    input_dsl: 'after EventA EventB',
    expected_nl: 'Warning: temporal contradiction'
  },

  // === PHASE 16: Consistent facts (no warning) ===
  {
    action: 'learn',
    input_nl: 'The car is red. The car is fast.',
    input_dsl: `
      hasProperty Car Red
      hasProperty Car Fast
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 17: Query car properties ===
  {
    action: 'query',
    input_nl: 'What properties does the car have?',
    input_dsl: '@q hasProperty Car ?prop',
    expected_nl: 'Car is red'
  },

  // === PHASE 18: Wet and Dry (mutually exclusive) ===
  {
    action: 'learn',
    input_nl: 'The towel is wet and dry',
    input_dsl: `
      hasProperty Towel Wet
      hasProperty Towel Dry
    `,
    expected_nl: 'Warning: contradiction - Towel is both Dry and Wet'
  },

  // === PHASE 19: Full and Empty ===
  {
    action: 'learn',
    input_nl: 'The glass is both full and empty',
    input_dsl: `
      hasState Glass Full
      hasState Glass Empty
    `,
    expected_nl: 'Warning: contradiction - Glass is both Empty and Full'
  },

  // === PHASE 20: Query consistent entity ===
  {
    action: 'query',
    input_nl: 'What is the platypus?',
    input_dsl: '@q isA Platypus ?type',
    expected_nl: 'Platypus is a mammal'
  }
];

export default { name, description, theories, steps };
