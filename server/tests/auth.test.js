const request = require('supertest');
const app = require('../src/app');
const User = require('../src/modules/users/user.model');

describe('Auth & Role Middleware Integration Tests', () => {
  const sampleStudent = {
    name: 'Alice Student',
    email: 'alice@example.com',
    password: 'password123',
    role: 'student',
    yearOfStudy: 2,
    department: 'Computer Science'
  };

  const sampleTutor = {
    name: 'Bob Tutor',
    email: 'bob@example.com',
    password: 'password123',
    role: 'tutor',
    yearOfStudy: 4,
    department: 'Mathematics'
  };

  describe('POST /api/v1/auth/register', () => {
    it('should successfully register a student and set httpOnly cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(sampleStudent);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(sampleStudent.email);
      expect(res.body.data.user.role).toBe('student');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.password).toBeUndefined();

      // Check cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes('refreshToken='))).toBe(true);
      expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);
    });

    it('should successfully register a tutor', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(sampleTutor);

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('tutor');
    });

    it('should reject registration if email is already taken', async () => {
      await request(app).post('/api/v1/auth/register').send(sampleStudent);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(sampleStudent);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('should reject registration if password is under 6 characters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...sampleStudent, password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...sampleStudent, email: 'not-an-email' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with unsupported role (e.g., admin)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...sampleStudent, role: 'admin' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(sampleStudent);
    });

    it('should log in with valid credentials and return access token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: sampleStudent.email,
          password: sampleStudent.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(sampleStudent.email);

      const cookies = res.headers['set-cookie'];
      expect(cookies.some((c) => c.includes('refreshToken='))).toBe(true);
    });

    it('should fail login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: sampleStudent.email,
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should fail login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'doesnotexist@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail login if user account is deactivated', async () => {
      await User.findOneAndUpdate({ email: sampleStudent.email }, { isActive: false });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: sampleStudent.email,
          password: sampleStudent.password
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('deactivated');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens when valid refreshToken cookie is sent', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send(sampleStudent);

      const cookie = regRes.headers['set-cookie'];

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();

      const newCookies = res.headers['set-cookie'];
      expect(newCookies.some((c) => c.includes('refreshToken='))).toBe(true);
    });

    it('should return 401 when no refresh token cookie is provided', async () => {
      const res = await request(app).post('/api/v1/auth/refresh');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 with malformed refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refreshToken=invalid-token-string']);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should clear refresh token cookie and invalidate previous refresh tokens', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send(sampleStudent);

      const token = regRes.body.data.accessToken;
      const initialCookie = regRes.headers['set-cookie'];

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Now attempting to use the previous refresh token should fail
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', initialCookie);

      expect(refreshRes.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me (Protected route)', () => {
    it('should return current user profile when valid token is provided', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send(sampleStudent);

      const token = regRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(sampleStudent.email);
    });

    it('should return 401 when authorization header is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
    });

    it('should return 401 when bearer token is invalid', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.payload');

      expect(res.status).toBe(401);
    });
  });

  describe('Role Authorization Middleware', () => {
    let studentToken;
    let adminToken;

    beforeEach(async () => {
      // Create student
      const studentRes = await request(app)
        .post('/api/v1/auth/register')
        .send(sampleStudent);
      studentToken = studentRes.body.data.accessToken;

      // Create admin directly in database
      const admin = await User.create({
        name: 'Super Admin',
        email: 'admin@tutorlink.com',
        password: 'adminpassword123',
        role: 'admin'
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@tutorlink.com',
          password: 'adminpassword123'
        });
      adminToken = loginRes.body.data.accessToken;
    });

    it('should allow admin to access GET /api/v1/users', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
    });

    it('should deny non-admin (student) access to GET /api/v1/users with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });
  });

  describe('Health Check API', () => {
    it('should return 200 OK from /api/health', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
