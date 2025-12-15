/**
 * Suite 17 - Logical Macros
 *
 * Tests complex logical expressions with Or/And operators.
 * Builds multi-step proofs using disjunctions, conjunctions, and chains.
 *
 * Core theories: 05-logic
 */

export const name = 'Logical Macros';
export const description = 'Test complex Or/And logical expressions with multi-step proofs';

export const theories = [
  '05-logic.sys2'
];

export const timeout = 2000;

export const steps = [
  // ============================================================
  // LOAD THEORY
  // ============================================================
  {
    action: 'learn',
    input_nl: 'Load logical macros theory',
    input_dsl: '@_ Load "./evalSuite/suite17_logical_macros/theories/logical-rules.sys2"'
  },

  // ============================================================
  // DISJUNCTIVE PROOFS (OR) - Test both branches
  // ============================================================

  // === Access Control: hasKey OR hasCode => canEnter ===
  // Test branch 1: has Key
  {
    action: 'learn',
    input_nl: 'Person has a key.',
    input_dsl: 'has Person Key',
    expected_nl: 'Learned 1 fact'
  },
  {
    action: 'prove',
    input_nl: 'Can Person enter the building?',
    input_dsl: '@goal can Person EnterBuilding',
    expected_nl: 'True: Person can EnterBuilding'
  },

  // Reset for next test - use Code instead
  {
    action: 'learn',
    input_nl: 'Person2 has a code. Rule: key or code => enter.',
    input_dsl: `
      has Person2 Code
      @p2Key has Person2 Key
      @p2Code has Person2 Code
      @p2Or Or $p2Key $p2Code
      @p2Enter can Person2 EnterBuilding
      Implies $p2Or $p2Enter
    `,
    expected_nl: 'Learned 6 facts'
  },
  {
    action: 'prove',
    input_nl: 'Can Person2 enter the building?',
    input_dsl: '@goal can Person2 EnterBuilding',
    expected_nl: 'True: Person2 can EnterBuilding'
  },

  // === Payment: hasCash OR hasCard OR hasCrypto => canPay ===
  {
    action: 'learn',
    input_nl: 'Customer has crypto.',
    input_dsl: 'has Customer Crypto',
    expected_nl: 'Learned 1 fact'
  },
  {
    action: 'prove',
    input_nl: 'Can Customer pay?',
    input_dsl: '@goal can Customer Pay',
    expected_nl: 'True: Customer can Pay'
  },

  // Test card branch
  {
    action: 'learn',
    input_nl: 'Customer2 has card. Rule: cash or card or crypto => pay.',
    input_dsl: `
      has Customer2 Card
      @c2Cash has Customer2 Cash
      @c2Card has Customer2 Card
      @c2Or1 Or $c2Cash $c2Card
      @c2Crypto has Customer2 Crypto
      @c2Or2 Or $c2Or1 $c2Crypto
      @c2Pay can Customer2 Pay
      Implies $c2Or2 $c2Pay
    `,
    expected_nl: 'Learned 8 facts'
  },
  {
    action: 'prove',
    input_nl: 'Can Customer2 pay?',
    input_dsl: '@goal can Customer2 Pay',
    expected_nl: 'True: Customer2 can Pay'
  },

  // ============================================================
  // CONJUNCTIVE PROOFS (AND) - All conditions required
  // ============================================================

  // === Graduation: hasCredits AND hasThesis AND passedExams ===
  {
    action: 'learn',
    input_nl: 'Student completed credits, submitted thesis, and passed exams.',
    input_dsl: `
      completed Student Credits
      submitted Student Thesis
      passed Student Exams
    `,
    expected_nl: 'Learned 3 facts'
  },
  {
    action: 'prove',
    input_nl: 'Can Student graduate?',
    input_dsl: '@goal can Student Graduate',
    expected_nl: 'True: Student can Graduate'
  },

  // Test partial conditions DON'T work
  {
    action: 'learn',
    input_nl: 'Student2 completed credits only. Rule: credits AND thesis AND exams => graduate.',
    input_dsl: `
      completed Student2 Credits
      @s2Cred completed Student2 Credits
      @s2Thesis submitted Student2 Thesis
      @s2And1 And $s2Cred $s2Thesis
      @s2Exam passed Student2 Exams
      @s2And2 And $s2And1 $s2Exam
      @s2Grad can Student2 Graduate
      Implies $s2And2 $s2Grad
    `,
    expected_nl: 'Learned 8 facts'
  },
  {
    action: 'prove',
    input_nl: 'Can Student2 graduate?',
    input_dsl: '@goal can Student2 Graduate',
    expected_nl: 'Cannot prove: Student2 can Graduate'
  },

  // === Flight Boarding: hasPassport AND hasBoardingPass AND passedSecurity ===
  {
    action: 'learn',
    input_nl: 'Passenger has passport, boarding pass, and passed security.',
    input_dsl: `
      has Passenger Passport
      has Passenger BoardingPass
      passed Passenger Security
    `,
    expected_nl: 'Learned 3 facts'
  },
  {
    action: 'prove',
    input_nl: 'Can Passenger board the plane?',
    input_dsl: '@goal can Passenger Board',
    expected_nl: 'True: Passenger can Board'
  },

  // === Loan: hasIncome AND hasCredit AND hasCollateral ===
  {
    action: 'learn',
    input_nl: 'Applicant has stable income, good credit, and collateral.',
    input_dsl: `
      hasProperty Applicant StableIncome
      hasProperty Applicant GoodCredit
      has Applicant Collateral
    `,
    expected_nl: 'Learned 3 facts'
  },
  {
    action: 'prove',
    input_nl: 'Is Applicant approved for a loan?',
    input_dsl: '@goal hasStatus Applicant Approved',
    expected_nl: 'True: Applicant is approved'
  },

  // ============================================================
  // MIXED PROOFS (AND + OR combinations)
  // ============================================================

  // === Voter: (isCitizen AND isAdult) AND (hasID OR hasPassport) ===
  {
    action: 'learn',
    input_nl: 'Voter is a citizen, adult, and has ID.',
    input_dsl: `
      hasProperty Voter Citizen
      hasProperty Voter Adult
      has Voter ID
    `,
    expected_nl: 'Learned 3 facts'
  },
  {
    action: 'prove',
    input_nl: 'Can Voter vote?',
    input_dsl: '@goal can Voter Vote',
    expected_nl: 'True: Voter can Vote'
  },

  // Not adult - should fail
  {
    action: 'learn',
    input_nl: 'Voter2 is a citizen with ID but not an adult.',
    input_dsl: `
      hasProperty Voter2 Citizen
      has Voter2 ID
      @v2Cit hasProperty Voter2 Citizen
      @v2Adult hasProperty Voter2 Adult
      @v2And1 And $v2Cit $v2Adult
      @v2ID has Voter2 ID
      @v2PP has Voter2 Passport
      @v2Or Or $v2ID $v2PP
      @v2And2 And $v2And1 $v2Or
      @v2Vote can Voter2 Vote
      Implies $v2And2 $v2Vote
    `,
    expected_nl: 'Learned 11 facts'
  },
  {
    action: 'prove',
    input_nl: 'Can Voter2 vote?',
    input_dsl: '@goal can Voter2 Vote',
    expected_nl: 'Cannot prove: Voter2 can Vote'
  },

  // === Emergency: (isFire OR isFlood) AND hasEvacPlan ===
  {
    action: 'learn',
    input_nl: 'Fire detected at Building with evacuation plan.',
    input_dsl: `
      detected Building Fire
      exists Building EvacuationPlan
    `,
    expected_nl: 'Learned 2 facts'
  },
  {
    action: 'prove',
    input_nl: 'Must Building evacuate?',
    input_dsl: '@goal mustDo Building Evacuate',
    expected_nl: 'True: Building mustDo Evacuate'
  },

  // === Recipe: (hasFlour AND hasEggs) AND (hasButter OR hasOil) ===
  {
    action: 'learn',
    input_nl: 'Kitchen has flour, eggs, and oil.',
    input_dsl: `
      has Kitchen Flour
      has Kitchen Eggs
      has Kitchen Oil
    `,
    expected_nl: 'Learned 3 facts'
  },
  {
    action: 'prove',
    input_nl: 'Can Kitchen bake?',
    input_dsl: '@goal can Kitchen Bake',
    expected_nl: 'True: Kitchen can Bake'
  },

  // ============================================================
  // CHAINED PROOFS (multi-step through rules)
  // ============================================================

  // Chain: canPay => canPurchase => isProtected (with warranty)
  {
    action: 'learn',
    input_nl: 'Product has warranty.',
    input_dsl: 'has Product Warranty',
    expected_nl: 'Learned 1 fact'
  },
  {
    action: 'prove',
    input_nl: 'Can Customer purchase?',
    input_dsl: '@goal can Customer Purchase',
    expected_nl: 'True: Customer can Purchase'
  },
  {
    action: 'prove',
    input_nl: 'Is Customer protected?',
    input_dsl: '@goal hasStatus Customer Protected',
    expected_nl: 'True: Customer is protected'
  },

  // Chain: canGraduate => isEducated => isEmployable
  {
    action: 'learn',
    input_nl: 'Student has experience.',
    input_dsl: 'has Student Experience',
    expected_nl: 'Learned 1 fact'
  },
  {
    action: 'prove',
    input_nl: 'Is Student educated?',
    input_dsl: '@goal hasProperty Student Educated',
    expected_nl: 'True: Student is educated'
  },
  {
    action: 'prove',
    input_nl: 'Is Student employable?',
    input_dsl: '@goal hasStatus Student Employable',
    expected_nl: 'True: Student is employable'
  },

  // ============================================================
  // NEGATION WITH LOGIC
  // ============================================================

  // hasLicense AND NOT hasViolations => goodDriver
  {
    action: 'learn',
    input_nl: 'Driver has a license and no violations.',
    input_dsl: `
      has Driver License
      @negDrvViol has Driver Violations
      Not $negDrvViol
    `,
    expected_nl: 'Learned 3 facts'
  },
  {
    action: 'prove',
    input_nl: 'Is Driver a good driver?',
    input_dsl: '@goal hasStatus Driver GoodDriver',
    expected_nl: 'True: Driver is gooddriver'
  },

  // Has violations - should not be good driver
  {
    action: 'learn',
    input_nl: 'Driver2 has a license but has violations.',
    input_dsl: `
      has Driver2 License
      has Driver2 Violations
      @d2Lic has Driver2 License
      @d2Viol has Driver2 Violations
      @d2Not Not $d2Viol
      @d2And And $d2Lic $d2Not
      @d2Good hasStatus Driver2 GoodDriver
      Implies $d2And $d2Good
    `,
    expected_nl: 'Learned 8 facts'
  },
  {
    action: 'prove',
    input_nl: 'Is Driver2 a good driver?',
    input_dsl: '@goal hasStatus Driver2 GoodDriver',
    expected_nl: 'Cannot prove: Driver2 is gooddriver'
  },

  // ============================================================
  // QUERY TESTS
  // ============================================================

  {
    action: 'query',
    input_nl: 'Who can graduate?',
    input_dsl: '@q can ?who Graduate',
    expected_nl: 'Student can Graduate'
  },

  {
    action: 'query',
    input_nl: 'What can Voter do?',
    input_dsl: '@q can Voter ?ability',
    expected_nl: 'Voter can Vote'
  },

  // ============================================================
  // NEGATIVE PROOFS
  // ============================================================

  {
    action: 'prove',
    input_nl: 'Can a random person enter?',
    input_dsl: '@goal can RandomPerson EnterBuilding',
    expected_nl: 'Cannot prove: RandomPerson can EnterBuilding'
  },

  {
    action: 'prove',
    input_nl: 'Is someone without requirements employable?',
    input_dsl: '@goal hasStatus NoOne Employable',
    expected_nl: 'Cannot prove: NoOne is employable'
  }
];

export default { name, description, theories, steps };
