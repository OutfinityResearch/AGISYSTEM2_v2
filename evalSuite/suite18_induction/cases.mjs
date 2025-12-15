/**
 * Suite 18 - Induction
 *
 * Tests inductive reasoning: learning rules from examples.
 * Given multiple observations, infer general patterns.
 *
 * Based on DS06 Section 6.3: Induction
 *
 * Core theories: 05-logic, 12-reasoning
 */

export const name = 'Induction';
export const description = 'Test inductive reasoning - learning rules from examples';

export const theories = [
  '05-logic.sys2',
  '12-reasoning.sys2'
];

export const timeout = 2000;

export const steps = [
  // ============================================================
  // PATTERN RECOGNITION: Human-Mortal
  // ============================================================

  // === PHASE 1: Learn multiple human-mortal observations ===
  {
    action: 'learn',
    input_nl: 'Socrates is human. Socrates is mortal.',
    input_dsl: `
      isA Socrates Human
      hasProperty Socrates Mortal
    `,
    expected_nl: 'Learned 2 facts'
  },

  {
    action: 'learn',
    input_nl: 'Plato is human. Plato is mortal.',
    input_dsl: `
      isA Plato Human
      hasProperty Plato Mortal
    `,
    expected_nl: 'Learned 2 facts'
  },

  {
    action: 'learn',
    input_nl: 'Aristotle is human. Aristotle is mortal.',
    input_dsl: `
      isA Aristotle Human
      hasProperty Aristotle Mortal
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 2: Query all humans ===
  {
    action: 'query',
    input_nl: 'Who is human?',
    input_dsl: '@q isA ?who Human',
    expected_nl: 'Socrates is a Human'
  },

  // === PHASE 3: Query all mortals ===
  {
    action: 'query',
    input_nl: 'Who is mortal?',
    input_dsl: '@q hasProperty ?who Mortal',
    expected_nl: 'Socrates is mortal'
  },

  // === PHASE 4: Prove Socrates is mortal ===
  {
    action: 'prove',
    input_nl: 'Is Socrates mortal?',
    input_dsl: '@goal hasProperty Socrates Mortal',
    expected_nl: 'True: Socrates is mortal'
  },

  // === PHASE 5: Learn the inferred rule ===
  {
    action: 'learn',
    input_nl: 'Rule: all humans are mortal.',
    input_dsl: `
      @humanCond isA ?x Human
      @humanMortal hasProperty ?x Mortal
      @humanRule Implies $humanCond $humanMortal
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 6: Apply rule to new human ===
  {
    action: 'learn',
    input_nl: 'Alexander is human.',
    input_dsl: 'isA Alexander Human',
    expected_nl: 'Learned 1 fact'
  },

  {
    action: 'prove',
    input_nl: 'Is Alexander mortal?',
    input_dsl: '@goal hasProperty Alexander Mortal',
    expected_nl: 'True: Alexander is mortal'
  },

  // ============================================================
  // PATTERN RECOGNITION: Animal-Eating
  // ============================================================

  // === PHASE 7: Learn animal eating patterns ===
  {
    action: 'learn',
    input_nl: 'Lions eat meat. Lions are carnivores.',
    input_dsl: `
      eats Lion Meat
      isA Lion Carnivore
    `,
    expected_nl: 'Learned 2 facts'
  },

  {
    action: 'learn',
    input_nl: 'Tigers eat meat. Tigers are carnivores.',
    input_dsl: `
      eats Tiger Meat
      isA Tiger Carnivore
    `,
    expected_nl: 'Learned 2 facts'
  },

  {
    action: 'learn',
    input_nl: 'Wolves eat meat. Wolves are carnivores.',
    input_dsl: `
      eats Wolf Meat
      isA Wolf Carnivore
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 8: Learn inference rule ===
  {
    action: 'learn',
    input_nl: 'Rule: animals that eat meat are carnivores.',
    input_dsl: `
      @meatCond eats ?animal Meat
      @meatConc isA ?animal Carnivore
      @meatRule Implies $meatCond $meatConc
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 9: Apply to new animal ===
  {
    action: 'learn',
    input_nl: 'The bear eats meat.',
    input_dsl: 'eats Bear Meat',
    expected_nl: 'Learned 1 fact'
  },

  {
    action: 'prove',
    input_nl: 'Is the bear a carnivore?',
    input_dsl: '@goal isA Bear Carnivore',
    expected_nl: 'True: Bear is a carnivore'
  },

  // ============================================================
  // PATTERN RECOGNITION: Plants-Herbivore
  // ============================================================

  // === PHASE 10: Learn herbivore patterns ===
  {
    action: 'learn',
    input_nl: 'Deer eats plants. Deer is herbivore. Cow eats plants. Cow is herbivore.',
    input_dsl: `
      eats Deer Plants
      isA Deer Herbivore
      eats Cow Plants
      isA Cow Herbivore
    `,
    expected_nl: 'Learned 4 facts'
  },

  // === PHASE 11: Learn herbivore rule ===
  {
    action: 'learn',
    input_nl: 'Rule: animals that eat plants are herbivores.',
    input_dsl: `
      @herbCond eats ?animal Plants
      @herbConc isA ?animal Herbivore
      @herbRule Implies $herbCond $herbConc
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 12: Apply to new animal ===
  {
    action: 'learn',
    input_nl: 'The rabbit eats plants.',
    input_dsl: 'eats Rabbit Plants',
    expected_nl: 'Learned 1 fact'
  },

  {
    action: 'prove',
    input_nl: 'Is the rabbit a herbivore?',
    input_dsl: '@goal isA Rabbit Herbivore',
    expected_nl: 'True: Rabbit is a herbivore'
  },

  // ============================================================
  // GENERALIZATION: Properties inherit via isA
  // ============================================================

  // === PHASE 13: Learn class hierarchy ===
  {
    action: 'learn',
    input_nl: 'Build mammal hierarchy. Mammals have fur.',
    input_dsl: `
      isA Mammal Animal
      isA Dog Mammal
      isA Cat Mammal
      hasProperty Mammal HasFur
    `,
    expected_nl: 'Learned 4 facts'
  },

  // === PHASE 14: Property inheritance rule ===
  {
    action: 'learn',
    input_nl: 'Rule: subclasses inherit properties.',
    input_dsl: `
      @inhCond1 isA ?sub ?super
      @inhCond2 hasProperty ?super ?prop
      @inhAnd And $inhCond1 $inhCond2
      @inhConc hasProperty ?sub ?prop
      @inhRule Implies $inhAnd $inhConc
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 15: Prove dogs have fur ===
  {
    action: 'prove',
    input_nl: 'Do dogs have fur?',
    input_dsl: '@goal hasProperty Dog HasFur',
    expected_nl: 'True: Dog is hasfur'
  },

  // ============================================================
  // NEGATIVE CASES
  // ============================================================

  // === PHASE 16: No pattern for rocks ===
  {
    action: 'prove',
    input_nl: 'Is a rock mortal?',
    input_dsl: '@goal hasProperty Rock Mortal',
    expected_nl: 'Cannot prove: Rock is mortal'
  },

  // === PHASE 17: No pattern for unknown animal ===
  {
    action: 'prove',
    input_nl: 'Is a unicorn a carnivore?',
    input_dsl: '@goal isA Unicorn Carnivore',
    expected_nl: 'Cannot prove: Unicorn is a carnivore'
  },

  // ============================================================
  // COUNTING AND MAJORITY
  // ============================================================

  // === PHASE 18: Multiple observations suggest pattern ===
  {
    action: 'learn',
    input_nl: 'Birds: Sparrow flies, Robin flies, Eagle flies.',
    input_dsl: `
      isA Sparrow Bird
      can Sparrow Fly
      isA Robin Bird
      can Robin Fly
      isA Eagle Bird
      can Eagle Fly
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === PHASE 19: Induced rule ===
  {
    action: 'learn',
    input_nl: 'Rule: Birds can fly (learned from examples).',
    input_dsl: `
      @birdCond isA ?x Bird
      @birdFly can ?x Fly
      @birdRule Implies $birdCond $birdFly
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 20: Apply to new bird ===
  {
    action: 'learn',
    input_nl: 'Finch is a bird.',
    input_dsl: 'isA Finch Bird',
    expected_nl: 'Learned 1 fact'
  },

  {
    action: 'prove',
    input_nl: 'Can Finch fly?',
    input_dsl: '@goal can Finch Fly',
    expected_nl: 'True: Finch can Fly'
  },

  // ============================================================
  // DEEP REASONING: 4-5 Step Proof Chains
  // ============================================================

  // === PHASE 21: Build deep hierarchy ===
  {
    action: 'learn',
    input_nl: 'Build deep taxonomy: Poodle→Dog→Mammal→Animal→LivingThing. LivingThings breathe.',
    input_dsl: `
      isA Poodle Dog
      isA Dog Mammal
      isA Mammal Animal
      isA Animal LivingThing
      hasProperty LivingThing Breathes
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 22: Deep transitive + inheritance rule ===
  // Proof: Poodle→Dog→Mammal→Animal→LivingThing + hasProperty LivingThing Breathes
  // + inheritance rule = hasProperty Poodle Breathes (5+ steps)
  {
    action: 'prove',
    input_nl: 'Does a Poodle breathe? (4-level transitive + rule)',
    input_dsl: '@goal hasProperty Poodle Breathes',
    expected_nl: 'True: Poodle is breathes'
  },

  // === PHASE 23: Chained rules ===
  {
    action: 'learn',
    input_nl: 'If something breathes it is alive. If alive it can grow.',
    input_dsl: `
      @breatheCond hasProperty ?x Breathes
      @aliveConc hasProperty ?x Alive
      @breatheRule Implies $breatheCond $aliveConc
      @aliveCond hasProperty ?x Alive
      @growConc can ?x Grow
      @growRule Implies $aliveCond $growConc
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === PHASE 24: Multi-rule chain ===
  // Proof: Poodle breathes (from phase 22) → Poodle alive (rule1) → Poodle can grow (rule2)
  {
    action: 'prove',
    input_nl: 'Can a Poodle grow? (requires chained rules)',
    input_dsl: '@goal can Poodle Grow',
    expected_nl: 'True: Poodle can Grow'
  },

  // === PHASE 25: Three-level inheritance ===
  {
    action: 'learn',
    input_nl: 'Organisms reproduce. LivingThings are organisms.',
    input_dsl: `
      isA LivingThing Organism
      hasProperty Organism Reproduces
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 26: Extra deep chain ===
  // Proof: Poodle→Dog→Mammal→Animal→LivingThing→Organism + hasProperty Organism Reproduces
  {
    action: 'prove',
    input_nl: 'Does a Poodle reproduce? (5-level transitive + rule)',
    input_dsl: '@goal hasProperty Poodle Reproduces',
    expected_nl: 'True: Poodle is reproduces'
  },

  // === PHASE 27: Combined transitive + multiple rules ===
  {
    action: 'learn',
    input_nl: 'If reproduces then has offspring. If has offspring then is parent.',
    input_dsl: `
      @reproCond hasProperty ?x Reproduces
      @offConc hasProperty ?x HasOffspring
      @reproRule Implies $reproCond $offConc
      @offCond hasProperty ?x HasOffspring
      @parentConc hasProperty ?x CanBeParent
      @parentRule Implies $offCond $parentConc
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === PHASE 28: Very deep chain (5+ steps) ===
  // Proof: Poodle→...→Organism→Reproduces→HasOffspring→CanBeParent
  {
    action: 'prove',
    input_nl: 'Can a Poodle be a parent? (very deep chain)',
    input_dsl: '@goal hasProperty Poodle CanBeParent',
    expected_nl: 'True: Poodle is canbeparent'
  }
];

export default { name, description, theories, steps };
