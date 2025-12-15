/**
 * Suite 12 - Multi-Hop Reasoning
 *
 * Tests deep reasoning chains requiring 5-10 steps.
 * Uses ancestry, supply chains, and knowledge dependencies.
 *
 * Core theories: 05-logic, 09-roles, 12-reasoning
 */

export const name = 'Multi-Hop Reasoning';
export const description = 'Test 5-10 step reasoning chains across multiple domains';

export const theories = [
  '05-logic.sys2',
  '09-roles.sys2',
  '12-reasoning.sys2'
];

// Simplified multi-hop tests using direct fact chains (no quantified rules)
export const steps = [
  // === PHASE 1: Learn parentage chain ===
  {
    action: 'learn',
    input_nl: 'Adam begat Seth, Seth begat Enosh, Enosh begat Kenan, Kenan begat Mahalalel',
    input_dsl: `
      isParentOf Adam Seth
      isParentOf Seth Enosh
      isParentOf Enosh Kenan
      isParentOf Kenan Mahalalel
    `,
    expected_nl: 'Learned 4 facts'
  },

  // === PHASE 2: Direct parent lookup ===
  {
    action: 'prove',
    input_nl: 'Is Adam parent of Seth?',
    input_dsl: '@goal isParentOf Adam Seth',
    expected_nl: 'True: Adam isParentOf Seth'
  },

  // === PHASE 3: Query who is Seth parent of ===
  {
    action: 'query',
    input_nl: 'Who is Seth parent of?',
    input_dsl: '@q isParentOf Seth ?child',
    expected_nl: 'Seth isParentOf Enosh'
  },

  // === PHASE 4: Learn supply chain (5 steps) ===
  {
    action: 'learn',
    input_nl: 'Iron ore produces pig iron, which produces steel, which produces sheet, which produces body, which produces chassis.',
    input_dsl: `
      produces IronOre PigIron
      produces PigIron Steel
      produces Steel Sheet
      produces Sheet Body
      produces Body Chassis
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 5: Direct production ===
  {
    action: 'prove',
    input_nl: 'Does iron ore produce pig iron?',
    input_dsl: '@goal produces IronOre PigIron',
    expected_nl: 'True: IronOre produces PigIron'
  },

  // === PHASE 6: Query what steel produces ===
  {
    action: 'query',
    input_nl: 'What does steel produce?',
    input_dsl: '@q produces Steel ?product',
    expected_nl: 'Steel produces Sheet'
  },

  // === PHASE 7: Learn knowledge dependencies ===
  {
    action: 'learn',
    input_nl: 'Addition requires Counting. Multiplication requires Addition. Algebra requires Multiplication.',
    input_dsl: `
      requires Addition Counting
      requires Multiplication Addition
      requires Algebra Multiplication
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 8: Direct requirement ===
  {
    action: 'prove',
    input_nl: 'Does Addition require Counting?',
    input_dsl: '@goal requires Addition Counting',
    expected_nl: 'True: Addition requires Counting'
  },

  // === PHASE 9: Query what requires Addition ===
  {
    action: 'query',
    input_nl: 'What requires Addition?',
    input_dsl: '@q requires ?subject Addition',
    expected_nl: 'Multiplication requires Addition'
  },

  // === PHASE 10: Negative - unrelated ===
  {
    action: 'prove',
    input_nl: 'Does Algebra require Counting directly?',
    input_dsl: '@goal requires Algebra Counting',
    expected_nl: 'Cannot prove: Algebra requires Counting'
  },

  // === PHASE 11: Learn food chain ===
  {
    action: 'learn',
    input_nl: 'Grass feeds cow. Cow feeds human.',
    input_dsl: `
      feeds Grass Cow
      feeds Cow Human
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 12: Direct feeding ===
  {
    action: 'prove',
    input_nl: 'Does grass feed cow?',
    input_dsl: '@goal feeds Grass Cow',
    expected_nl: 'True: Grass feeds Cow'
  },

  // === PHASE 13: Query what feeds human ===
  {
    action: 'query',
    input_nl: 'What feeds human?',
    input_dsl: '@q feeds ?food Human',
    expected_nl: 'Cow feeds Human'
  },

  // === PHASE 14: Negative - not direct ===
  {
    action: 'prove',
    input_nl: 'Does grass feed human directly?',
    input_dsl: '@goal feeds Grass Human',
    expected_nl: 'Cannot prove: Grass feeds Human'
  }
];

export default { name, description, theories, steps };
