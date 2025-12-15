/**
 * Suite 20 - Compositional Reasoning
 *
 * Tests compositional reasoning: combining concepts to create new ones.
 * Property inheritance in compositions, conceptual blending.
 *
 * Based on DS06 Section 6.8: Compositional Reasoning
 *
 * Core theories: 05-logic
 */

export const name = 'Compositional Reasoning';
export const description = 'Test compositional reasoning - novel combinations';

export const theories = [
  '05-logic.sys2'
];

export const timeout = 2000;

export const steps = [
  // ============================================================
  // BASIC COMPOSITION: Color + Object
  // ============================================================

  // === PHASE 1: Learn color properties ===
  {
    action: 'learn',
    input_nl: 'Red is a warm color. Blue is a cool color.',
    input_dsl: `
      isA Red Color
      isA Blue Color
      hasProperty Red WarmColored
      hasProperty Blue CoolColored
    `,
    expected_nl: 'Learned 4 facts'
  },

  // === PHASE 2: Learn object properties ===
  {
    action: 'learn',
    input_nl: 'Apple is edible fruit. Car is a vehicle.',
    input_dsl: `
      isA Apple Fruit
      hasProperty Apple Edible
      isA Car Vehicle
      hasProperty Car Driveable
    `,
    expected_nl: 'Learned 4 facts'
  },

  // === PHASE 3: Prove apple is edible ===
  {
    action: 'prove',
    input_nl: 'Is an apple edible?',
    input_dsl: '@goal hasProperty Apple Edible',
    expected_nl: 'True: Apple is edible'
  },

  // === PHASE 4: Create composition: RedApple ===
  {
    action: 'learn',
    input_nl: 'A red apple has color red and is an apple.',
    input_dsl: `
      hasColor RedApple Red
      isA RedApple Apple
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 5: Property inheritance rule ===
  {
    action: 'learn',
    input_nl: 'Compositions inherit base object properties.',
    input_dsl: `
      @compBase isA ?comp ?base
      @baseProp hasProperty ?base ?prop
      @compAnd And $compBase $baseProp
      @compConc hasProperty ?comp ?prop
      @compRule Implies $compAnd $compConc
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 6: Prove RedApple is edible (inherited) ===
  {
    action: 'prove',
    input_nl: 'Is a red apple edible?',
    input_dsl: '@goal hasProperty RedApple Edible',
    expected_nl: 'True: RedApple is edible'
  },

  // ============================================================
  // NOVEL COMBINATIONS
  // ============================================================

  // === PHASE 7: Create novel BlueApple ===
  {
    action: 'learn',
    input_nl: 'A blue apple (novel combination) has color blue and is an apple.',
    input_dsl: `
      hasColor BlueApple Blue
      isA BlueApple Apple
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 8: Prove BlueApple is edible ===
  {
    action: 'prove',
    input_nl: 'Is a blue apple edible?',
    input_dsl: '@goal hasProperty BlueApple Edible',
    expected_nl: 'True: BlueApple is edible'
  },

  // === PHASE 9: Query what has color blue ===
  {
    action: 'query',
    input_nl: 'What has the color blue?',
    input_dsl: '@q hasColor ?thing Blue',
    expected_nl: 'BlueApple has Blue'
  },

  // ============================================================
  // MULTI-PROPERTY COMPOSITION
  // ============================================================

  // === PHASE 10: Learn size properties ===
  {
    action: 'learn',
    input_nl: 'Small things are portable. Large things are heavy.',
    input_dsl: `
      @smallCond hasSize ?x Small
      @smallConc hasProperty ?x Portable
      @smallRule Implies $smallCond $smallConc
      @largeCond hasSize ?x Large
      @largeConc hasProperty ?x Heavy
      @largeRule Implies $largeCond $largeConc
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === PHASE 11: Create small red apple ===
  {
    action: 'learn',
    input_nl: 'A small red apple is small and red and an apple.',
    input_dsl: `
      hasSize SmallRedApple Small
      hasColor SmallRedApple Red
      isA SmallRedApple Apple
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 12: Prove SmallRedApple is portable ===
  {
    action: 'prove',
    input_nl: 'Is a small red apple portable?',
    input_dsl: '@goal hasProperty SmallRedApple Portable',
    expected_nl: 'True: SmallRedApple is portable'
  },

  // === PHASE 13: Prove SmallRedApple is edible ===
  {
    action: 'prove',
    input_nl: 'Is a small red apple edible?',
    input_dsl: '@goal hasProperty SmallRedApple Edible',
    expected_nl: 'True: SmallRedApple is edible'
  },

  // ============================================================
  // CONCEPTUAL BLENDING
  // ============================================================

  // === PHASE 14: Learn creature properties ===
  {
    action: 'learn',
    input_nl: 'Horses run fast. Birds fly.',
    input_dsl: `
      isA Horse Animal
      can Horse Run
      hasProperty Horse Fast
      isA Bird Animal
      can Bird Fly
      hasProperty Bird Winged
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === PHASE 15: Create blended creature: Pegasus ===
  {
    action: 'learn',
    input_nl: 'Pegasus is a horse that can fly (blend of horse and bird).',
    input_dsl: `
      isA Pegasus Horse
      isA Pegasus Mythical
      can Pegasus Run
      can Pegasus Fly
      hasProperty Pegasus Fast
      hasProperty Pegasus Winged
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === PHASE 16: Prove Pegasus can fly ===
  {
    action: 'prove',
    input_nl: 'Can Pegasus fly?',
    input_dsl: '@goal can Pegasus Fly',
    expected_nl: 'True: Pegasus can Fly'
  },

  // === PHASE 17: Prove Pegasus can run ===
  {
    action: 'prove',
    input_nl: 'Can Pegasus run?',
    input_dsl: '@goal can Pegasus Run',
    expected_nl: 'True: Pegasus can Run'
  },

  // === PHASE 18: Prove Pegasus is winged ===
  {
    action: 'prove',
    input_nl: 'Is Pegasus winged?',
    input_dsl: '@goal hasProperty Pegasus Winged',
    expected_nl: 'True: Pegasus is winged'
  },

  // ============================================================
  // ROLE COMPOSITION
  // ============================================================

  // === PHASE 19: Learn role combinations ===
  {
    action: 'learn',
    input_nl: 'John is both a teacher and a parent.',
    input_dsl: `
      isA John Teacher
      isA John Parent
      hasProperty Teacher Educated
      hasProperty Parent Caring
    `,
    expected_nl: 'Learned 4 facts'
  },

  // === PHASE 20: Prove John is educated ===
  {
    action: 'prove',
    input_nl: 'Is John educated?',
    input_dsl: '@goal hasProperty John Educated',
    expected_nl: 'True: John is educated'
  },

  // === PHASE 21: Prove John is caring ===
  {
    action: 'prove',
    input_nl: 'Is John caring?',
    input_dsl: '@goal hasProperty John Caring',
    expected_nl: 'True: John is caring'
  },

  // ============================================================
  // NEGATIVE CASES
  // ============================================================

  // === PHASE 22: No composition exists ===
  {
    action: 'prove',
    input_nl: 'Is a purple car edible?',
    input_dsl: '@goal hasProperty PurpleCar Edible',
    expected_nl: 'Cannot prove: PurpleCar is edible'
  },

  // === PHASE 23: Unknown composition ===
  {
    action: 'prove',
    input_nl: 'Can a rock fly?',
    input_dsl: '@goal can Rock Fly',
    expected_nl: 'Cannot prove: Rock can Fly'
  },

  // === PHASE 24: Query all colors ===
  {
    action: 'query',
    input_nl: 'What is a color?',
    input_dsl: '@q isA ?x Color',
    expected_nl: 'Red is a Color'
  },

  // ============================================================
  // DEEP COMPOSITIONAL CHAINS: 4-5 Step Proofs
  // ============================================================

  // === PHASE 25: Build deep composition hierarchy ===
  {
    action: 'learn',
    input_nl: 'Deep hierarchy: GoldenRetriever→Retriever→Dog→Mammal→Animal→LivingThing. LivingThings need oxygen.',
    input_dsl: `
      isA GoldenRetriever Retriever
      isA Retriever Dog
      isA Dog Mammal
      isA Mammal Animal
      isA Animal LivingThing
      hasProperty LivingThing NeedsOxygen
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === PHASE 26: Prove deep property inheritance (5-level transitive + rule) ===
  {
    action: 'prove',
    input_nl: 'Does a GoldenRetriever need oxygen? (5-level inheritance)',
    input_dsl: '@goal hasProperty GoldenRetriever NeedsOxygen',
    expected_nl: 'True: GoldenRetriever is needsoxygen'
  },

  // === PHASE 27: Add another property at intermediate level ===
  {
    action: 'learn',
    input_nl: 'Mammals are warm-blooded. Dogs are loyal.',
    input_dsl: `
      hasProperty Mammal WarmBlooded
      hasProperty Dog Loyal
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 28: Prove intermediate inheritance ===
  {
    action: 'prove',
    input_nl: 'Is a GoldenRetriever warm-blooded?',
    input_dsl: '@goal hasProperty GoldenRetriever WarmBlooded',
    expected_nl: 'True: GoldenRetriever is warmblooded'
  },

  // === PHASE 29: Prove closer inheritance ===
  {
    action: 'prove',
    input_nl: 'Is a GoldenRetriever loyal?',
    input_dsl: '@goal hasProperty GoldenRetriever Loyal',
    expected_nl: 'True: GoldenRetriever is loyal'
  },

  // === PHASE 30: Chained composition rules ===
  {
    action: 'learn',
    input_nl: 'If needs oxygen and is warm-blooded, then metabolizes. If metabolizes, then grows.',
    input_dsl: `
      @metCond1 hasProperty ?x NeedsOxygen
      @metCond2 hasProperty ?x WarmBlooded
      @metAnd And $metCond1 $metCond2
      @metConc hasProperty ?x Metabolizes
      @metRule Implies $metAnd $metConc
      @growCond hasProperty ?x Metabolizes
      @growConc hasProperty ?x Grows
      @growRule Implies $growCond $growConc
    `,
    expected_nl: 'Learned 8 facts'
  },

  // === PHASE 31: Prove chained rule application (deep: inheritance + rule + rule) ===
  {
    action: 'prove',
    input_nl: 'Does a GoldenRetriever metabolize?',
    input_dsl: '@goal hasProperty GoldenRetriever Metabolizes',
    expected_nl: 'True: GoldenRetriever is metabolizes'
  },

  // === PHASE 32: Prove double-chained rule (5+ step proof) ===
  {
    action: 'prove',
    input_nl: 'Does a GoldenRetriever grow?',
    input_dsl: '@goal hasProperty GoldenRetriever Grows',
    expected_nl: 'True: GoldenRetriever is grows'
  },

  // === PHASE 33: Complex multi-role composition ===
  {
    action: 'learn',
    input_nl: 'Sarah is a doctor and scientist. Doctors help patients. Scientists discover.',
    input_dsl: `
      isA Sarah Doctor
      isA Sarah Scientist
      hasProperty Doctor HelpsPatients
      hasProperty Scientist Discovers
      hasProperty Doctor Educated
      hasProperty Scientist Analytical
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === PHASE 34: Prove multi-role inheritance ===
  {
    action: 'prove',
    input_nl: 'Does Sarah help patients?',
    input_dsl: '@goal hasProperty Sarah HelpsPatients',
    expected_nl: 'True: Sarah is helpspatients'
  },

  // === PHASE 35: Prove other role inheritance ===
  {
    action: 'prove',
    input_nl: 'Does Sarah discover?',
    input_dsl: '@goal hasProperty Sarah Discovers',
    expected_nl: 'True: Sarah is discovers'
  },

  // === PHASE 36: Combined role rule ===
  {
    action: 'learn',
    input_nl: 'If educated and analytical, then can research. If can research and helps patients, then can do clinical trials.',
    input_dsl: `
      @resCond1 hasProperty ?x Educated
      @resCond2 hasProperty ?x Analytical
      @resAnd And $resCond1 $resCond2
      @resConc can ?x Research
      @resRule Implies $resAnd $resConc
      @clinCond1 can ?x Research
      @clinCond2 hasProperty ?x HelpsPatients
      @clinAnd And $clinCond1 $clinCond2
      @clinConc can ?x ClinicalTrials
      @clinRule Implies $clinAnd $clinConc
    `,
    expected_nl: 'Learned 10 facts'
  },

  // === PHASE 37: Prove derived capability (4+ step proof) ===
  {
    action: 'prove',
    input_nl: 'Can Sarah do research?',
    input_dsl: '@goal can Sarah Research',
    expected_nl: 'True: Sarah can Research'
  },

  // === PHASE 38: Prove deep combined capability (5+ step proof) ===
  {
    action: 'prove',
    input_nl: 'Can Sarah do clinical trials?',
    input_dsl: '@goal can Sarah ClinicalTrials',
    expected_nl: 'True: Sarah can ClinicalTrials'
  }
];

export default { name, description, theories, steps };
