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
  // === PHASE 1: Setup deep hierarchy for transitive proofs (5 levels) ===
  // Entity > Organism > Animal > Vertebrate > Mammal/Bird
  {
    action: 'learn',
    input_nl: 'Build deep hierarchy: Entity > Organism > Animal > Vertebrate > Mammal/Bird',
    input_dsl: `
      isA Organism Entity
      isA Animal Organism
      isA Vertebrate Animal
      isA Mammal Vertebrate
      isA Bird Vertebrate
      isA Fish Vertebrate
    `,
    expected_nl: 'Learned 6 facts'
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

  // === PHASE 8: Prove whale is Vertebrate (2-step transitive) ===
  // CHAIN: Whale -> Mammal -> Vertebrate
  {
    action: 'prove',
    input_nl: 'Is a whale a vertebrate?',
    input_dsl: '@goal isA Whale Vertebrate',
    expected_nl: 'True: Whale is a vertebrate. Proof: Whale is a mammal. Mammal is a vertebrate.'
  },

  // === PHASE 8b: Prove whale is Animal (3-step transitive) ===
  // CHAIN: Whale -> Mammal -> Vertebrate -> Animal
  {
    action: 'prove',
    input_nl: 'Is a whale an animal?',
    input_dsl: '@goal isA Whale Animal',
    expected_nl: 'True: Whale is an animal. Proof: Whale is a mammal. Mammal is a vertebrate. Vertebrate is an animal.'
  },

  // === PHASE 8c: Prove whale is Organism (4-step transitive) ===
  // CHAIN: Whale -> Mammal -> Vertebrate -> Animal -> Organism
  {
    action: 'prove',
    input_nl: 'Is a whale an organism?',
    input_dsl: '@goal isA Whale Organism',
    expected_nl: 'True: Whale is an organism. Proof: Whale is a mammal. Mammal is a vertebrate. Vertebrate is an animal. Animal is an organism.'
  },

  // === PHASE 8d: Prove whale is Entity (5-step transitive) ===
  // CHAIN: Whale -> Mammal -> Vertebrate -> Animal -> Organism -> Entity
  {
    action: 'prove',
    input_nl: 'Is a whale an entity?',
    input_dsl: '@goal isA Whale Entity',
    expected_nl: 'True: Whale is an entity. Proof: Whale is a mammal. Mammal is a vertebrate. Vertebrate is an animal. Animal is an organism. Organism is an entity.'
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

  // === PHASE 11: Prove bat is Animal (3-step transitive) ===
  // CHAIN: Bat -> Mammal -> Vertebrate -> Animal
  {
    action: 'prove',
    input_nl: 'Is a bat an animal?',
    input_dsl: '@goal isA Bat Animal',
    expected_nl: 'True: Bat is an animal. Proof: Bat is a mammal. Mammal is a vertebrate. Vertebrate is an animal.'
  },

  // === PHASE 11b: Prove bat is Entity (5-step transitive) ===
  // CHAIN: Bat -> Mammal -> Vertebrate -> Animal -> Organism -> Entity
  {
    action: 'prove',
    input_nl: 'Is a bat an entity?',
    input_dsl: '@goal isA Bat Entity',
    expected_nl: 'True: Bat is an entity. Proof: Bat is a mammal. Mammal is a vertebrate. Vertebrate is an animal. Animal is an organism. Organism is an entity.'
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
  },

  // ============================================================
  // EXTENDED NEGATION TESTS - Focus on what things are NOT
  // ============================================================

  // === PHASE 21: Learn what penguin is NOT ===
  {
    action: 'learn',
    input_nl: 'Penguin is a bird. Penguin is not a mammal. Penguin cannot fly.',
    input_dsl: `
      isA Penguin Bird
      @negPengMammal isA Penguin Mammal
      Not $negPengMammal
      @negPengFly can Penguin Fly
      Not $negPengFly
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 22: Prove what penguin is NOT ===
  {
    action: 'prove',
    input_nl: 'Is a penguin a mammal?',
    input_dsl: '@goal isA Penguin Mammal',
    expected_nl: 'Cannot prove: Penguin is a mammal'
  },

  // === PHASE 23: Prove penguin cannot fly ===
  {
    action: 'prove',
    input_nl: 'Can a penguin fly?',
    input_dsl: '@goal can Penguin Fly',
    expected_nl: 'Cannot prove: Penguin can Fly'
  },

  // === PHASE 24: But penguin IS an animal (transitive through bird) ===
  // CHAIN: Penguin -> Bird -> Vertebrate -> Animal
  {
    action: 'prove',
    input_nl: 'Is a penguin an animal?',
    input_dsl: '@goal isA Penguin Animal',
    expected_nl: 'True: Penguin is an animal. Proof: Penguin is a bird. Bird is a vertebrate. Vertebrate is an animal.'
  },

  // === PHASE 25: Learn spider negations ===
  {
    action: 'learn',
    input_nl: 'Spider is not an insect. Spider is not a mammal. Spider is not a bird.',
    input_dsl: `
      @negSpidInsect isA Spider Insect
      Not $negSpidInsect
      @negSpidMammal isA Spider Mammal
      Not $negSpidMammal
      @negSpidBird isA Spider Bird
      Not $negSpidBird
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === PHASE 26: Prove spider is NOT an insect ===
  {
    action: 'prove',
    input_nl: 'Is a spider an insect?',
    input_dsl: '@goal isA Spider Insect',
    expected_nl: 'Cannot prove: Spider is an insect'
  },

  // === PHASE 27: Prove spider is NOT a mammal ===
  {
    action: 'prove',
    input_nl: 'Is a spider a mammal?',
    input_dsl: '@goal isA Spider Mammal',
    expected_nl: 'Cannot prove: Spider is a mammal'
  },

  // === PHASE 28: Prove spider is NOT a bird ===
  {
    action: 'prove',
    input_nl: 'Is a spider a bird?',
    input_dsl: '@goal isA Spider Bird',
    expected_nl: 'Cannot prove: Spider is a bird'
  },

  // === PHASE 29: Learn what tomato is NOT ===
  {
    action: 'learn',
    input_nl: 'Tomato is not an animal. Tomato is not a mineral.',
    input_dsl: `
      @negTomAnimal isA Tomato Animal
      Not $negTomAnimal
      @negTomMineral isA Tomato Mineral
      Not $negTomMineral
    `,
    expected_nl: 'Learned 4 facts'
  },

  // === PHASE 30: Prove tomato is NOT an animal ===
  {
    action: 'prove',
    input_nl: 'Is a tomato an animal?',
    input_dsl: '@goal isA Tomato Animal',
    expected_nl: 'Cannot prove: Tomato is an animal'
  },

  // === PHASE 31: Learn mutual exclusion - dead vs alive ===
  {
    action: 'learn',
    input_nl: 'Cat is alive. Cat is not dead. Stone is not alive.',
    input_dsl: `
      hasProperty Cat Alive
      @negCatDead hasProperty Cat Dead
      Not $negCatDead
      @negStoneAlive hasProperty Stone Alive
      Not $negStoneAlive
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 32: Prove cat is NOT dead ===
  {
    action: 'prove',
    input_nl: 'Is cat dead?',
    input_dsl: '@goal hasProperty Cat Dead',
    expected_nl: 'Cannot prove: Cat is dead'
  },

  // === PHASE 33: Prove stone is NOT alive ===
  {
    action: 'prove',
    input_nl: 'Is stone alive?',
    input_dsl: '@goal hasProperty Stone Alive',
    expected_nl: 'Cannot prove: Stone is alive'
  },

  // === PHASE 34: Learn what robots are NOT ===
  {
    action: 'learn',
    input_nl: 'Robot is not organic. Robot is not emotional. Robot is not biological.',
    input_dsl: `
      @negRobOrg hasProperty Robot Organic
      Not $negRobOrg
      @negRobEmo hasProperty Robot Emotional
      Not $negRobEmo
      @negRobBio hasProperty Robot Biological
      Not $negRobBio
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === PHASE 35: Prove robot is NOT organic ===
  {
    action: 'prove',
    input_nl: 'Is robot organic?',
    input_dsl: '@goal hasProperty Robot Organic',
    expected_nl: 'Cannot prove: Robot is organic'
  },

  // === PHASE 36: Prove robot is NOT emotional ===
  {
    action: 'prove',
    input_nl: 'Is robot emotional?',
    input_dsl: '@goal hasProperty Robot Emotional',
    expected_nl: 'Cannot prove: Robot is emotional'
  },

  // === PHASE 37: Prove robot is NOT biological ===
  {
    action: 'prove',
    input_nl: 'Is robot biological?',
    input_dsl: '@goal hasProperty Robot Biological',
    expected_nl: 'Cannot prove: Robot is biological'
  }
];

export default { name, description, theories, steps };
