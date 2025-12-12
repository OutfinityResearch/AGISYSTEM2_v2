/**
 * Suite 03 - Rule Reasoning and Inference
 *
 * A conversation about rules and deduction.
 * Tests: learn rules (Implies) → prove derived facts → explain chains
 *
 * Core theories: 05-logic (Implies, ForAll), 12-reasoning (deduce)
 */

export const name = 'Rule Reasoning and Inference';
export const description = 'Learn rules progressively, then prove derived conclusions';

export const theories = [
  '05-logic.sys2',
  '12-reasoning.sys2'
];

export const steps = [
  // === PHASE 1: Learn base rule - humans are mortal ===
  {
    action: 'learn',
    input_nl: 'All humans are mortal. This is a universal truth.',
    input_dsl: `
      @cond1 isA ?x Human
      @conc1 isA ?x Mortal
      @r1 Implies $cond1 $conc1
    `,
    expected_nl: 'Learned 1 rule'
  },

  // === PHASE 2: Learn instances ===
  {
    action: 'learn',
    input_nl: 'Socrates is a human. Plato is a human. Aristotle is a human.',
    input_dsl: `
      @f1 isA Socrates Human
      @f2 isA Plato Human
      @f3 isA Aristotle Human
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 3: Prove Socrates is mortal ===
  {
    action: 'prove',
    input_nl: 'Is Socrates mortal?',
    input_dsl: '@goal isA Socrates Mortal',
    expected_nl: 'Yes. Socrates is human and all humans are mortal, therefore Socrates is mortal.'
  },

  // === PHASE 4: Learn animal taxonomy rules ===
  {
    action: 'learn',
    input_nl: 'All dogs are mammals. All mammals are animals. All birds are animals.',
    input_dsl: `
      @c2 isA ?x Dog
      @t2 isA ?x Mammal
      @r2 Implies $c2 $t2
      @c3 isA ?x Mammal
      @t3 isA ?x Animal
      @r3 Implies $c3 $t3
      @c4 isA ?x Bird
      @t4 isA ?x Animal
      @r4 Implies $c4 $t4
    `,
    expected_nl: 'Learned 3 rules'
  },

  // === PHASE 5: Learn animal instances ===
  {
    action: 'learn',
    input_nl: 'Fido is a dog. Rex is a dog. Spot is a dog. Tweety is a bird.',
    input_dsl: `
      @f4 isA Fido Dog
      @f5 isA Rex Dog
      @f6 isA Spot Dog
      @f7 isA Tweety Bird
    `,
    expected_nl: 'Learned 4 facts'
  },

  // === PHASE 6: Prove Fido is a mammal ===
  {
    action: 'prove',
    input_nl: 'Is Fido a mammal?',
    input_dsl: '@goal isA Fido Mammal',
    expected_nl: 'Yes. Fido is a dog and all dogs are mammals, therefore Fido is a mammal.'
  },

  // === PHASE 7: Prove Fido is an animal (2 steps) ===
  {
    action: 'prove',
    input_nl: 'Is Fido an animal?',
    input_dsl: '@goal isA Fido Animal',
    expected_nl: 'Yes. Fido is a dog. Dogs are mammals. Mammals are animals. Therefore Fido is an animal.'
  },

  // === PHASE 8: Learn conditional weather rule ===
  {
    action: 'learn',
    input_nl: 'If it rains then the ground is wet. If the ground is wet then plants grow.',
    input_dsl: `
      @wcond hasProperty Weather Rain
      @wconc hasProperty Ground Wet
      @r5 Implies $wcond $wconc
      @gcond hasProperty Ground Wet
      @gconc do Plants Grow
      @r6 Implies $gcond $gconc
    `,
    expected_nl: 'Learned 2 rules'
  },

  // === PHASE 9: Learn weather state ===
  {
    action: 'learn',
    input_nl: 'It rains today. The sky is cloudy. The temperature is cold.',
    input_dsl: `
      @w1 hasProperty Weather Rain
      @w2 hasProperty Sky Cloudy
      @w3 hasProperty Temperature Cold
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 10: Prove ground is wet ===
  {
    action: 'prove',
    input_nl: 'Is the ground wet?',
    input_dsl: '@goal hasProperty Ground Wet',
    expected_nl: 'Yes. It rains and if it rains then the ground is wet.'
  },

  // === PHASE 11: Query professional role ===
  {
    action: 'learn',
    input_nl: 'Doctors heal patients. John is a doctor. Mary is a lawyer.',
    input_dsl: `
      @pcond isA ?x Doctor
      @pconc heal ?x Patient
      @r7 Implies $pcond $pconc
      @f8 isA John Doctor
      @f9 isA Mary Lawyer
    `,
    expected_nl: 'Learned 1 rule, 2 facts'
  },

  // === PHASE 12: Query John's role ===
  {
    action: 'query',
    input_nl: 'What is John?',
    input_dsl: '@q isA John ?what',
    expected_nl: 'John is a doctor'
  },

  // === PHASE 13: Learn student rules ===
  {
    action: 'learn',
    input_nl: 'All students study hard. All hard workers succeed. Alice is a student. Bob is a student.',
    input_dsl: `
      @scond isA ?x Student
      @sconc do ?x StudyHard
      @r8 Implies $scond $sconc
      @hcond do ?x StudyHard
      @hconc will ?x Succeed
      @r9 Implies $hcond $hconc
      @f10 isA Alice Student
      @f11 isA Bob Student
    `,
    expected_nl: 'Learned 2 rules, 2 facts'
  },

  // === PHASE 14: Query Alice's status ===
  {
    action: 'query',
    input_nl: 'What is Alice?',
    input_dsl: '@q isA Alice ?what',
    expected_nl: 'Alice is a student'
  },

  // === PHASE 15: Learn cat taxonomy ===
  {
    action: 'learn',
    input_nl: 'All cats are felines. All felines are mammals. Whiskers is a cat.',
    input_dsl: `
      @ccond isA ?x Cat
      @cconc isA ?x Feline
      @r10 Implies $ccond $cconc
      @fcond isA ?x Feline
      @fconc isA ?x Mammal
      @r11 Implies $fcond $fconc
      @f12 isA Whiskers Cat
    `,
    expected_nl: 'Learned 2 rules, 1 fact'
  },

  // === PHASE 16: Prove Whiskers is feline ===
  {
    action: 'prove',
    input_nl: 'Is Whiskers a feline?',
    input_dsl: '@goal isA Whiskers Feline',
    expected_nl: 'Yes. Whiskers is a cat and all cats are felines.'
  },

  // === PHASE 17: Learn warm-blooded rule ===
  {
    action: 'learn',
    input_nl: 'All mammals are warm-blooded.',
    input_dsl: `
      @mcond isA ?x Mammal
      @mconc hasProperty ?x WarmBlooded
      @r12 Implies $mcond $mconc
    `,
    expected_nl: 'Learned 1 rule'
  },

  // === PHASE 18: Prove Rex is mammal (multi-step) ===
  {
    action: 'prove',
    input_nl: 'Is Rex a mammal?',
    input_dsl: '@goal isA Rex Mammal',
    expected_nl: 'Yes. Rex is a dog. Dogs are mammals. Therefore Rex is a mammal.'
  }
];

export default { name, description, theories, steps };
