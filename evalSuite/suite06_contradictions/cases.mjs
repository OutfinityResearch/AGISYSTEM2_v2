/**
 * Suite 06 - Knowledge Consistency
 *
 * Tests learning and querying consistent knowledge.
 * Uses anonymous facts (persistent in KB).
 *
 * NOTE: Contradiction detection is not yet implemented.
 * We test that the system maintains correct knowledge state.
 *
 * Core theories: 05-logic, 09-roles
 */

export const name = 'Knowledge Consistency';
export const description = 'Test maintaining consistent knowledge state';

export const theories = [
  '05-logic.sys2',
  '09-roles.sys2'
];

export const steps = [
  // === PHASE 1: Learn animal taxonomy with hierarchy ===
  {
    action: 'learn',
    input_nl: 'Mammals are animals. Fish are animals. A whale is a mammal. A dolphin is a mammal. A shark is a fish.',
    input_dsl: `
      isA Mammal Animal
      isA Fish Animal
      isA Whale Mammal
      isA Dolphin Mammal
      isA Shark Fish
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 2: Verify whale is mammal ===
  {
    action: 'prove',
    input_nl: 'Is a whale a mammal?',
    input_dsl: '@goal isA Whale Mammal',
    expected_nl: 'True: Whale is a mammal'
  },

  // === PHASE 3: Query what whale is ===
  {
    action: 'query',
    input_nl: 'What is a whale?',
    input_dsl: '@q isA Whale ?class',
    expected_nl: 'Whale is a mammal'
  },

  // === PHASE 4: Query all mammals ===
  {
    action: 'query',
    input_nl: 'What mammals do we know?',
    input_dsl: '@q isA ?what Mammal',
    expected_nl: 'Whale is a mammal. Dolphin is a mammal'
  },

  // === PHASE 4b: Prove whale is an animal (2-step transitive) ===
  // CHAIN: Whale -> Mammal -> Animal
  {
    action: 'prove',
    input_nl: 'Is a whale an animal?',
    input_dsl: '@goal isA Whale Animal',
    expected_nl: 'True: Whale is an animal. Proof: Whale is a mammal. Mammal is an animal.'
  },

  // === PHASE 4c: Prove shark is an animal (2-step transitive) ===
  // CHAIN: Shark -> Fish -> Animal
  {
    action: 'prove',
    input_nl: 'Is a shark an animal?',
    input_dsl: '@goal isA Shark Animal',
    expected_nl: 'True: Shark is an animal. Proof: Shark is a fish. Fish is an animal.'
  },

  // === PHASE 5: Learn person locations ===
  {
    action: 'learn',
    input_nl: 'John is in Paris. Mary is in London. Alice is in Tokyo.',
    input_dsl: `
      locatedIn John Paris
      locatedIn Mary London
      locatedIn Alice Tokyo
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 6: Verify John's location ===
  {
    action: 'prove',
    input_nl: 'Is John in Paris?',
    input_dsl: '@goal locatedIn John Paris',
    expected_nl: 'True: John is in Paris'
  },

  // === PHASE 7: Query where John is ===
  {
    action: 'query',
    input_nl: 'Where is John?',
    input_dsl: '@q locatedIn John ?where',
    expected_nl: 'John is in Paris'
  },

  // === PHASE 8: Learn city and country locations ===
  {
    action: 'learn',
    input_nl: 'Paris is in France. London is in England. Tokyo is in Japan. France is in Europe. England is in Europe. Japan is in Asia.',
    input_dsl: `
      locatedIn Paris France
      locatedIn London England
      locatedIn Tokyo Japan
      locatedIn France Europe
      locatedIn England Europe
      locatedIn Japan Asia
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === PHASE 9: Query Paris location ===
  {
    action: 'query',
    input_nl: 'Where is Paris?',
    input_dsl: '@q locatedIn Paris ?country',
    expected_nl: 'Paris is in France'
  },

  // === PHASE 9b: Prove John is in France (2-step transitive) ===
  // CHAIN: John -> Paris -> France
  {
    action: 'prove',
    input_nl: 'Is John in France?',
    input_dsl: '@goal locatedIn John France',
    expected_nl: 'True: John is in France. Proof: John is in Paris. Paris is in France.'
  },

  // === PHASE 9c: Prove John is in Europe (3-step transitive) ===
  // CHAIN: John -> Paris -> France -> Europe
  {
    action: 'prove',
    input_nl: 'Is John in Europe?',
    input_dsl: '@goal locatedIn John Europe',
    expected_nl: 'True: John is in Europe. Proof: John is in Paris. Paris is in France. France is in Europe.'
  },

  // === PHASE 9d: Prove Mary is in Europe (3-step transitive) ===
  // CHAIN: Mary -> London -> England -> Europe
  {
    action: 'prove',
    input_nl: 'Is Mary in Europe?',
    input_dsl: '@goal locatedIn Mary Europe',
    expected_nl: 'True: Mary is in Europe. Proof: Mary is in London. London is in England. England is in Europe.'
  },

  // === PHASE 9e: Prove Alice is in Asia (3-step transitive) ===
  // CHAIN: Alice -> Tokyo -> Japan -> Asia
  {
    action: 'prove',
    input_nl: 'Is Alice in Asia?',
    input_dsl: '@goal locatedIn Alice Asia',
    expected_nl: 'True: Alice is in Asia. Proof: Alice is in Tokyo. Tokyo is in Japan. Japan is in Asia.'
  },

  // === PHASE 10: Learn relationships ===
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

  // === PHASE 11: Prove John loves Mary ===
  {
    action: 'prove',
    input_nl: 'Does John love Mary?',
    input_dsl: '@goal love John Mary',
    expected_nl: 'True: John loves Mary'
  },

  // === PHASE 12: Query John's love ===
  {
    action: 'query',
    input_nl: 'Who does John love?',
    input_dsl: '@q love John ?who',
    expected_nl: 'John loves Mary'
  },

  // === PHASE 13: Learn object properties ===
  {
    action: 'learn',
    input_nl: 'The door is closed. The window is open. The light is on.',
    input_dsl: `
      hasProperty Door closed
      hasProperty Window open
      hasProperty Light on
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 14: Prove door is closed ===
  {
    action: 'prove',
    input_nl: 'Is the door closed?',
    input_dsl: '@goal hasProperty Door closed',
    expected_nl: 'True: Door is closed'
  },

  // === PHASE 15: Learn more about door ===
  {
    action: 'learn',
    input_nl: 'The door is locked. The door is heavy.',
    input_dsl: `
      hasProperty Door locked
      hasProperty Door heavy
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 16: Prove door is locked ===
  {
    action: 'prove',
    input_nl: 'Is the door locked?',
    input_dsl: '@goal hasProperty Door locked',
    expected_nl: 'True: Door is locked'
  },

  // === PHASE 17: Learn categories with hierarchy ===
  {
    action: 'learn',
    input_nl: 'Cats are mammals. Dogs are mammals. Birds are animals. Fluffy is a cat. Rex is a dog. Tweety is a bird.',
    input_dsl: `
      isA Cat Mammal
      isA Dog Mammal
      isA Bird Animal
      isA Fluffy Cat
      isA Rex Dog
      isA Tweety Bird
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === PHASE 18: Query what Fluffy is ===
  {
    action: 'query',
    input_nl: 'What is Fluffy?',
    input_dsl: '@q isA Fluffy ?what',
    expected_nl: 'Fluffy is a cat'
  },

  // === PHASE 19: Prove Fluffy is a cat (direct) ===
  {
    action: 'prove',
    input_nl: 'Is Fluffy a cat?',
    input_dsl: '@goal isA Fluffy Cat',
    expected_nl: 'True: Fluffy is a cat'
  },

  // === PHASE 19b: Prove Fluffy is a mammal (2-step transitive) ===
  // CHAIN: Fluffy -> Cat -> Mammal
  {
    action: 'prove',
    input_nl: 'Is Fluffy a mammal?',
    input_dsl: '@goal isA Fluffy Mammal',
    expected_nl: 'True: Fluffy is a mammal. Proof: Fluffy is a cat. Cat is a mammal.'
  },

  // === PHASE 19c: Prove Fluffy is an animal (3-step transitive) ===
  // CHAIN: Fluffy -> Cat -> Mammal -> Animal
  {
    action: 'prove',
    input_nl: 'Is Fluffy an animal?',
    input_dsl: '@goal isA Fluffy Animal',
    expected_nl: 'True: Fluffy is an animal. Proof: Fluffy is a cat. Cat is a mammal. Mammal is an animal.'
  },

  // === PHASE 19d: Prove Rex is an animal (3-step transitive) ===
  // CHAIN: Rex -> Dog -> Mammal -> Animal
  {
    action: 'prove',
    input_nl: 'Is Rex an animal?',
    input_dsl: '@goal isA Rex Animal',
    expected_nl: 'True: Rex is an animal. Proof: Rex is a dog. Dog is a mammal. Mammal is an animal.'
  },

  // === PHASE 19e: Prove Tweety is an animal (2-step transitive) ===
  // CHAIN: Tweety -> Bird -> Animal
  {
    action: 'prove',
    input_nl: 'Is Tweety an animal?',
    input_dsl: '@goal isA Tweety Animal',
    expected_nl: 'True: Tweety is an animal. Proof: Tweety is a bird. Bird is an animal.'
  },

  // === PHASE 20: Query all cats ===
  {
    action: 'query',
    input_nl: 'Who is a cat?',
    input_dsl: '@q isA ?who Cat',
    expected_nl: 'Fluffy is a cat'
  }
];

export default { name, description, theories, steps };
