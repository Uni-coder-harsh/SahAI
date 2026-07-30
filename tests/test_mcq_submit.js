const http = require('http');
const crypto = require('crypto');

const API_BASE = 'http://localhost:3000/api';
const SECRET_KEY = 'Bayes_45Ro_Secret_Key_For_AES256_Encryption';

function generateToken(userId) {
  const key = crypto.scryptSync(SECRET_KEY, 'salt', 32);
  const iv = Buffer.alloc(16, 0);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(userId, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${path}`;
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const options = {
      method,
      headers
    };
    
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testSubmit() {
  console.log('=== STARTING SAHAI SYNCHRONOUS MCQ LATENCY & VERIFICATION TEST ===\n');

  try {
    // 1. Onboard a student
    console.log('[1/4] Onboarding new test student...');
    const studentEmail = `sync.student.${Date.now()}@iitb.ac.in`;
    const onboardRes = await request('POST', '/users', {
      sso_email: studentEmail,
      academic_stream: 'B.Tech CSE',
      graduation_year: 2027,
      current_semester: 4,
      device_signature: { client: 'LatencyTestScript' }
    });

    if (onboardRes.status !== 201) {
      throw new Error('Onboarding failed: ' + JSON.stringify(onboardRes.body));
    }

    const userId = onboardRes.body.user.id;
    console.log(`Onboarded successfully. User ID: ${userId}`);

    // Generate JWT token
    const token = generateToken(userId);

    // 2. Submit CORRECT MCQ response synchronously and measure latency
    console.log('\n[2/4] Submitting CORRECT MCQ response (synchronous BKT updates)...');
    const questionId = '0511bf83-a656-5f6a-a201-a00b1c0ea53e';
    const correctOptionId = 'e98dbaa5-8140-5fc2-9411-0eebc930850a';
    
    const startTimeCorrect = Date.now();
    const correctSubmitRes = await request('POST', '/questions/submit', {
      user_id: userId,
      question_id: questionId,
      option_id: correctOptionId,
      time_spent_seconds: 45,
      run_count: 0,
      backspace_count: 0,
      paste_char_count: 0
    }, token);
    const latencyCorrect = Date.now() - startTimeCorrect;

    console.log(`Response Status: ${correctSubmitRes.status}`);
    console.log('Response Body:', JSON.stringify(correctSubmitRes.body, null, 2));
    console.log(`Latency for CORRECT MCQ Submission: ${latencyCorrect}ms`);

    if (correctSubmitRes.status !== 200) {
      throw new Error('CORRECT submission failed: ' + JSON.stringify(correctSubmitRes.body));
    }

    // 3. Submit INCORRECT MCQ response and measure latency (should generate tutor feedback)
    console.log('\n[3/4] Submitting INCORRECT MCQ response (should generate tutor feedback)...');
    const incorrectOptionId = 'd4c20a4f-0c90-597a-8535-68c2e71e5fbe';

    const startTimeIncorrect = Date.now();
    const incorrectSubmitRes = await request('POST', '/questions/submit', {
      user_id: userId,
      question_id: questionId,
      option_id: incorrectOptionId,
      time_spent_seconds: 60,
      run_count: 0,
      backspace_count: 0,
      paste_char_count: 0
    }, token);
    const latencyIncorrect = Date.now() - startTimeIncorrect;

    console.log(`Response Status: ${incorrectSubmitRes.status}`);
    console.log('Response Body:', JSON.stringify(incorrectSubmitRes.body, null, 2));
    console.log(`Latency for INCORRECT MCQ Submission (LLM LLM call): ${latencyIncorrect}ms`);

    if (incorrectSubmitRes.status !== 200) {
      throw new Error('INCORRECT submission failed: ' + JSON.stringify(incorrectSubmitRes.body));
    }

    // 4. Submit INCORRECT MCQ response again for the same concept to test Cache HIT
    console.log('\n[4/4] Submitting INCORRECT MCQ response AGAIN (expecting LLM Cache HIT)...');
    const startTimeCached = Date.now();
    const cachedSubmitRes = await request('POST', '/questions/submit', {
      user_id: userId,
      question_id: questionId,
      option_id: incorrectOptionId,
      time_spent_seconds: 50,
      run_count: 0,
      backspace_count: 0,
      paste_char_count: 0
    }, token);
    const latencyCached = Date.now() - startTimeCached;

    console.log(`Response Status: ${cachedSubmitRes.status}`);
    console.log('Response Body:', JSON.stringify(cachedSubmitRes.body, null, 2));
    console.log(`Latency for Cached INCORRECT MCQ Submission: ${latencyCached}ms`);

    console.log('\n=== ALL MCQ LATENCY TESTS PASSED SUCCESSFULLY ===');
  } catch (error) {
    console.error('\nTest failed:', error);
    process.exit(1);
  }
}

testSubmit();
