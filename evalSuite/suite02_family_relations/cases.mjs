/**
 * Suite 02 - Family Relations and Ownership
 *
 * A conversation about family, ownership, and social relationships.
 * Tests: learn relationships → query/prove → transfer verbs (give, sell)
 *
 * Core theories: 09-roles, 11-bootstrap-verbs
 */

export const name = 'Family Relations and Ownership';
export const description = 'Learn family trees, ownership, and social relations progressively';

export const theories = [
  '09-roles.sys2',
  '11-bootstrap-verbs.sys2'
];

export const steps = [
  // === PHASE 1: Learn family structure ===
  {
    action: 'learn',
    input_nl: `John is a father. Mary is a mother. Alice is a daughter.
               Bob is a son. Sarah is a grandmother.`,
    input_dsl: `
      @f1 isA John Father
      @f2 isA Mary Mother
      @f3 isA Alice Daughter
      @f4 isA Bob Son
      @f5 isA Sarah Grandmother
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 2: Learn love relationships ===
  {
    action: 'learn',
    input_nl: `John loves Mary. Mary loves John. John loves Alice.
               Mary loves Alice. Alice loves her parents.`,
    input_dsl: `
      @l1 love John Mary
      @l2 love Mary John
      @l3 love John Alice
      @l4 love Mary Alice
      @l5 love Alice Parents
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 3: Query love relationship ===
  {
    action: 'query',
    input_nl: 'Who does John love?',
    input_dsl: '@q love John ?who',
    expected_nl: 'John loves Mary'
  },

  // === PHASE 4: Prove love ===
  {
    action: 'prove',
    input_nl: 'Does Mary love John?',
    input_dsl: '@goal love Mary John',
    expected_nl: 'Yes, Mary loves John'
  },

  // === PHASE 5: Learn ownership ===
  {
    action: 'learn',
    input_nl: `John has a car. John has a house. John has a dog named Rex.
               Mary has a cat. Alice has a bicycle.`,
    input_dsl: `
      @o1 has John Car
      @o2 has John House
      @o3 has John Rex
      @o4 has Mary Cat
      @o5 has Alice Bicycle
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 6: Query ownership ===
  {
    action: 'query',
    input_nl: 'What does John have?',
    input_dsl: '@q has John ?item',
    expected_nl: 'John has a car'
  },

  // === PHASE 7: Prove ownership ===
  {
    action: 'prove',
    input_nl: 'Does John have a car?',
    input_dsl: '@goal has John Car',
    expected_nl: 'Yes, John has a car'
  },

  // === PHASE 8: Learn give transactions ===
  {
    action: 'learn',
    input_nl: `Alice gave Bob a book. Bob gave Charlie a pen.
               Charlie gave David a gift. Mary gave Alice flowers.`,
    input_dsl: `
      @g1 give Alice Bob Book
      @g2 give Bob Charlie Pen
      @g3 give Charlie David Gift
      @g4 give Mary Alice Flowers
    `,
    expected_nl: 'Learned 4 facts'
  },

  // === PHASE 9: Query give ===
  {
    action: 'query',
    input_nl: 'What did Alice give Bob?',
    input_dsl: '@q give Alice Bob ?what',
    expected_nl: 'Alice gave Bob a book'
  },

  // === PHASE 10: Learn sell transactions ===
  {
    action: 'learn',
    input_nl: `John sells cars. Mary sells houses. Bob sells books.
               The shop sells food. The market sells vegetables.`,
    input_dsl: `
      @s1 sell John Cars
      @s2 sell Mary Houses
      @s3 sell Bob Books
      @s4 sell Shop Food
      @s5 sell Market Vegetables
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 11: Query sell ===
  {
    action: 'query',
    input_nl: 'What does John sell?',
    input_dsl: '@q sell John ?what',
    expected_nl: 'John sells cars'
  },

  // === PHASE 12: Learn knowledge relationships ===
  {
    action: 'learn',
    input_nl: `Alice knows Bob. Bob knows Charlie. Charlie knows David.
               David knows Eve. Everyone knows each other in the group.`,
    input_dsl: `
      @k1 know Alice Bob
      @k2 know Bob Charlie
      @k3 know Charlie David
      @k4 know David Eve
      @k5 know Group Everyone
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 13: Query knowledge ===
  {
    action: 'query',
    input_nl: 'Who does Alice know?',
    input_dsl: '@q know Alice ?who',
    expected_nl: 'Alice knows Bob'
  },

  // === PHASE 14: Learn help relationships ===
  {
    action: 'learn',
    input_nl: `John helps Mary. Mary helps Alice. Alice helps Bob.
               Teachers help students. Parents help children.`,
    input_dsl: `
      @h1 help John Mary
      @h2 help Mary Alice
      @h3 help Alice Bob
      @h4 help Teachers Students
      @h5 help Parents Children
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 15: Query help ===
  {
    action: 'query',
    input_nl: 'Who does John help?',
    input_dsl: '@q help John ?who',
    expected_nl: 'John helps Mary'
  },

  // === PHASE 16: Learn perception ===
  {
    action: 'learn',
    input_nl: `John sees the bird. Mary sees the cat. Alice hears music.
               Bob feels happy. The bird is small.`,
    input_dsl: `
      @p1 see John Bird
      @p2 see Mary Cat
      @p3 hear Alice Music
      @p4 feel Bob Happy
      @p5 hasProperty Bird small
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 17: Prove perception ===
  {
    action: 'prove',
    input_nl: 'Does John see the bird?',
    input_dsl: '@goal see John Bird',
    expected_nl: 'Yes, John sees the bird'
  },

  // === PHASE 18: Query family role ===
  {
    action: 'query',
    input_nl: 'What role is John?',
    input_dsl: '@q isA John ?role',
    expected_nl: 'John is a father'
  }
];

export default { name, description, theories, steps };
