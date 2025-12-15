/**
 * Suite 08 - Rule Chains
 * Tests multi-step rule-based inference with backward chaining.
 */

export const name = 'Rule Chains';
export const description = 'Test multi-step rule inference with causal chains';

export const theories = [
  '05-logic.sys2',
  '09-roles.sys2',
  '12-reasoning.sys2'
];

export const steps = [
  // === Load causal chain theory ===
  {
    action: 'learn',
    input_nl: 'Load causal chain rules',
    input_dsl: '@_ Load "./evalSuite/suite08_rule_chains/theories/causal-chains.sys2"'
  },

  // === Weather chain tests ===
  {
    action: 'learn',
    input_nl: 'It is raining',
    input_dsl: 'hasProperty Weather Rain'
  },
  {
    action: 'prove',
    input_nl: 'Is the ground wet?',
    input_dsl: '@goal hasProperty Ground Wet',
    expected_nl: 'True: Ground is wet'
  },
  {
    action: 'prove',
    input_nl: 'Is the ground slippery?',
    input_dsl: '@goal hasProperty Ground Slippery',
    expected_nl: 'True: Ground is slippery'
  },
  {
    action: 'prove',
    input_nl: 'Is driving dangerous?',
    input_dsl: '@goal hasProperty Driving Dangerous',
    expected_nl: 'True: Driving is dangerous'
  },

  // === Fire chain tests ===
  {
    action: 'learn',
    input_nl: 'There is a spark and fuel',
    input_dsl: `
      present Spark
      present Fuel
    `
  },
  {
    action: 'prove',
    input_nl: 'Should we evacuate?',
    input_dsl: '@goal action Evacuate',
    expected_nl: 'True: Evacuate is action'
  },

  // === Economic chain tests ===
  {
    action: 'learn',
    input_nl: 'Interest rates are low',
    input_dsl: 'hasProperty InterestRates Low'
  },
  {
    action: 'prove',
    input_nl: 'Will the economy be prosperous?',
    input_dsl: '@goal hasState Economy Prosperous',
    expected_nl: 'True: Economy hasState Prosperous'
  },

  // === Health chain tests ===
  {
    action: 'learn',
    input_nl: 'John was exposed to a virus',
    input_dsl: 'exposed Person Virus'
  },
  {
    action: 'prove',
    input_nl: 'Does John need bed rest?',
    input_dsl: '@goal recommend BedRest',
    expected_nl: 'True: BedRest is recommend'
  },

  // === Query tests ===
  {
    action: 'query',
    input_nl: 'What does the weather have?',
    input_dsl: '@q hasProperty Weather ?prop',
    expected_nl: 'Weather is rain'
  }
];

export default { name, description, theories, steps };
