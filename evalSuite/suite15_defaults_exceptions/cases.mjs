/**
 * Suite 15 - Defaults and Exceptions
 *
 * Tests direct ability and status facts.
 * Simplified to test direct assertions without quantified rules.
 *
 * Core theories: 05-logic, 08-defaults
 */

export const name = 'Defaults and Exceptions';
export const description = 'Test direct ability and status facts';

export const theories = [
  '05-logic.sys2',
  '08-defaults.sys2'
];

export const timeout = 2000;

// Includes type hierarchies for transitive reasoning
export const steps = [
  // === PHASE 0: Setup creature type hierarchy (4 levels) ===
  // Creature > Animal > Bird/Mammal/Fish
  // Bird > Canary/Penguin
  {
    action: 'learn',
    input_nl: 'Build creature hierarchy: Creature > Animal > Bird/Mammal > Canary/Penguin',
    input_dsl: `
      isA Animal Creature
      isA Bird Animal
      isA Mammal Animal
      isA Fish Animal
      isA Canary Bird
      isA Penguin Bird
      isA Elephant Mammal
      isA Clownfish Fish
      isA Tweety Canary
      isA Opus Penguin
      isA Dumbo Elephant
      isA Nemo Clownfish
    `,
    expected_nl: 'Learned 12 facts'
  },

  // === PHASE 1: Learn bird abilities ===
  {
    action: 'learn',
    input_nl: 'Tweety can fly. Opus cannot fly. Opus can swim.',
    input_dsl: `
      can Tweety Fly
      cannot Opus Fly
      can Opus Swim
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 2: Prove Tweety can fly ===
  {
    action: 'prove',
    input_nl: 'Can Tweety fly?',
    input_dsl: '@goal can Tweety Fly',
    expected_nl: 'True: Tweety can Fly'
  },

  // === PHASE 3: Query what Tweety can do ===
  {
    action: 'query',
    input_nl: 'What can Tweety do?',
    input_dsl: '@q can Tweety ?ability',
    expected_nl: 'Tweety can Fly'
  },

  // === PHASE 4: Prove Opus cannot fly ===
  {
    action: 'prove',
    input_nl: 'Can Opus fly?',
    input_dsl: '@goal cannot Opus Fly',
    expected_nl: 'True: Opus cannot Fly'
  },

  // === PHASE 5: Prove Opus can swim ===
  {
    action: 'prove',
    input_nl: 'Can Opus swim?',
    input_dsl: '@goal can Opus Swim',
    expected_nl: 'True: Opus can Swim'
  },

  // === PHASE 5b: Prove Tweety is a Bird (2-step transitive) ===
  // CHAIN: Tweety -> Canary -> Bird
  {
    action: 'prove',
    input_nl: 'Is Tweety a Bird?',
    input_dsl: '@goal isA Tweety Bird',
    expected_nl: 'True: Tweety is a bird. Proof: Tweety is a canary. Canary is a bird.'
  },

  // === PHASE 5c: Prove Tweety is an Animal (3-step transitive) ===
  // CHAIN: Tweety -> Canary -> Bird -> Animal
  {
    action: 'prove',
    input_nl: 'Is Tweety an Animal?',
    input_dsl: '@goal isA Tweety Animal',
    expected_nl: 'True: Tweety is an animal. Proof: Tweety is a canary. Canary is a bird. Bird is an animal.'
  },

  // === PHASE 5d: Prove Tweety is a Creature (4-step transitive) ===
  // CHAIN: Tweety -> Canary -> Bird -> Animal -> Creature
  {
    action: 'prove',
    input_nl: 'Is Tweety a Creature?',
    input_dsl: '@goal isA Tweety Creature',
    expected_nl: 'True: Tweety is a creature. Proof: Tweety is a canary. Canary is a bird. Bird is an animal. Animal is a creature.'
  },

  // === PHASE 5e: Prove Opus is a Creature (4-step transitive) ===
  // CHAIN: Opus -> Penguin -> Bird -> Animal -> Creature
  {
    action: 'prove',
    input_nl: 'Is Opus a Creature?',
    input_dsl: '@goal isA Opus Creature',
    expected_nl: 'True: Opus is a creature. Proof: Opus is a penguin. Penguin is a bird. Bird is an animal. Animal is a creature.'
  },

  // === PHASE 5f: Prove Nemo is a Creature (4-step transitive) ===
  // CHAIN: Nemo -> Clownfish -> Fish -> Animal -> Creature
  {
    action: 'prove',
    input_nl: 'Is Nemo a Creature?',
    input_dsl: '@goal isA Nemo Creature',
    expected_nl: 'True: Nemo is a creature. Proof: Nemo is a clownfish. Clownfish is a fish. Fish is an animal. Animal is a creature.'
  },

  // === PHASE 6: Learn mammal abilities ===
  {
    action: 'learn',
    input_nl: 'Dumbo cannot fly. Bruce can fly.',
    input_dsl: `
      cannot Dumbo Fly
      can Bruce Fly
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 7: Prove Dumbo cannot fly ===
  {
    action: 'prove',
    input_nl: 'Can Dumbo fly?',
    input_dsl: '@goal cannot Dumbo Fly',
    expected_nl: 'True: Dumbo cannot Fly'
  },

  // === PHASE 8: Prove Bruce can fly ===
  {
    action: 'prove',
    input_nl: 'Can Bruce fly?',
    input_dsl: '@goal can Bruce Fly',
    expected_nl: 'True: Bruce can Fly'
  },

  // === PHASE 9: Learn status facts ===
  {
    action: 'learn',
    input_nl: 'John is innocent. Mary is guilty.',
    input_dsl: `
      hasStatus John Innocent
      hasStatus Mary Guilty
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 10: Prove John is innocent ===
  {
    action: 'prove',
    input_nl: 'Is John innocent?',
    input_dsl: '@goal hasStatus John Innocent',
    expected_nl: 'True: John is innocent'
  },

  // === PHASE 11: Query John status ===
  {
    action: 'query',
    input_nl: 'What is John status?',
    input_dsl: '@q hasStatus John ?status',
    expected_nl: 'John is innocent'
  },

  // === PHASE 12: Prove Mary is guilty ===
  {
    action: 'prove',
    input_nl: 'Is Mary guilty?',
    input_dsl: '@goal hasStatus Mary Guilty',
    expected_nl: 'True: Mary is guilty'
  },

  // === PHASE 13: Learn livesIn facts ===
  {
    action: 'learn',
    input_nl: 'Nemo lives in water. Simba lives in savanna.',
    input_dsl: `
      livesIn Nemo Water
      livesIn Simba Savanna
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 14: Prove Nemo lives in water ===
  {
    action: 'prove',
    input_nl: 'Does Nemo live in water?',
    input_dsl: '@goal livesIn Nemo Water',
    expected_nl: 'True: Nemo is in Water'
  },

  // === PHASE 15: Query where Nemo lives ===
  {
    action: 'query',
    input_nl: 'Where does Nemo live?',
    input_dsl: '@q livesIn Nemo ?place',
    expected_nl: 'Nemo is in Water'
  },

  // === PHASE 16: Learn more abilities ===
  {
    action: 'learn',
    input_nl: 'HappyFeet can swim. HappyFeet cannot fly.',
    input_dsl: `
      can HappyFeet Swim
      cannot HappyFeet Fly
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 17: Prove HappyFeet can swim ===
  {
    action: 'prove',
    input_nl: 'Can Happy Feet swim?',
    input_dsl: '@goal can HappyFeet Swim',
    expected_nl: 'True: HappyFeet can Swim'
  },

  // === PHASE 18: Negative - no ability ===
  {
    action: 'prove',
    input_nl: 'Can Nemo fly?',
    input_dsl: '@goal can Nemo Fly',
    expected_nl: 'Cannot prove: Nemo can Fly'
  },

  // === PHASE 19: Negative - no status ===
  {
    action: 'prove',
    input_nl: 'Is Bob innocent?',
    input_dsl: '@goal hasStatus Bob Innocent',
    expected_nl: 'Cannot prove: Bob is innocent'
  },

  // === PHASE 20: Negative - no location ===
  {
    action: 'prove',
    input_nl: 'Does Bruce live in water?',
    input_dsl: '@goal livesIn Bruce Water',
    expected_nl: 'Cannot prove: Bruce is in Water'
  }
];

export default { name, description, theories, steps };
