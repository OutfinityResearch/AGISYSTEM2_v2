/**
 * Suite 13 - Temporal Reasoning
 *
 * Tests direct temporal relations: Before, After, During, Causes.
 *
 * Core theories: 05-logic, 06-temporal
 */

export const name = 'Temporal Reasoning';
export const description = 'Test direct temporal relations';

export const theories = [
  '05-logic.sys2',
  '06-temporal.sys2'
];

// Simplified - test direct temporal facts
export const steps = [
  // === PHASE 1: Learn historical events ===
  {
    action: 'learn',
    input_nl: 'WW1 was before TreatyOfVersailles. WW2 was after TreatyOfVersailles.',
    input_dsl: `
      before WW1 TreatyOfVersailles
      after WW2 TreatyOfVersailles
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 2: Direct before ===
  {
    action: 'prove',
    input_nl: 'Was WW1 before TreatyOfVersailles?',
    input_dsl: '@goal before WW1 TreatyOfVersailles',
    expected_nl: 'True: WW1 before TreatyOfVersailles'
  },

  // === PHASE 3: Direct after ===
  {
    action: 'prove',
    input_nl: 'Was WW2 after TreatyOfVersailles?',
    input_dsl: '@goal after WW2 TreatyOfVersailles',
    expected_nl: 'True: WW2 after TreatyOfVersailles'
  },

  // === PHASE 4: Query what was before ===
  {
    action: 'query',
    input_nl: 'What was before TreatyOfVersailles?',
    input_dsl: '@q before ?event TreatyOfVersailles',
    expected_nl: 'WW1 before TreatyOfVersailles'
  },

  // === PHASE 5: Learn daily routine ===
  {
    action: 'learn',
    input_nl: 'WakeUp before Breakfast. Breakfast before Work. Work before Dinner.',
    input_dsl: `
      before WakeUp Breakfast
      before Breakfast Work
      before Work Dinner
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 6: Direct routine query ===
  {
    action: 'prove',
    input_nl: 'Is WakeUp before Breakfast?',
    input_dsl: '@goal before WakeUp Breakfast',
    expected_nl: 'True: WakeUp before Breakfast'
  },

  // === PHASE 7: Negative - not direct ===
  {
    action: 'prove',
    input_nl: 'Is WakeUp before Dinner directly?',
    input_dsl: '@goal before WakeUp Dinner',
    expected_nl: 'Cannot prove: WakeUp before Dinner'
  },

  // === PHASE 8: Learn during relations ===
  {
    action: 'learn',
    input_nl: 'CodeReview during Implementation. Testing during Implementation.',
    input_dsl: `
      during CodeReview Implementation
      during Testing Implementation
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 9: Query during ===
  {
    action: 'prove',
    input_nl: 'Does CodeReview happen during Implementation?',
    input_dsl: '@goal during CodeReview Implementation',
    expected_nl: 'True: CodeReview during Implementation'
  },

  // === PHASE 10: Learn causation ===
  {
    action: 'learn',
    input_nl: 'Alarm caused Evacuation. Rain caused Flood.',
    input_dsl: `
      causes Alarm Evacuation
      causes Rain Flood
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 11: Prove causation ===
  {
    action: 'prove',
    input_nl: 'Did Alarm cause Evacuation?',
    input_dsl: '@goal causes Alarm Evacuation',
    expected_nl: 'True: Alarm causes Evacuation'
  },

  // === PHASE 12: Query causes ===
  {
    action: 'query',
    input_nl: 'What caused Flood?',
    input_dsl: '@q causes ?cause Flood',
    expected_nl: 'Rain causes Flood'
  },

  // === PHASE 13: Negative - no relation ===
  {
    action: 'prove',
    input_nl: 'Did Sun cause Evacuation?',
    input_dsl: '@goal causes Sun Evacuation',
    expected_nl: 'Cannot prove: Sun causes Evacuation'
  },

  // === PHASE 14: Temporal contradiction ===
  {
    action: 'learn',
    input_nl: 'Meeting before Lunch',
    input_dsl: 'before Meeting Lunch',
    expected_nl: 'Learned 1 fact'
  },

  // === PHASE 15: Try contradicting (after when we said before) ===
  {
    action: 'learn',
    input_nl: 'Meeting after Lunch (contradiction)',
    input_dsl: 'after Meeting Lunch',
    expected_nl: 'Warning: temporal contradiction'
  }
];

export default { name, description, theories, steps };
