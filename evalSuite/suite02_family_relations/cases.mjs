/**
 * Suite 02 - Family Relations and Ownership
 *
 * Tests multi-step reasoning with family hierarchies and rule chains.
 * All prove actions require 3-6 reasoning steps.
 *
 * REASONING DEPTHS:
 * - Minimum proof steps: 3
 * - Maximum proof steps: 6
 * - Uses rule chains for relationship inference
 */

export const name = 'Family Relations and Ownership';
export const description = 'Multi-step family reasoning with rule chains';

export const theories = [
  '05-logic.sys2',
  '09-roles.sys2'
];

export const steps = [
  // === PHASE 1: Build 5-level family role hierarchy ===
  // Being -> Person -> Adult -> Parent -> Father/Mother
  {
    action: 'learn',
    input_nl: 'Build family role hierarchy: Being > Person > Adult > Parent > Father',
    input_dsl: `
      isA Person Being
      isA Adult Person
      isA Parent Adult
      isA Father Parent
      isA Mother Parent
      isA Child Person
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === PHASE 2: Add instances and rule chains ===
  {
    action: 'learn',
    input_nl: 'John is a father. If John is a father, John protects family. If John protects family, family trusts John.',
    input_dsl: `
      isA John Father
      @protCond isA John Father
      @protConc protects John Family
      @protRule Implies $protCond $protConc
      @trustCond protects John Family
      @trustConc trusts Family John
      @trustRule Implies $trustCond $trustConc
    `,
    expected_nl: 'Learned 7 facts'
  },

  // === PHASE 3: Prove 3-step hierarchy ===
  // CHAIN: John -> Father -> Parent -> Adult (3 hops)
  {
    action: 'prove',
    input_nl: 'Is John an adult?',
    input_dsl: '@goal isA John Adult',
    expected_nl: 'True: John is an adult. Proof: John is a father. Father is a parent. Parent is an adult.'
  },

  // === PHASE 4: Prove 4-step hierarchy ===
  // CHAIN: John -> Father -> Parent -> Adult -> Person (4 hops)
  {
    action: 'prove',
    input_nl: 'Is John a person?',
    input_dsl: '@goal isA John Person',
    expected_nl: 'True: John is a person. Proof: John is a father. Father is a parent. Parent is an adult. Adult is a person.'
  },

  // === PHASE 5: Prove 5-step hierarchy ===
  // CHAIN: John -> Father -> Parent -> Adult -> Person -> Being (5 hops)
  {
    action: 'prove',
    input_nl: 'Is John a being?',
    input_dsl: '@goal isA John Being',
    expected_nl: 'True: John is a being. Proof: John is a father. Father is a parent. Parent is an adult. Adult is a person. Person is a being.'
  },

  // === PHASE 6: Prove 2-step rule chain ===
  // CHAIN: isA(John,Father) + rule1 => protects(John,Family)
  {
    action: 'prove',
    input_nl: 'Does John protect family?',
    input_dsl: '@goal protects John Family',
    expected_nl: 'True: John protects Family'
  },

  // === PHASE 7: Prove 3-step rule chain ===
  // CHAIN: Father -> protects -> trusts (2 rule applications)
  {
    action: 'prove',
    input_nl: 'Does family trust John?',
    input_dsl: '@goal trusts Family John',
    expected_nl: 'True: Family trusts John'
  },

  // === PHASE 8: Build location hierarchy for family ===
  {
    action: 'learn',
    input_nl: 'World > Country > City > District > Home',
    input_dsl: `
      locatedIn USA World
      locatedIn NewYork USA
      locatedIn Manhattan NewYork
      locatedIn HomeAddress Manhattan
      locatedIn John HomeAddress
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 9: Query direct location ===
  {
    action: 'query',
    input_nl: 'Where is John?',
    input_dsl: '@q locatedIn John ?where',
    expected_nl: 'John is in HomeAddress'
  },

  // === PHASE 10: Prove 3-step location ===
  // CHAIN: John -> HomeAddress -> Manhattan -> NewYork (3 hops)
  {
    action: 'prove',
    input_nl: 'Is John in New York?',
    input_dsl: '@goal locatedIn John NewYork',
    expected_nl: 'True: John is in NewYork. Proof: John is in HomeAddress. HomeAddress is in Manhattan. Manhattan is in NewYork.'
  },

  // === PHASE 11: Prove 4-step location ===
  // CHAIN: John -> HomeAddress -> Manhattan -> NewYork -> USA (4 hops)
  {
    action: 'prove',
    input_nl: 'Is John in USA?',
    input_dsl: '@goal locatedIn John USA',
    expected_nl: 'True: John is in USA. Proof: John is in HomeAddress. HomeAddress is in Manhattan. Manhattan is in NewYork. NewYork is in USA.'
  },

  // === PHASE 12: Prove 5-step location ===
  // CHAIN: John -> HomeAddress -> Manhattan -> NewYork -> USA -> World (5 hops)
  {
    action: 'prove',
    input_nl: 'Is John in the world?',
    input_dsl: '@goal locatedIn John World',
    expected_nl: 'True: John is in World. Proof: John is in HomeAddress. HomeAddress is in Manhattan. Manhattan is in NewYork. NewYork is in USA. USA is in World.'
  }
];

export default { name, description, theories, steps };
