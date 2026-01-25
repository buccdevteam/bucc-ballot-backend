#!/usr/bin/env node

/**
 * Test Script for Admin Authentication
 * Tests the backend admin authentication endpoints
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';
const TEST_EMAIL = 'admin@bucc.edu.ng';
const TEST_PASSWORD = 'admin123';

let authToken = null;

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
};

async function testHealthCheck() {
  log.info('Testing health check endpoint...');
  try {
    const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
    if (response.data.status === 'success') {
      log.success('Health check passed');
      return true;
    }
    log.error('Health check failed');
    return false;
  } catch (error) {
    log.error(`Health check failed: ${error.message}`);
    return false;
  }
}

async function testAdminLogin() {
  log.info('Testing admin login...');
  try {
    const response = await axios.post(
      `${API_BASE_URL}/admin/auth/login`,
      {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      }
    );

    if (response.data.status === 'success' && response.data.token) {
      authToken = response.data.token;
      log.success('Admin login successful');
      log.info(`Token: ${authToken.substring(0, 20)}...`);
      log.info(`Admin: ${response.data.data.user.name} (${response.data.data.user.email})`);
      return true;
    }
    log.error('Login failed: No token received');
    return false;
  } catch (error) {
    if (error.response) {
      log.error(`Login failed: ${error.response.data.message || error.message}`);
    } else {
      log.error(`Login failed: ${error.message}`);
    }
    return false;
  }
}

async function testInvalidLogin() {
  log.info('Testing invalid login credentials...');
  try {
    await axios.post(
      `${API_BASE_URL}/admin/auth/login`,
      {
        email: TEST_EMAIL,
        password: 'wrongpassword',
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      }
    );
    log.error('Invalid login should have failed but succeeded');
    return false;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      log.success('Invalid login correctly rejected');
      return true;
    }
    log.error(`Unexpected error: ${error.message}`);
    return false;
  }
}

async function testGetCurrentAdmin() {
  log.info('Testing get current admin...');
  if (!authToken) {
    log.error('No auth token available');
    return false;
  }

  try {
    const response = await axios.get(
      `${API_BASE_URL}/admin/auth/me`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        withCredentials: true,
      }
    );

    if (response.data.status === 'success' && response.data.data.admin) {
      log.success('Get current admin successful');
      log.info(`Admin: ${response.data.data.admin.name} (${response.data.data.admin.role})`);
      return true;
    }
    log.error('Get current admin failed: No admin data');
    return false;
  } catch (error) {
    if (error.response) {
      log.error(`Get current admin failed: ${error.response.data.message || error.message}`);
    } else {
      log.error(`Get current admin failed: ${error.message}`);
    }
    return false;
  }
}

async function testUnauthorizedAccess() {
  log.info('Testing unauthorized access...');
  try {
    await axios.get(
      `${API_BASE_URL}/admin/auth/me`,
      {
        headers: {},
        withCredentials: true,
      }
    );
    log.error('Unauthorized access should have failed but succeeded');
    return false;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      log.success('Unauthorized access correctly rejected');
      return true;
    }
    log.error(`Unexpected error: ${error.message}`);
    return false;
  }
}

async function testGetCategories() {
  log.info('Testing get categories (public endpoint)...');
  try {
    const response = await axios.get(`${API_BASE_URL}/categories`);
    if (response.data.status === 'success') {
      log.success(`Get categories successful (${response.data.data.categories.length} categories)`);
      return true;
    }
    log.error('Get categories failed');
    return false;
  } catch (error) {
    log.error(`Get categories failed: ${error.message}`);
    return false;
  }
}

async function testGetCandidates() {
  log.info('Testing get candidates (public endpoint)...');
  try {
    const response = await axios.get(`${API_BASE_URL}/candidates`);
    if (response.data.status === 'success') {
      log.success(`Get candidates successful (${response.data.data.candidates.length} candidates)`);
      return true;
    }
    log.error('Get candidates failed');
    return false;
  } catch (error) {
    log.error(`Get candidates failed: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  BUCC Ballot App - Admin Authentication Test Suite');
  console.log('='.repeat(60) + '\n');

  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Admin Login', fn: testAdminLogin },
    { name: 'Invalid Login', fn: testInvalidLogin },
    { name: 'Get Current Admin', fn: testGetCurrentAdmin },
    { name: 'Unauthorized Access', fn: testUnauthorizedAccess },
    { name: 'Get Categories', fn: testGetCategories },
    { name: 'Get Candidates', fn: testGetCandidates },
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`);
    const passed = await test.fn();
    results.push({ name: test.name, passed });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('  Test Summary');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  results.forEach((result) => {
    if (result.passed) {
      log.success(result.name);
    } else {
      log.error(result.name);
    }
  });

  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}\n`);

  if (failed === 0) {
    log.success('All tests passed!');
    process.exit(0);
  } else {
    log.error(`${failed} test(s) failed`);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  log.error(`Test suite failed: ${error.message}`);
  process.exit(1);
});
