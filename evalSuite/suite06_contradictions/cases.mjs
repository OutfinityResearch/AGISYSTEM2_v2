/**
 * Suite 06 - Contradiction Detection and Rejection
 *
 * A conversation testing the system's ability to detect and reject contradictory facts.
 * Tests: learn facts → try to learn contradictions → expect rejection with explanation
 *
 * Core theories: 05-logic (Not), 06-consistency
 */

export const name = 'Contradiction Detection';
export const description = 'Test rejection of facts that contradict existing knowledge';

export const theories = [
  '05-logic.sys2',
  '06-consistency.sys2'
];

export const steps = [
  // === PHASE 1: Learn basic taxonomy ===
  {
    action: 'learn',
    input_nl: `A whale is a mammal. A whale is not a fish.
               A bat is a mammal. A bat is not a bird.`,
    input_dsl: `
      @w1 isA Whale Mammal
      @negw isA Whale Fish
      @w2 Not $negw
      @b1 isA Bat Mammal
      @negb isA Bat Bird
      @b2 Not $negb
    `,
    expected_nl: 'Learned 2 positive and 2 negative classification facts'
  },

  // === PHASE 2: Verify whale is mammal ===
  {
    action: 'prove',
    input_nl: 'Is a whale a mammal?',
    input_dsl: '@goal isA Whale Mammal',
    expected_nl: 'Yes, a whale is a mammal'
  },

  // === PHASE 3: Try to learn contradiction - whale is fish ===
  {
    action: 'learn',
    input_nl: 'A whale is a fish.',
    input_dsl: '@contra isA Whale Fish',
    expected_nl: 'REJECTED: Cannot learn "whale is a fish" because it contradicts existing knowledge that "whale is NOT a fish"'
  },

  // === PHASE 4: Verify knowledge unchanged ===
  {
    action: 'query',
    input_nl: 'What is a whale?',
    input_dsl: '@q isA Whale ?class',
    expected_nl: 'Whale is a mammal'
  },

  // === PHASE 5: Learn person properties ===
  {
    action: 'learn',
    input_nl: `John is alive. John lives in Paris.
               Mary is alive. Mary lives in London.`,
    input_dsl: `
      @p1 hasProperty John alive
      @p2 livesIn John Paris
      @p3 hasProperty Mary alive
      @p4 livesIn Mary London
    `,
    expected_nl: 'Learned 4 facts about people'
  },

  // === PHASE 6: Learn death - explicit negation ===
  {
    action: 'learn',
    input_nl: 'Bob is dead. Bob is not alive.',
    input_dsl: `
      @d1 hasProperty Bob dead
      @negb hasProperty Bob alive
      @d2 Not $negb
    `,
    expected_nl: 'Learned that Bob is dead (not alive)'
  },

  // === PHASE 7: Try to learn Bob is alive - contradiction ===
  {
    action: 'learn',
    input_nl: 'Bob is alive.',
    input_dsl: '@contra hasProperty Bob alive',
    expected_nl: 'REJECTED: Cannot learn "Bob is alive" because it contradicts existing knowledge that "Bob is NOT alive"'
  },

  // === PHASE 8: Verify Bob state unchanged ===
  {
    action: 'prove',
    input_nl: 'Is Bob dead?',
    input_dsl: '@goal hasProperty Bob dead',
    expected_nl: 'Yes, Bob is dead'
  },

  // === PHASE 9: Learn exclusive properties ===
  {
    action: 'learn',
    input_nl: `The traffic light is red. The traffic light is not green.
               The traffic light is not yellow.`,
    input_dsl: `
      @t1 hasProperty TrafficLight red
      @negt1 hasProperty TrafficLight green
      @t2 Not $negt1
      @negt2 hasProperty TrafficLight yellow
      @t3 Not $negt2
    `,
    expected_nl: 'Learned traffic light is red (not green, not yellow)'
  },

  // === PHASE 10: Try to learn traffic light is green - contradiction ===
  {
    action: 'learn',
    input_nl: 'The traffic light is green.',
    input_dsl: '@contra hasProperty TrafficLight green',
    expected_nl: 'REJECTED: Cannot learn "traffic light is green" because it contradicts existing knowledge that "traffic light is NOT green"'
  },

  // === PHASE 11: Learn location facts ===
  {
    action: 'learn',
    input_nl: `Paris is in France. Paris is not in Germany.
               Berlin is in Germany. Berlin is not in France.`,
    input_dsl: `
      @l1 locatedIn Paris France
      @negl1 locatedIn Paris Germany
      @l2 Not $negl1
      @l3 locatedIn Berlin Germany
      @negl2 locatedIn Berlin France
      @l4 Not $negl2
    `,
    expected_nl: 'Learned 2 positive and 2 negative location facts'
  },

  // === PHASE 12: Try to learn Paris in Germany - contradiction ===
  {
    action: 'learn',
    input_nl: 'Paris is in Germany.',
    input_dsl: '@contra locatedIn Paris Germany',
    expected_nl: 'REJECTED: Cannot learn "Paris is in Germany" because it contradicts existing knowledge that "Paris is NOT in Germany"'
  },

  // === PHASE 13: Verify Paris location unchanged ===
  {
    action: 'query',
    input_nl: 'Where is Paris?',
    input_dsl: '@q locatedIn Paris ?country',
    expected_nl: 'Paris is in France'
  },

  // === PHASE 14: Learn relationship facts ===
  {
    action: 'learn',
    input_nl: `John loves Mary. John does not love Alice.
               Mary loves John. Alice does not love John.`,
    input_dsl: `
      @r1 love John Mary
      @negr1 love John Alice
      @r2 Not $negr1
      @r3 love Mary John
      @negr2 love Alice John
      @r4 Not $negr2
    `,
    expected_nl: 'Learned 2 positive and 2 negative love facts'
  },

  // === PHASE 15: Try to learn John loves Alice - contradiction ===
  {
    action: 'learn',
    input_nl: 'John loves Alice.',
    input_dsl: '@contra love John Alice',
    expected_nl: 'REJECTED: Cannot learn "John loves Alice" because it contradicts existing knowledge that "John does NOT love Alice"'
  },

  // === PHASE 16: Verify John's love unchanged ===
  {
    action: 'query',
    input_nl: 'Who does John love?',
    input_dsl: '@q love John ?who',
    expected_nl: 'John loves Mary'
  },

  // === PHASE 17: Learn temporal state ===
  {
    action: 'learn',
    input_nl: `The door is closed. The door is not open.
               The window is open. The window is not closed.`,
    input_dsl: `
      @s1 hasProperty Door closed
      @negs1 hasProperty Door open
      @s2 Not $negs1
      @s3 hasProperty Window open
      @negs2 hasProperty Window closed
      @s4 Not $negs2
    `,
    expected_nl: 'Learned door is closed, window is open'
  },

  // === PHASE 18: Try to learn door is open - contradiction ===
  {
    action: 'learn',
    input_nl: 'The door is open.',
    input_dsl: '@contra hasProperty Door open',
    expected_nl: 'REJECTED: Cannot learn "door is open" because it contradicts existing knowledge that "door is NOT open"'
  },

  // === PHASE 19: Prove door state ===
  {
    action: 'prove',
    input_nl: 'Is the door closed?',
    input_dsl: '@goal hasProperty Door closed',
    expected_nl: 'Yes, the door is closed'
  },

  // === PHASE 20: Successful learn of non-contradictory fact ===
  {
    action: 'learn',
    input_nl: 'The door is locked.',
    input_dsl: '@new hasProperty Door locked',
    expected_nl: 'Learned that the door is locked'
  },

  // === PHASE 21: Query all door properties ===
  {
    action: 'query',
    input_nl: 'What properties does the door have?',
    input_dsl: '@q hasProperty Door ?prop',
    expected_nl: 'The door is closed and locked'
  },

  // === PHASE 22: Learn mutually exclusive categories ===
  {
    action: 'learn',
    input_nl: `Cats are not dogs. Dogs are not cats.
               Birds are not fish. Fish are not birds.`,
    input_dsl: `
      @m1 isA Cat Dog
      @m2 Not $m1
      @m3 isA Dog Cat
      @m4 Not $m3
      @m5 isA Bird Fish
      @m6 Not $m5
      @m7 isA Fish Bird
      @m8 Not $m7
    `,
    expected_nl: 'Learned 4 mutual exclusion facts'
  },

  // === PHASE 23: Fluffy is a cat ===
  {
    action: 'learn',
    input_nl: 'Fluffy is a cat.',
    input_dsl: '@f1 isA Fluffy Cat',
    expected_nl: 'Learned that Fluffy is a cat'
  },

  // === PHASE 24: Try to learn Fluffy is a dog ===
  {
    action: 'learn',
    input_nl: 'Fluffy is a dog.',
    input_dsl: '@contra isA Fluffy Dog',
    expected_nl: 'REJECTED: Cannot learn "Fluffy is a dog" because Fluffy is already a cat, and cats are not dogs'
  },

  // === PHASE 25: Final verification - Fluffy is still just a cat ===
  {
    action: 'query',
    input_nl: 'What is Fluffy?',
    input_dsl: '@q isA Fluffy ?what',
    expected_nl: 'Fluffy is a cat'
  }
];

export default { name, description, theories, steps };
