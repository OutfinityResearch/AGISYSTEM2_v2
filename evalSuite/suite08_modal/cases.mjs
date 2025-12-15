/**
 * Suite 08 - Modal Reasoning
 *
 * can/cannot/must operators derived via rules, with exceptions.
 * Tests: modal rules, modal inheritance, modal with negation.
 */

export const name = 'Modal Reasoning';
export const description = 'Modal operators derived via rules with exceptions';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Modal rules (type->ability) ===
  {
    action: 'learn',
    input_nl: 'Birds can fly. Fish can swim. Mammals can run. Stones cannot move.',
    input_dsl: `
      isA Animal Entity
      isA Bird Animal
      isA Fish Animal
      isA Mammal Animal
      isA Stone Object
      isA Tweety Bird
      isA Nemo Fish
      isA Rex Mammal
      isA Rock Stone
      @birdFly isA ?x Bird
      @birdFlyC can ?x Fly
      Implies $birdFly $birdFlyC
      @fishSwim isA ?x Fish
      @fishSwimC can ?x Swim
      Implies $fishSwim $fishSwimC
      @mammalRun isA ?x Mammal
      @mammalRunC can ?x Run
      Implies $mammalRun $mammalRunC
      @stoneMove isA ?x Stone
      @stoneMoveC cannot ?x Move
      Implies $stoneMove $stoneMoveC
    `,
    expected_nl: 'Learned 21 facts'
  },

  // === PROVE: Modal via rule (Tweety can fly) ===
  {
    action: 'prove',
    input_nl: 'Can Tweety fly?',
    input_dsl: '@goal can Tweety Fly',
    expected_nl: 'True: Tweety can Fly'
  },

  // === PROVE: Modal via rule (Nemo can swim) ===
  {
    action: 'prove',
    input_nl: 'Can Nemo swim?',
    input_dsl: '@goal can Nemo Swim',
    expected_nl: 'True: Nemo can Swim'
  },

  // === PROVE: Modal via rule (Rex can run) ===
  {
    action: 'prove',
    input_nl: 'Can Rex run?',
    input_dsl: '@goal can Rex Run',
    expected_nl: 'True: Rex can Run'
  },

  // === PROVE: Negative modal (Rock cannot move) ===
  {
    action: 'prove',
    input_nl: 'Can Rock move?',
    input_dsl: '@goal cannot Rock Move',
    expected_nl: 'True: Rock cannot Move'
  },

  // === PROVE: Cross-modal negative (Nemo cannot fly) ===
  {
    action: 'prove',
    input_nl: 'Can Nemo fly?',
    input_dsl: '@goal can Nemo Fly',
    expected_nl: 'Cannot prove: Nemo can Fly'
  },

  // === SETUP: Obligation rules (must) ===
  {
    action: 'learn',
    input_nl: 'Citizens must pay taxes. Doctors must help patients. Criminals must face justice.',
    input_dsl: `
      isA John Citizen
      isA DrSmith Doctor
      isA Thief Criminal
      @citTax isA ?x Citizen
      @citTaxC must ?x PayTaxes
      Implies $citTax $citTaxC
      @docHelp isA ?x Doctor
      @docHelpC must ?x HelpPatients
      Implies $docHelp $docHelpC
      @crimJust isA ?x Criminal
      @crimJustC must ?x FaceJustice
      Implies $crimJust $crimJustC
    `,
    expected_nl: 'Learned 12 facts'
  },

  // === PROVE: Obligation via rule ===
  {
    action: 'prove',
    input_nl: 'Must John pay taxes?',
    input_dsl: '@goal must John PayTaxes',
    expected_nl: 'True: John must PayTaxes'
  },

  // === PROVE: Obligation via rule ===
  {
    action: 'prove',
    input_nl: 'Must DrSmith help patients?',
    input_dsl: '@goal must DrSmith HelpPatients',
    expected_nl: 'True: DrSmith must HelpPatients'
  },

  // === QUERY: What can fly ===
  {
    action: 'query',
    input_nl: 'What can fly?',
    input_dsl: '@q can ?x Fly',
    expected_nl: 'Tweety can Fly.'
  },

  // === NEGATIVE ===
  {
    action: 'prove',
    input_nl: 'Must Rock pay taxes?',
    input_dsl: '@goal must Rock PayTaxes',
    expected_nl: 'Cannot prove: Rock must PayTaxes'
  }
];

export default { name, description, theories, steps };
