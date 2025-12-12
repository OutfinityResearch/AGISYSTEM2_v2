/**
 * Suite 05 - Negation and Logic
 *
 * A conversation testing negation, logical consistency, and failure cases.
 * Tests: learn positive/negative facts → query/prove with negation context
 *
 * Core theories: 05-logic (Not, And, Or, Implies)
 *
 * IMPORTANT: Uses @var for temporary refs, @var:name for KB persistence
 * - @neg creates temp variable NOT in KB
 * - @f:name Not $neg creates negation IN KB
 */

export const name = 'Negation and Logic';
export const description = 'Learn and reason with negation patterns and logical operators';

export const theories = [
  '05-logic.sys2'
];

export const steps = [
  // === PHASE 1: Learn love with negation ===
  {
    action: 'learn',
    input_nl: `John loves Mary. John does not love Alice.
               Mary loves John. Alice does not love John.`,
    input_dsl: `
      love John Mary
      @neg1 love John Alice
      @n1:negJohnAlice Not $neg1
      love Mary John
      @neg2 love Alice John
      @n2:negAliceJohn Not $neg2
    `,
    expected_nl: 'Learned 4 facts'
  },

  // === PHASE 2: Query positive fact among negatives ===
  {
    action: 'query',
    input_nl: 'Who does John love?',
    input_dsl: '@q love John ?who',
    expected_nl: 'John loves Mary'
  },

  // === PHASE 3: Prove something that was negated - should fail ===
  {
    action: 'prove',
    input_nl: 'Does John love Alice?',
    input_dsl: '@goal love John Alice',
    expected_nl: 'No'
  },

  // === PHASE 4: Learn whale classification with negation ===
  {
    action: 'learn',
    input_nl: `A whale is a mammal. A whale is not a fish.
               A bat is a mammal. A bat is not a bird.`,
    input_dsl: `
      isA Whale Mammal
      @negw isA Whale Fish
      @nw:whaleNotFish Not $negw
      isA Bat Mammal
      @negb isA Bat Bird
      @nb:batNotBird Not $negb
    `,
    expected_nl: 'Learned 4 facts'
  },

  // === PHASE 5: Query whale class ===
  {
    action: 'query',
    input_nl: 'What is a whale?',
    input_dsl: '@q isA Whale ?class',
    expected_nl: 'Whale is a mammal'
  },

  // === PHASE 6: Prove whale is not fish (should fail - the positive is not in KB) ===
  {
    action: 'prove',
    input_nl: 'Is a whale a fish?',
    input_dsl: '@goal isA Whale Fish',
    expected_nl: 'No'
  },

  // === PHASE 7: Learn sky properties with negation ===
  {
    action: 'learn',
    input_nl: `The sky is blue. The sky is not green.
               Fire is hot. Fire is not cold.`,
    input_dsl: `
      hasProperty Sky blue
      @negs hasProperty Sky green
      @ns:skyNotGreen Not $negs
      hasProperty Fire hot
      @negf hasProperty Fire cold
      @nf:fireNotCold Not $negf
    `,
    expected_nl: 'Learned 4 facts'
  },

  // === PHASE 8: Query sky property ===
  {
    action: 'query',
    input_nl: 'What color is the sky?',
    input_dsl: '@q hasProperty Sky ?prop',
    expected_nl: 'The sky is blue'
  },

  // === PHASE 9: Prove sky is not green ===
  {
    action: 'prove',
    input_nl: 'Is the sky green?',
    input_dsl: '@goal hasProperty Sky green',
    expected_nl: 'No'
  },

  // === PHASE 10: Learn help with negation ===
  {
    action: 'learn',
    input_nl: `John helps Mary. John does not help Alice.
               Alice teaches Bob. Alice does not teach Charlie.`,
    input_dsl: `
      help John Mary
      @negh help John Alice
      @nh:johnNotHelpAlice Not $negh
      teach Alice Bob
      @negt teach Alice Charlie
      @nt:aliceNotTeachCharlie Not $negt
    `,
    expected_nl: 'Learned 4 facts'
  },

  // === PHASE 11: Prove negated action - should fail ===
  {
    action: 'prove',
    input_nl: 'Does John help Alice?',
    input_dsl: '@goal help John Alice',
    expected_nl: 'No'
  },

  // === PHASE 12: Query who John helps ===
  {
    action: 'query',
    input_nl: 'Who does John help?',
    input_dsl: '@q help John ?who',
    expected_nl: 'John helps Mary'
  }
];

export default { name, description, theories, steps };
