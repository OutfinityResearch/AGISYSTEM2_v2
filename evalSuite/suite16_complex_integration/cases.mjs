/**
 * Suite 16 - Complex Integration
 *
 * Integration test combining direct facts from multiple domains.
 * Tests: isA chains, abilities, status, temporal, modal, and queries.
 *
 * Core theories: 05-logic, 06-temporal, 07-modal, 08-defaults
 */

export const name = 'Complex Integration';
export const description = 'Integration test combining multiple reasoning domains';

export const theories = [
  '05-logic.sys2',
  '06-temporal.sys2',
  '07-modal.sys2',
  '08-defaults.sys2'
];

export const timeout = 2000;

// Simplified integration test using direct facts
export const steps = [
  // ============================================================
  // MEDICAL DOMAIN
  // ============================================================

  // === PHASE 1: Learn medical taxonomy ===
  {
    action: 'learn',
    input_nl: 'COVID is a viral disease. Viral diseases are infectious. Infectious things are diseases.',
    input_dsl: `
      isA COVID ViralDisease
      isA ViralDisease Infectious
      isA Infectious Disease
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 2: Prove COVID is Infectious (2-step transitive) ===
  // CHAIN: COVID -> ViralDisease -> Infectious
  {
    action: 'prove',
    input_nl: 'Is COVID infectious?',
    input_dsl: '@goal isA COVID Infectious',
    expected_nl: 'True: COVID is an infectious. Proof: COVID is a viraldisease. ViralDisease is an infectious.'
  },

  // === PHASE 2b: Prove COVID is a disease (3-step transitive) ===
  // CHAIN: COVID -> ViralDisease -> Infectious -> Disease
  {
    action: 'prove',
    input_nl: 'Is COVID a disease?',
    input_dsl: '@goal isA COVID Disease',
    expected_nl: 'True: COVID is a disease. Proof: COVID is a viraldisease. ViralDisease is an infectious. Infectious is a disease.'
  },

  // === PHASE 3: Learn patient symptoms ===
  {
    action: 'learn',
    input_nl: 'Patient1 has fever and cough.',
    input_dsl: `
      hasSymptom Patient1 Fever
      hasSymptom Patient1 Cough
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 4: Query patient symptoms ===
  {
    action: 'query',
    input_nl: 'What symptoms does Patient1 have?',
    input_dsl: '@q hasSymptom Patient1 ?symptom',
    expected_nl: 'Patient1 hasSymptom Fever'
  },

  // === PHASE 5: Learn doctor abilities ===
  {
    action: 'learn',
    input_nl: 'Dr. Smith can prescribe. Dr. Jones can diagnose.',
    input_dsl: `
      can DrSmith Prescribe
      can DrJones Diagnose
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 6: Prove doctor ability ===
  {
    action: 'prove',
    input_nl: 'Can Dr. Smith prescribe?',
    input_dsl: '@goal can DrSmith Prescribe',
    expected_nl: 'True: DrSmith can Prescribe'
  },

  // ============================================================
  // LEGAL DOMAIN
  // ============================================================

  // === PHASE 7: Learn defendant status ===
  {
    action: 'learn',
    input_nl: 'John is innocent. Mary is guilty.',
    input_dsl: `
      hasStatus John Innocent
      hasStatus Mary Guilty
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 8: Prove defendant status ===
  {
    action: 'prove',
    input_nl: 'Is John innocent?',
    input_dsl: '@goal hasStatus John Innocent',
    expected_nl: 'True: John is innocent'
  },

  // === PHASE 9: Learn court hierarchy and type hierarchy ===
  {
    action: 'learn',
    input_nl: 'Build court type hierarchy: Institution > LegalBody > Court > TrialCourt. District court is a trial court.',
    input_dsl: `
      isA LegalBody Institution
      isA Court LegalBody
      isA TrialCourt Court
      isA AppellateBody Court
      isA DistrictCourt TrialCourt
      isA AppealsCourt AppellateBody
      appealsTo DistrictCourt AppealsCourt
      appealsTo AppealsCourt SupremeCourt
    `,
    expected_nl: 'Learned 8 facts'
  },

  // === PHASE 10: Prove court appeal ===
  {
    action: 'prove',
    input_nl: 'Does District Court appeal to Appeals Court?',
    input_dsl: '@goal appealsTo DistrictCourt AppealsCourt',
    expected_nl: 'True: DistrictCourt appealsTo AppealsCourt'
  },

  // === PHASE 10b: Prove DistrictCourt is a Court (2-step transitive) ===
  // CHAIN: DistrictCourt -> TrialCourt -> Court
  {
    action: 'prove',
    input_nl: 'Is DistrictCourt a Court?',
    input_dsl: '@goal isA DistrictCourt Court',
    expected_nl: 'True: DistrictCourt is a court. Proof: DistrictCourt is a trialcourt. TrialCourt is a court.'
  },

  // === PHASE 10c: Prove DistrictCourt is a LegalBody (3-step transitive) ===
  // CHAIN: DistrictCourt -> TrialCourt -> Court -> LegalBody
  {
    action: 'prove',
    input_nl: 'Is DistrictCourt a LegalBody?',
    input_dsl: '@goal isA DistrictCourt LegalBody',
    expected_nl: 'True: DistrictCourt is a legalbody. Proof: DistrictCourt is a trialcourt. TrialCourt is a court. Court is a legalbody.'
  },

  // === PHASE 10d: Prove DistrictCourt is an Institution (4-step transitive) ===
  // CHAIN: DistrictCourt -> TrialCourt -> Court -> LegalBody -> Institution
  {
    action: 'prove',
    input_nl: 'Is DistrictCourt an Institution?',
    input_dsl: '@goal isA DistrictCourt Institution',
    expected_nl: 'True: DistrictCourt is an institution. Proof: DistrictCourt is a trialcourt. TrialCourt is a court. Court is a legalbody. LegalBody is an institution.'
  },

  // === PHASE 11: Learn legal temporal sequence ===
  {
    action: 'learn',
    input_nl: 'Arrest before trial. Trial before verdict.',
    input_dsl: `
      before Arrest Trial
      before Trial Verdict
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 12: Prove temporal order ===
  {
    action: 'prove',
    input_nl: 'Is arrest before trial?',
    input_dsl: '@goal before Arrest Trial',
    expected_nl: 'True: Arrest before Trial'
  },

  // ============================================================
  // PERMISSIONS DOMAIN
  // ============================================================

  // === PHASE 13: Learn permissions ===
  {
    action: 'learn',
    input_nl: 'Legal advice is permitted. Practicing without license is forbidden.',
    input_dsl: `
      permitted LegalAdvice
      forbidden PracticeWithoutLicense
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 14: Prove permission ===
  {
    action: 'prove',
    input_nl: 'Is legal advice permitted?',
    input_dsl: '@goal permitted LegalAdvice',
    expected_nl: 'True: LegalAdvice is permitted'
  },

  // === PHASE 15: Prove prohibition ===
  {
    action: 'prove',
    input_nl: 'Is practicing without license forbidden?',
    input_dsl: '@goal forbidden PracticeWithoutLicense',
    expected_nl: 'True: PracticeWithoutLicense is forbidden'
  },

  // ============================================================
  // CROSS-DOMAIN QUERIES
  // ============================================================

  // === PHASE 16: Query what is necessary ===
  {
    action: 'learn',
    input_nl: 'Evidence is necessary. Due process is necessary.',
    input_dsl: `
      necessary Evidence
      necessary DueProcess
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 17: Prove necessity ===
  {
    action: 'prove',
    input_nl: 'Is evidence necessary?',
    input_dsl: '@goal necessary Evidence',
    expected_nl: 'True: Evidence is necessary'
  },

  // === PHASE 18: Negative - no status ===
  {
    action: 'prove',
    input_nl: 'Is Bob innocent?',
    input_dsl: '@goal hasStatus Bob Innocent',
    expected_nl: 'Cannot prove: Bob is innocent'
  },

  // === PHASE 19: Negative - no ability ===
  {
    action: 'prove',
    input_nl: 'Can Patient1 prescribe?',
    input_dsl: '@goal can Patient1 Prescribe',
    expected_nl: 'Cannot prove: Patient1 can Prescribe'
  },

  // === PHASE 20: Negative - no permission ===
  {
    action: 'prove',
    input_nl: 'Is bribery permitted?',
    input_dsl: '@goal permitted Bribery',
    expected_nl: 'Cannot prove: Bribery is permitted'
  }
];

export default { name, description, theories, steps };
