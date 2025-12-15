/**
 * Suite 06 - Compound Logic
 *
 * Complex And/Or/Not combinations, 3-way conditions, mixed expressions.
 * Tests: nested And, nested Or, And+Or mixed, And+Not.
 */

export const name = 'Compound Logic';
export const description = 'Complex And/Or/Not combinations';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: 3-way And (Motive AND Opportunity AND Means -> Guilty) ===
  {
    action: 'learn',
    input_nl: 'Guilt requires motive AND opportunity AND means.',
    input_dsl: `
      has John Motive
      has John Opportunity
      has John Means
      has Mary Motive
      has Mary Opportunity
      has Charlie Motive
      @guiltM has ?x Motive
      @guiltO has ?x Opportunity
      @guiltMe has ?x Means
      @guiltAnd1 And $guiltM $guiltO
      @guiltAnd2 And $guiltAnd1 $guiltMe
      @guiltConc isGuilty ?x
      Implies $guiltAnd2 $guiltConc
    `,
    expected_nl: 'Learned 13 facts'
  },

  // === PROVE: 3-way And - all satisfied ===
  {
    action: 'prove',
    input_nl: 'Is John guilty? (has all three)',
    input_dsl: '@goal isGuilty John',
    expected_nl: 'True: John is guilty'
  },

  // === PROVE: 3-way And - missing one ===
  {
    action: 'prove',
    input_nl: 'Is Mary guilty? (missing Means)',
    input_dsl: '@goal isGuilty Mary',
    expected_nl: 'Cannot prove: Mary is guilty'
  },

  // === PROVE: 3-way And - missing two ===
  {
    action: 'prove',
    input_nl: 'Is Charlie guilty? (only Motive)',
    input_dsl: '@goal isGuilty Charlie',
    expected_nl: 'Cannot prove: Charlie is guilty'
  },

  // === SETUP: 3-way Or (Cash OR Card OR Crypto -> canPay) ===
  {
    action: 'learn',
    input_nl: 'Payment accepts cash OR card OR crypto.',
    input_dsl: `
      has Alice Cash
      has Bob Card
      has Eve Crypto
      has Dan Nothing
      @payCash has ?x Cash
      @payCard has ?x Card
      @payCrypto has ?x Crypto
      @payOr1 Or $payCash $payCard
      @payOr2 Or $payOr1 $payCrypto
      @payConc can ?x Pay
      Implies $payOr2 $payConc
    `,
    expected_nl: 'Learned 11 facts'
  },

  // === PROVE: 3-way Or - branch 1, 2, 3 ===
  {
    action: 'prove',
    input_nl: 'Can Alice pay? (Cash)',
    input_dsl: '@goal can Alice Pay',
    expected_nl: 'True: Alice can Pay'
  },
  {
    action: 'prove',
    input_nl: 'Can Bob pay? (Card)',
    input_dsl: '@goal can Bob Pay',
    expected_nl: 'True: Bob can Pay'
  },
  {
    action: 'prove',
    input_nl: 'Can Eve pay? (Crypto)',
    input_dsl: '@goal can Eve Pay',
    expected_nl: 'True: Eve can Pay'
  },

  // === PROVE: 3-way Or - none satisfied ===
  {
    action: 'prove',
    input_nl: 'Can Dan pay? (has Nothing)',
    input_dsl: '@goal can Dan Pay',
    expected_nl: 'Cannot prove: Dan can Pay'
  },

  // === SETUP: Mixed And+Or ((Citizen AND Adult) AND (ID OR Passport) -> canVote) ===
  {
    action: 'learn',
    input_nl: 'Voting: (citizen AND adult) AND (ID OR passport).',
    input_dsl: `
      hasProperty Voter Citizen
      hasProperty Voter Adult
      has Voter ID
      hasProperty Minor Citizen
      has Minor ID
      @vCit hasProperty ?x Citizen
      @vAdult hasProperty ?x Adult
      @vAnd1 And $vCit $vAdult
      @vID has ?x ID
      @vPass has ?x Passport
      @vOr Or $vID $vPass
      @vAnd2 And $vAnd1 $vOr
      @vConc can ?x Vote
      Implies $vAnd2 $vConc
    `,
    expected_nl: 'Learned 14 facts'
  },

  // === PROVE: Mixed And+Or - all satisfied ===
  {
    action: 'prove',
    input_nl: 'Can Voter vote?',
    input_dsl: '@goal can Voter Vote',
    expected_nl: 'True: Voter can Vote'
  },

  // === PROVE: Mixed And+Or - And fails ===
  {
    action: 'prove',
    input_nl: 'Can Minor vote? (not Adult)',
    input_dsl: '@goal can Minor Vote',
    expected_nl: 'Cannot prove: Minor can Vote'
  },

  // === QUERY: Who can pay ===
  {
    action: 'query',
    input_nl: 'Who can pay?',
    input_dsl: '@q can ?who Pay',
    expected_nl: 'Alice can Pay. Bob can Pay. Eve can Pay.'
  }
];

export default { name, description, theories, steps };
