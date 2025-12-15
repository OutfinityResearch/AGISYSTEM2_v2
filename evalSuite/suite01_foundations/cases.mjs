/**
 * Suite 01 - Foundations
 *
 * Basic learn/query/prove with modal, negation, and diverse operators.
 * Tests: direct facts, simple queries, negation blocking, modal facts.
 */

export const name = 'Foundations';
export const description = 'Basic operations with modal and negation';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Diverse facts with modal and negation ===
  {
    action: 'learn',
    input_nl: 'Basic facts: Rex is a Dog. Dogs are Animals. Tweety can fly. Penguins cannot fly. Opus is a Penguin.',
    input_dsl: `
      isA Rex Dog
      isA Dog Animal
      isA Animal LivingThing
      can Tweety Fly
      isA Tweety Bird
      isA Penguin Bird
      isA Opus Penguin
      @negOpusFly can Opus Fly
      Not $negOpusFly
      before Morning Noon
      before Noon Evening
      causes Rain WetGround
    `,
    expected_nl: 'Learned 12 facts'
  },

  // === PROVE: Simple transitive (2-step) ===
  {
    action: 'prove',
    input_nl: 'Is Rex an Animal?',
    input_dsl: '@goal isA Rex Animal',
    expected_nl: 'True: Rex is an animal. Proof: Rex is a dog. Dog is an animal.'
  },

  // === PROVE: Deeper transitive (3-step) ===
  {
    action: 'prove',
    input_nl: 'Is Rex a LivingThing?',
    input_dsl: '@goal isA Rex LivingThing',
    expected_nl: 'True: Rex is a livingthing. Proof: Rex is a dog. Dog is an animal. Animal is a livingthing.'
  },

  // === PROVE: Modal fact ===
  {
    action: 'prove',
    input_nl: 'Can Tweety fly?',
    input_dsl: '@goal can Tweety Fly',
    expected_nl: 'True: Tweety can Fly'
  },

  // === PROVE: Negation blocks ===
  {
    action: 'prove',
    input_nl: 'Can Opus fly?',
    input_dsl: '@goal can Opus Fly',
    expected_nl: 'Cannot prove: Opus can Fly'
  },

  // === PROVE: Temporal transitive ===
  {
    action: 'prove',
    input_nl: 'Is Morning before Evening?',
    input_dsl: '@goal before Morning Evening',
    expected_nl: 'True: Morning is before Evening. Proof: Morning is before Noon. Noon is before Evening.'
  },

  // === QUERY: Multiple results ===
  {
    action: 'query',
    input_nl: 'What is a Bird?',
    input_dsl: '@q isA ?x Bird',
    expected_nl: 'Tweety is a Bird. Penguin is a Bird. Opus is a Bird.'
  },

  // === QUERY: Temporal pairs ===
  {
    action: 'query',
    input_nl: 'What comes before what?',
    input_dsl: '@q before ?x ?y',
    expected_nl: 'Morning is before Noon. Noon is before Evening.'
  },

  // === NEGATIVE: Unknown entity ===
  {
    action: 'prove',
    input_nl: 'Is Charlie a Dog?',
    input_dsl: '@goal isA Charlie Dog',
    expected_nl: 'Cannot prove: Charlie is a dog'
  }
];

export default { name, description, theories, steps };
