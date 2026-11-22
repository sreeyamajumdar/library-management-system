/**
 * Comprehensive Automated RBAC & Three-Role Authentication Test
 *
 * Runs directly against Express app without needing an external port.
 */
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const authRoutes = require('../routes/auth');
const userRoutes = require('../routes/users');
const transactionRoutes = require('../routes/transactions');
const statsRoutes = require('../routes/stats');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/stats', statsRoutes);

// Simple fetch-like helper using supertest-like lightweight handler or mock
async function simulateRequest(method, url, headers = {}, body = null) {
  return new Promise((resolve) => {
    const req = {
      method,
      url,
      headers: { ...headers },
      header(name) {
        return this.headers[name] || this.headers[name.toLowerCase()];
      },
      body: body || {},
      query: {},
      params: {},
    };

    // Extract query string
    if (url.includes('?')) {
      const parts = url.split('?');
      req.url = parts[0];
      const searchParams = new URLSearchParams(parts[1]);
      for (const [k, v] of searchParams.entries()) {
        req.query[k] = v;
      }
    }

    const res = {
      statusCode: 200,
      headers: {},
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader(k, v) {
        this.headers[k] = v;
        return this;
      },
      json(data) {
        resolve({ status: this.statusCode, body: data });
      },
      send(data) {
        resolve({ status: this.statusCode, body: data });
      },
    };

    app.handle(req, res);
  });
}

async function runTests() {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${details}`);
      failed++;
    }
  }

  console.log('=== TEST SUITE: THREE-ROLE AUTHENTICATION & RBAC ===\n');

  // 1. Existing Legacy Student Login
  console.log('1. Testing Student Login...');
  const studentLoginRes = await simulateRequest('POST', '/api/auth/student/login', {}, {
    enrollmentNumber: '12024002001144',
  });
  assert(
    studentLoginRes.status === 200 && studentLoginRes.body.token && studentLoginRes.body.user.position === 'Student',
    'Existing legacy student can log in with enrollment number',
    JSON.stringify(studentLoginRes.body)
  );
  const studentToken = studentLoginRes.body.token;

  // 2. Student attempting to log in via Teacher Login Portal -> Expected 403
  console.log('\n2. Testing Cross-Portal Protection...');
  const crossLoginRes = await simulateRequest('POST', '/api/auth/teacher/login', {}, {
    facultyId: '12024002001144',
  });
  assert(
    crossLoginRes.status === 403,
    'Student cannot log in through Teacher portal (rejected with 403)',
    `Status: ${crossLoginRes.status}`
  );

  // 3. Teacher Login
  console.log('\n3. Testing Teacher Login...');
  const teacherLoginRes = await simulateRequest('POST', '/api/auth/teacher/login', {}, {
    facultyId: '12024002001145',
    password: 'TeacherPassword123!',
  });
  assert(
    teacherLoginRes.status === 200 && teacherLoginRes.body.token && teacherLoginRes.body.user.position === 'Teacher',
    'Teacher logs in with Faculty ID and Password',
    JSON.stringify(teacherLoginRes.body)
  );
  const teacherToken = teacherLoginRes.body.token;

  // 4. Admin Login
  console.log('\n4. Testing Admin Login...');
  const adminLoginRes = await simulateRequest('POST', '/api/auth/admin/login', {}, {
    adminId: 'ADMIN01',
    password: 'AdminPassword123!',
  });
  assert(
    adminLoginRes.status === 200 && adminLoginRes.body.token && adminLoginRes.body.user.position === 'Admin',
    'Admin logs in with Admin ID and Password',
    JSON.stringify(adminLoginRes.body)
  );
  const adminToken = adminLoginRes.body.token;

  // 5. Privilege Escalation Prevention in Registration
  console.log('\n5. Testing Privilege Escalation Prevention in Registration...');
  const fakeAdminEnrollment = `TEST_ESCALATION_${Date.now()}`;
  const regRes = await simulateRequest('POST', '/api/auth/register', {}, {
    name: 'Hacker Attempting Admin',
    department: 'CS',
    enrollmentNumber: fakeAdminEnrollment,
    position: 'Admin', // Visitor attempts to register as Admin
    password: 'password123',
  });
  assert(
    regRes.status === 201 && regRes.body.user.position === 'Student',
    'Visitor passing position: "Admin" is forced to "Student" role by backend',
    `Registered as: ${regRes.body.user?.position}`
  );
  // Clean up test user
  if (regRes.body.user?.id) {
    await User.findByIdAndDelete(regRes.body.user.id);
  }

  // 6. RBAC: User list access (/api/users)
  console.log('\n6. Testing RBAC on Admin-Only Users API (/api/users)...');
  const studentUserListRes = await simulateRequest('GET', '/api/users', {
    Authorization: `Bearer ${studentToken}`,
  });
  assert(
    studentUserListRes.status === 403,
    'Student receives 403 Forbidden on /api/users',
    `Status: ${studentUserListRes.status}`
  );

  const teacherUserListRes = await simulateRequest('GET', '/api/users', {
    Authorization: `Bearer ${teacherToken}`,
  });
  assert(
    teacherUserListRes.status === 403,
    'Teacher receives 403 Forbidden on /api/users',
    `Status: ${teacherUserListRes.status}`
  );

  const adminUserListRes = await simulateRequest('GET', '/api/users', {
    Authorization: `Bearer ${adminToken}`,
  });
  assert(
    adminUserListRes.status === 200 && Array.isArray(adminUserListRes.body.users),
    'Admin receives 200 OK on /api/users with member list',
    `Status: ${adminUserListRes.status}`
  );

  // 7. Dashboard Privacy: Student stats must NOT expose totalUsers
  console.log('\n7. Testing Dashboard Privacy on /api/stats...');
  const studentStatsRes = await simulateRequest('GET', '/api/stats', {
    Authorization: `Bearer ${studentToken}`,
  });
  assert(
    studentStatsRes.status === 200 && studentStatsRes.body.totalUsers === undefined,
    'Student /api/stats does NOT expose totalUsers count (privacy preserved)',
    `totalUsers present: ${studentStatsRes.body.totalUsers}`
  );

  const adminStatsRes = await simulateRequest('GET', '/api/stats', {
    Authorization: `Bearer ${adminToken}`,
  });
  assert(
    adminStatsRes.status === 200 && typeof adminStatsRes.body.totalUsers === 'number',
    'Admin /api/stats includes library-wide totalUsers count',
    `totalUsers: ${adminStatsRes.body.totalUsers}`
  );

  // 8. One-Time Setup Protection
  console.log('\n8. Testing Initial Admin One-Time Setup Protection...');
  const setupAttemptRes = await simulateRequest('POST', '/api/auth/setup-admin', {}, {
    name: 'Second Admin',
    adminId: 'ADMIN02',
    password: 'SecondPassword123!',
  });
  assert(
    setupAttemptRes.status === 403,
    '/api/auth/setup-admin is permanently locked when Admin already exists (403)',
    `Status: ${setupAttemptRes.status}`
  );

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  await mongoose.disconnect();
}

runTests().catch(console.error);
