/**
 * EvalSuite - Theory and Suite Loader
 * @module evalSuite/lib/loader
 *
 * Loads Core theory stack and suite configurations.
 */

import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONFIG_ROOT = join(ROOT, '..', 'config');

/**
 * Load Core theory files in order
 * @returns {Promise<{files: string[], theories: Object<string, string>}>}
 */
export async function loadCoreTheory() {
  const coreDir = join(CONFIG_ROOT, 'Core');
  const indexPath = join(coreDir, 'index.sys2');

  const files = [];
  const theories = {};

  try {
    const indexContent = await readFile(indexPath, 'utf8');

    // Parse Load directives
    const loadRegex = /@_\s+Load\s+"([^"]+)"/g;
    let match;

    while ((match = loadRegex.exec(indexContent)) !== null) {
      const filename = match[1].replace('./', '');
      files.push(filename);

      const filePath = join(coreDir, filename);
      try {
        theories[filename] = await readFile(filePath, 'utf8');
      } catch (err) {
        theories[filename] = `# Error loading ${filename}: ${err.message}`;
      }
    }
  } catch (err) {
    throw new Error(`Failed to load Core theory index: ${err.message}`);
  }

  return { files, theories };
}

/**
 * Load suite theory files (.sys2) from suite directory
 * @param {string} suiteDir - Suite directory path
 * @returns {Promise<string[]>}
 */
export async function loadSuiteTheories(suiteDir) {
  const theories = [];

  try {
    const entries = await readdir(suiteDir);
    const sys2Files = entries.filter(f => f.endsWith('.sys2')).sort();

    for (const file of sys2Files) {
      const content = await readFile(join(suiteDir, file), 'utf8');
      theories.push(content);
    }
  } catch (err) {
    // No theory files is OK
  }

  return theories;
}

/**
 * Load suite cases from cases.mjs
 * @param {string} suiteDir - Suite directory path
 * @returns {Promise<Object>}
 */
export async function loadSuiteCases(suiteDir) {
  const casesPath = join(suiteDir, 'cases.mjs');

  try {
    const module = await import(casesPath);
    return {
      name: module.name || 'Unknown Suite',
      description: module.description || '',
      cases: module.cases || [],
      theories: module.theories || []
    };
  } catch (err) {
    throw new Error(`Failed to load suite cases from ${casesPath}: ${err.message}`);
  }
}

/**
 * Discover all suites in evalSuite directory
 * @returns {Promise<string[]>}
 */
export async function discoverSuites() {
  const entries = await readdir(ROOT);
  return entries
    .filter(e => e.startsWith('suite') && !e.includes('.'))
    .sort();
}

/**
 * Load all data for a suite
 * @param {string} suiteName - Suite directory name
 * @returns {Promise<Object>}
 */
export async function loadSuite(suiteName) {
  const suiteDir = join(ROOT, suiteName);

  const [coreTheory, suiteTheories, suiteConfig] = await Promise.all([
    loadCoreTheory(),
    loadSuiteTheories(suiteDir),
    loadSuiteCases(suiteDir)
  ]);

  return {
    name: suiteConfig.name,
    description: suiteConfig.description,
    suiteName,
    coreTheory,
    suiteTheories,
    cases: suiteConfig.cases,
    declaredTheories: suiteConfig.theories
  };
}

export default {
  loadCoreTheory,
  loadSuiteTheories,
  loadSuiteCases,
  discoverSuites,
  loadSuite
};
