/**
 * Suite 03 - Rule-Based Reasoning
 *
 * Tests multi-step rule chains and combined reasoning.
 * All prove actions require 3-6 reasoning steps.
 *
 * REASONING DEPTHS:
 * - Minimum proof steps: 3
 * - Maximum proof steps: 7
 * - Combines transitive + rule chains
 */

export const name = 'Structured Knowledge';
export const description = 'Multi-step rule chains and combined reasoning';

export const theories = [
  '05-logic.sys2',
  '09-roles.sys2'
];

export const steps = [
  // === PHASE 1: Build 6-level profession hierarchy ===
  // Role -> Professional -> Medical -> Doctor
  {
    action: 'learn',
    input_nl: 'Build profession hierarchy with rules',
    input_dsl: `
      isA Role Concept
      isA Professional Role
      isA Medical Professional
      isA Doctor Medical
      isA Surgeon Doctor
      isA Socrates Philosopher
      isA Philosopher Thinker
      isA Thinker Human
      isA Human Mortal
      isA Mortal Being
    `,
    expected_nl: 'Learned 10 facts'
  },

  // === PHASE 2: Query Socrates direct ===
  {
    action: 'query',
    input_nl: 'What is Socrates?',
    input_dsl: '@q isA Socrates ?what',
    expected_nl: 'Socrates is a philosopher'
  },

  // === PHASE 3: Prove 3-step transitive ===
  // CHAIN: Socrates -> Philosopher -> Thinker -> Human (3 hops)
  {
    action: 'prove',
    input_nl: 'Is Socrates human?',
    input_dsl: '@goal isA Socrates Human',
    expected_nl: 'True: Socrates is a human. Proof: Socrates is a philosopher. Philosopher is a thinker. Thinker is a human.'
  },

  // === PHASE 4: Prove 4-step transitive ===
  // CHAIN: Socrates -> Philosopher -> Thinker -> Human -> Mortal (4 hops)
  {
    action: 'prove',
    input_nl: 'Is Socrates mortal?',
    input_dsl: '@goal isA Socrates Mortal',
    expected_nl: 'True: Socrates is a mortal. Proof: Socrates is a philosopher. Philosopher is a thinker. Thinker is a human. Human is a mortal.'
  },

  // === PHASE 5: Prove 5-step transitive (classic syllogism extended) ===
  // CHAIN: Socrates -> Philosopher -> Thinker -> Human -> Mortal -> Being (5 hops)
  {
    action: 'prove',
    input_nl: 'Is Socrates a being?',
    input_dsl: '@goal isA Socrates Being',
    expected_nl: 'True: Socrates is a being. Proof: Socrates is a philosopher. Philosopher is a thinker. Thinker is a human. Human is a mortal. Mortal is a being.'
  },

  // === PHASE 6: Add medical professionals with rule chains ===
  {
    action: 'learn',
    input_nl: 'Dr Smith is a surgeon. Surgeons operate. If someone operates, they save lives.',
    input_dsl: `
      isA DrSmith Surgeon
      @opCond isA DrSmith Surgeon
      @opConc operates DrSmith
      @opRule Implies $opCond $opConc
      @saveCond operates DrSmith
      @saveConc savesLives DrSmith
      @saveRule Implies $saveCond $saveConc
    `,
    expected_nl: 'Learned 7 facts'
  },

  // === PHASE 7: Prove 3-step hierarchy ===
  // CHAIN: DrSmith -> Surgeon -> Doctor -> Medical (3 hops)
  {
    action: 'prove',
    input_nl: 'Is Dr Smith in medical field?',
    input_dsl: '@goal isA DrSmith Medical',
    expected_nl: 'True: DrSmith is a medical. Proof: DrSmith is a surgeon. Surgeon is a doctor. Doctor is a medical.'
  },

  // === PHASE 8: Prove 4-step hierarchy ===
  // CHAIN: DrSmith -> Surgeon -> Doctor -> Medical -> Professional (4 hops)
  {
    action: 'prove',
    input_nl: 'Is Dr Smith a professional?',
    input_dsl: '@goal isA DrSmith Professional',
    expected_nl: 'True: DrSmith is a professional. Proof: DrSmith is a surgeon. Surgeon is a doctor. Doctor is a medical. Medical is a professional.'
  },

  // === PHASE 9: Prove rule chain 2-step ===
  // CHAIN: Surgeon + rule => operates
  {
    action: 'prove',
    input_nl: 'Does Dr Smith operate?',
    input_dsl: '@goal operates DrSmith',
    expected_nl: 'True: DrSmith is operates'
  },

  // === PHASE 10: Prove rule chain 3-step ===
  // CHAIN: Surgeon -> operates -> savesLives (2 rules)
  {
    action: 'prove',
    input_nl: 'Does Dr Smith save lives?',
    input_dsl: '@goal savesLives DrSmith',
    expected_nl: 'True: DrSmith is savesLives'
  },

  // === PHASE 11: Build weather reasoning chain ===
  {
    action: 'learn',
    input_nl: 'Clouds -> Rain -> WetGround -> SlipperyRoad -> DangerousDriving',
    input_dsl: `
      hasProperty Weather Clouds
      @r1c hasProperty Weather Clouds
      @r1n hasProperty Weather Rain
      @r1 Implies $r1c $r1n
      @r2c hasProperty Weather Rain
      @r2n hasProperty Ground Wet
      @r2 Implies $r2c $r2n
      @r3c hasProperty Ground Wet
      @r3n hasProperty Road Slippery
      @r3 Implies $r3c $r3n
      @r4c hasProperty Road Slippery
      @r4n hasProperty Driving Dangerous
      @r4 Implies $r4c $r4n
    `,
    expected_nl: 'Learned 13 facts'
  },

  // === PHASE 12: Prove 2-step weather chain ===
  // CHAIN: Clouds + rule => Rain
  {
    action: 'prove',
    input_nl: 'Is it raining?',
    input_dsl: '@goal hasProperty Weather Rain',
    expected_nl: 'True: Weather is rain'
  },

  // === PHASE 13: Prove 3-step weather chain ===
  // CHAIN: Clouds -> Rain -> WetGround (2 rules)
  {
    action: 'prove',
    input_nl: 'Is the ground wet?',
    input_dsl: '@goal hasProperty Ground Wet',
    expected_nl: 'True: Ground is wet'
  },

  // === PHASE 14: Prove 4-step weather chain ===
  // CHAIN: Clouds -> Rain -> Wet -> Slippery (3 rules)
  {
    action: 'prove',
    input_nl: 'Is the road slippery?',
    input_dsl: '@goal hasProperty Road Slippery',
    expected_nl: 'True: Road is slippery'
  },

  // === PHASE 15: Prove 5-step weather chain (full chain) ===
  // CHAIN: Clouds -> Rain -> Wet -> Slippery -> Dangerous (4 rules)
  {
    action: 'prove',
    input_nl: 'Is driving dangerous?',
    input_dsl: '@goal hasProperty Driving Dangerous',
    expected_nl: 'True: Driving is dangerous'
  },

  // === PHASE 16: Cross-branch negative ===
  {
    action: 'prove',
    input_nl: 'Is DrSmith a thinker?',
    input_dsl: '@goal isA DrSmith Thinker',
    expected_nl: 'Cannot prove: DrSmith is a thinker'
  },

  // === PHASE 17: Build student hierarchy ===
  {
    action: 'learn',
    input_nl: 'Entity > Person > Student > GradStudent > PhDStudent',
    input_dsl: `
      isA Person Entity
      isA Student Person
      isA GradStudent Student
      isA PhDStudent GradStudent
      isA Alice PhDStudent
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 18: Prove 4-step student hierarchy ===
  // CHAIN: Alice -> PhDStudent -> GradStudent -> Student -> Person (4 hops)
  {
    action: 'prove',
    input_nl: 'Is Alice a person?',
    input_dsl: '@goal isA Alice Person',
    expected_nl: 'True: Alice is a person. Proof: Alice is a phdstudent. PhDStudent is a gradstudent. GradStudent is a student. Student is a person.'
  },

  // === PHASE 19: Prove 5-step student hierarchy ===
  // CHAIN: Alice -> PhDStudent -> GradStudent -> Student -> Person -> Entity (5 hops)
  {
    action: 'prove',
    input_nl: 'Is Alice an entity?',
    input_dsl: '@goal isA Alice Entity',
    expected_nl: 'True: Alice is an entity. Proof: Alice is a phdstudent. PhDStudent is a gradstudent. GradStudent is a student. Student is a person. Person is an entity.'
  },

  // === PHASE 20: Query hierarchy ===
  {
    action: 'query',
    input_nl: 'What is a professional?',
    input_dsl: '@q isA ?what Professional',
    expected_nl: 'Medical is a professional'
  }
];

export default { name, description, theories, steps };
