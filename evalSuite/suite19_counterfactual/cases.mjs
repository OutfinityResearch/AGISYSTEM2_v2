/**
 * Suite 19 - Counterfactual Reasoning
 *
 * Tests counterfactual reasoning: What if things were different?
 * Reasons about alternative scenarios and causal dependencies.
 *
 * Based on DS06 Section 6.5: Counterfactual Reasoning
 *
 * Core theories: 05-logic, 06-temporal, 12-reasoning
 */

export const name = 'Counterfactual Reasoning';
export const description = 'Test counterfactual reasoning - what if scenarios';

export const theories = [
  '05-logic.sys2',
  '06-temporal.sys2',
  '12-reasoning.sys2'
];

export const timeout = 2000;

export const steps = [
  // ============================================================
  // CAUSAL DEPENDENCIES
  // ============================================================

  // === PHASE 1: Learn causal chain ===
  {
    action: 'learn',
    input_nl: 'Alice bought a car. Alice drives the car to work. Buying enables driving.',
    input_dsl: `
      did Alice Buy Car
      did Alice Drive Car Work
      enables Buy Drive
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 2: Prove Alice drives ===
  {
    action: 'prove',
    input_nl: 'Does Alice drive the car to work?',
    input_dsl: '@goal did Alice Drive Car Work',
    expected_nl: 'True: Alice did Drive to Work'
  },

  // === PHASE 3: Learn what-if dependency ===
  {
    action: 'learn',
    input_nl: 'What if Alice did not buy the car? Then no driving.',
    input_dsl: `
      @notBuy Not (did Alice Buy Car)
      @notDrive Not (did Alice Drive Car Work)
      Implies $notBuy $notDrive
    `,
    expected_nl: 'Learned 3 facts'
  },

  // ============================================================
  // WEATHER COUNTERFACTUAL
  // ============================================================

  // === PHASE 4: Learn weather chain ===
  {
    action: 'learn',
    input_nl: 'It rained. The grass is wet. The picnic was canceled.',
    input_dsl: `
      occurred Rain
      hasState Grass Wet
      occurred CancelPicnic
      causes Rain WetGrass
      causes WetGrass CancelPicnic
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 5: Prove rain caused wet grass ===
  {
    action: 'prove',
    input_nl: 'Did rain cause wet grass?',
    input_dsl: '@goal causes Rain WetGrass',
    expected_nl: 'True: Rain causes WetGrass'
  },

  // === PHASE 6: Prove wet grass caused cancel ===
  {
    action: 'prove',
    input_nl: 'Did wet grass cause picnic cancellation?',
    input_dsl: '@goal causes WetGrass CancelPicnic',
    expected_nl: 'True: WetGrass causes CancelPicnic'
  },

  // === PHASE 7: Counterfactual - no rain ===
  {
    action: 'learn',
    input_nl: 'If no rain, then no wet grass.',
    input_dsl: `
      @cf_noRain Not occurred Rain
      @cf_notWet Not hasState Grass Wet
      @cfRule1 Implies $cf_noRain $cf_notWet
    `,
    expected_nl: 'Learned 3 facts'
  },

  // ============================================================
  // ECONOMIC COUNTERFACTUAL
  // ============================================================

  // === PHASE 8: Learn economic chain ===
  {
    action: 'learn',
    input_nl: 'Company invested. Company grew. Company hired.',
    input_dsl: `
      did Company Invest
      hasState Company Growing
      did Company Hire
      before Invest Grow
      before Grow Hire
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 9: Prove investment before growth ===
  {
    action: 'prove',
    input_nl: 'Was investment before growth?',
    input_dsl: '@goal before Invest Grow',
    expected_nl: 'True: Invest is before Grow'
  },

  // === PHASE 10: Counterfactual dependency ===
  {
    action: 'learn',
    input_nl: 'What if no investment? No growth and no hiring.',
    input_dsl: `
      @cf_noInvest Not did Company Invest
      @cf_noGrow Not hasState Company Growing
      @cf_noHire Not did Company Hire
      @cfRule2 Implies $cf_noInvest $cf_noGrow
      @cfRule3 Implies $cf_noGrow $cf_noHire
    `,
    expected_nl: 'Learned 5 facts'
  },

  // ============================================================
  // MEDICAL COUNTERFACTUAL
  // ============================================================

  // === PHASE 11: Learn treatment chain ===
  {
    action: 'learn',
    input_nl: 'Patient took medicine. Patient recovered.',
    input_dsl: `
      did Patient Take Medicine
      hasState Patient Recovered
      causes TakeMedicine Recovery
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 12: Prove recovery ===
  {
    action: 'prove',
    input_nl: 'Is the patient recovered?',
    input_dsl: '@goal hasState Patient Recovered',
    expected_nl: 'True: Patient is Recovered'
  },

  // === PHASE 13: Counterfactual - no medicine ===
  {
    action: 'learn',
    input_nl: 'If no medicine taken, no recovery.',
    input_dsl: `
      @cf_noMed Not did Patient Take Medicine
      @cf_noRec Not hasState Patient Recovered
      @cfRule4 Implies $cf_noMed $cf_noRec
    `,
    expected_nl: 'Learned 3 facts'
  },

  // ============================================================
  // EDUCATIONAL COUNTERFACTUAL
  // ============================================================

  // === PHASE 14: Learn education chain ===
  {
    action: 'learn',
    input_nl: 'Student studied. Student passed exam. Student graduated.',
    input_dsl: `
      did Student Study
      did Student Pass Exam
      did Student Graduate
      enables Study PassExam
      enables PassExam Graduate
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 15: Prove studying enabled passing ===
  {
    action: 'prove',
    input_nl: 'Did studying enable passing?',
    input_dsl: '@goal enables Study PassExam',
    expected_nl: 'True: Study enables PassExam'
  },

  // === PHASE 16: Counterfactual chain ===
  {
    action: 'learn',
    input_nl: 'If no studying, no passing, no graduation.',
    input_dsl: `
      @cf_noStudy Not did Student Study
      @cf_noPass Not did Student Pass Exam
      @cf_noGrad Not did Student Graduate
      @cfRule5 Implies $cf_noStudy $cf_noPass
      @cfRule6 Implies $cf_noPass $cf_noGrad
    `,
    expected_nl: 'Learned 5 facts'
  },

  // ============================================================
  // ALTERNATIVE SCENARIOS
  // ============================================================

  // === PHASE 17: Alternative actions ===
  {
    action: 'learn',
    input_nl: 'What if Alice took the bus instead? Alternative to driving.',
    input_dsl: `
      alternative TakeBus Drive
      did Bob Take Bus Work
      Not (did Bob Drive Car Work)
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 18: Prove Bob took bus ===
  {
    action: 'prove',
    input_nl: 'Did Bob take the bus to work?',
    input_dsl: '@goal did Bob Take Bus Work',
    expected_nl: 'True: Bob did Take to Work'
  },

  // ============================================================
  // PREVENTION COUNTERFACTUAL
  // ============================================================

  // === PHASE 19: Prevention scenario ===
  {
    action: 'learn',
    input_nl: 'Safety system prevents accidents.',
    input_dsl: `
      has Building SafetySystem
      prevents SafetySystem Accident
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PHASE 20: Prove prevention ===
  {
    action: 'prove',
    input_nl: 'Does safety system prevent accidents?',
    input_dsl: '@goal prevents SafetySystem Accident',
    expected_nl: 'True: SafetySystem prevents Accident'
  },

  // ============================================================
  // NEGATIVE CASES
  // ============================================================

  // === PHASE 21: No counterfactual defined ===
  {
    action: 'prove',
    input_nl: 'What if Charlie flew? (No facts about Charlie)',
    input_dsl: '@goal did Charlie Fly',
    expected_nl: 'Cannot prove: Charlie did Fly'
  },

  // === PHASE 22: Unknown dependency ===
  {
    action: 'prove',
    input_nl: 'Does eating enable flying?',
    input_dsl: '@goal enables Eat Fly',
    expected_nl: 'Cannot prove: Eat enables Fly'
  },

  // ============================================================
  // DEEP CAUSAL CHAINS: 4-5 Step Proofs
  // ============================================================

  // === PHASE 23: Build deep causal chain ===
  {
    action: 'learn',
    input_nl: 'Deep causal chain: Research → Discovery → Patent → Product → Profit.',
    input_dsl: `
      did Lab Research
      did Lab Discover
      did Lab Patent
      did Lab Product
      did Lab Profit
      causes Research Discovery
      causes Discovery Patent
      causes Patent Product
      causes Product Profit
    `,
    expected_nl: 'Learned 9 facts'
  },

  // === PHASE 24: Prove causation chain ===
  {
    action: 'prove',
    input_nl: 'Does research cause discovery?',
    input_dsl: '@goal causes Research Discovery',
    expected_nl: 'True: Research causes Discovery'
  },

  // === PHASE 25: Rule for transitive causation ===
  {
    action: 'learn',
    input_nl: 'Rule: If A causes B and B causes C, then A indirectly causes C.',
    input_dsl: `
      @causeAB causes ?a ?b
      @causeBC causes ?b ?c
      @causeAnd And $causeAB $causeBC
      @causeAC indirectCause ?a ?c
      @causeRule Implies $causeAnd $causeAC
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 26: Prove indirect causation (3-step proof) ===
  {
    action: 'prove',
    input_nl: 'Does research indirectly cause patent?',
    input_dsl: '@goal indirectCause Research Patent',
    expected_nl: 'True: Research indirectcauses Patent'
  },

  // === PHASE 27: Chained effect rules ===
  {
    action: 'learn',
    input_nl: 'If something causes discovery and causes profit, it is valuable.',
    input_dsl: `
      @valCause1 causes ?x Discovery
      @valCause2 causes ?x Profit
      @valAnd And $valCause1 $valCause2
      @valConc hasProperty ?x Valuable
      @valRule Implies $valAnd $valConc
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 28: Deep effect chain with counterfactual ===
  {
    action: 'learn',
    input_nl: 'Counterfactual: No research means no profit (deep chain).',
    input_dsl: `
      @cfNoRes Not did Lab Research
      @cfNoProf Not did Lab Profit
      @cfDeep Implies $cfNoRes $cfNoProf
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PHASE 29: Environmental cascade ===
  {
    action: 'learn',
    input_nl: 'Pollution → ClimateChange → Drought → FoodShortage → Crisis.',
    input_dsl: `
      occurred Pollution
      occurred ClimateChange
      occurred Drought
      occurred FoodShortage
      occurred Crisis
      causes Pollution ClimateChange
      causes ClimateChange Drought
      causes Drought FoodShortage
      causes FoodShortage Crisis
    `,
    expected_nl: 'Learned 9 facts'
  },

  // === PHASE 30: Prove indirect environmental cause ===
  {
    action: 'prove',
    input_nl: 'Does pollution indirectly cause drought?',
    input_dsl: '@goal indirectCause Pollution Drought',
    expected_nl: 'True: Pollution indirectcauses Drought'
  },

  // === PHASE 31: Rule for chained consequences ===
  {
    action: 'learn',
    input_nl: 'If X causes Y and Y causes Z, then preventing X prevents Z.',
    input_dsl: `
      @prevCond1 causes ?x ?y
      @prevCond2 causes ?y ?z
      @prevAnd And $prevCond1 $prevCond2
      @prevConc wouldPrevent ?x ?z
      @prevRule Implies $prevAnd $prevConc
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PHASE 32: Prove prevention chain (4-step proof) ===
  {
    action: 'prove',
    input_nl: 'Would preventing pollution prevent drought?',
    input_dsl: '@goal wouldPrevent Pollution Drought',
    expected_nl: 'True: Pollution wouldprevents Drought'
  },

  // === PHASE 33: Combined causal + prevention reasoning ===
  {
    action: 'prove',
    input_nl: 'Would preventing climate change prevent food shortage?',
    input_dsl: '@goal wouldPrevent ClimateChange FoodShortage',
    expected_nl: 'True: ClimateChange wouldprevents FoodShortage'
  }
];

export default { name, description, theories, steps };
