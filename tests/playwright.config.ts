import dotenv from 'dotenv';
import os from 'os';

import {PlaywrightTestConfig, ReporterDescription, expect} from '@playwright/test';

import {DatalensTestFixtures} from './utils/playwright/globalTestDefinition';

dotenv.config();

const maxWorkers = process.env.DLCI ? 6 : Number(process.env.E2E_MAX_WORKERS || os.cpus().length);

const testMatch = process.env.E2E_TEST_MATCH
    ? `**/${process.env.E2E_TEST_MATCH}.test.ts`
    : undefined;

const grep = process.env.E2E_TEST_NAME_PATTERN
    ? new RegExp(process.env.E2E_TEST_NAME_PATTERN)
    : undefined;

const workers = process.env.E2E_DEBUG ? 1 : maxWorkers;

const retries = process.env.E2E_RETRY_TIMES ? Number(process.env.E2E_RETRY_TIMES) : 0;

const testDir = process.env.E2E_SUITE ? `./suites/${process.env.E2E_SUITE}` : './suites';

const headful = Boolean(process.env.E2E_HEADFUL);

const slowMo = Number.isInteger(Number(process.env.E2E_SLOW_MO))
    ? Number(process.env.E2E_SLOW_MO)
    : 100;

const reporter: ReporterDescription[] = [
    ['html', {outputFolder: 'artifacts/report', open: 'never'}],
    ['list'],
];

// While we are too lazy to add expect to each file.
Object.defineProperty(global, 'expect', {
    writable: false,
    value: expect,
});

const baseURL = process.env.E2E_DOMAIN;

const globalSetupPath = './utils/playwright/datalens/e2e/setup-e2e';

console.log(`Base URL for tests is: ${baseURL}`);

const testTimeout = 60000 * 1.5;
const playwrightConfig: PlaywrightTestConfig<DatalensTestFixtures> = {
    workers,
    testMatch,
    retries,
    testDir,
    reporter,
    grep,
    fullyParallel: true,
    globalSetup: require.resolve(globalSetupPath),
    timeout: testTimeout,
    forbidOnly: true,
    expect: {
        timeout: testTimeout,
    },
    use: {
        browserName: 'chromium',
        launchOptions: {
            slowMo,
        },
        headless: !headful,
        baseURL,
        storageState: 'artifacts/storageState.json',
        ignoreHTTPSErrors: true,
        viewport: {width: 1920, height: 1080},
        trace: {mode: 'on-first-retry', screenshots: false, sources: false},
        actionTimeout: testTimeout,
        testIdAttribute: 'data-qa',
    },
};

module.exports = playwrightConfig;
