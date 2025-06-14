const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
const app = require('../server');
const User = require('../models/User');
const Expense = require('../models/Expense');

describe('Expense Endpoints', () => {
  let employeeToken;
  let managerToken;
  let employeeId;
  let managerId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Expense.deleteMany({});

    // Create employee user
    const employee = await User.create({
      name: 'Test Employee',
      email: 'employee@example.com',
      password: 'Password123!',
      role: 'employee'
    });
    employeeId = employee._id;

    // Create manager user
    const manager = await User.create({
      name: 'Test Manager',
      email: 'manager@example.com',
      password: 'Password123!',
      role: 'manager'
    });
    managerId = manager._id;

    // Get tokens
    const employeeLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'employee@example.com',
        password: 'Password123!'
      });
    employeeToken = employeeLogin.body.token;

    const managerLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'manager@example.com',
        password: 'Password123!'
      });
    managerToken = managerLogin.body.token;
  });

  describe('POST /api/expenses/submit', () => {
    it('should submit a new expense', async () => {
      const res = await request(app)
        .post('/api/expenses/submit')
        .set('Authorization', `Bearer ${employeeToken}`)
        .field('amount', 100)
        .field('description', 'Test expense')
        .field('category', 'Travel')
        .field('date', new Date().toISOString())
        .attach('receipt', path.join(__dirname, 'fixtures/test-receipt.jpg'));

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.amount).toBe(100);
      expect(res.body.status).toBe('Pending');
    });

    it('should not submit expense without authentication', async () => {
      const res = await request(app)
        .post('/api/expenses/submit')
        .field('amount', 100)
        .field('description', 'Test expense')
        .field('category', 'Travel')
        .field('date', new Date().toISOString());

      expect(res.statusCode).toBe(401);
    });

    it('should validate expense data', async () => {
      const res = await request(app)
        .post('/api/expenses/submit')
        .set('Authorization', `Bearer ${employeeToken}`)
        .field('amount', -100)
        .field('description', '')
        .field('category', 'Invalid')
        .field('date', 'invalid-date');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/expenses/my-expenses', () => {
    beforeEach(async () => {
      await Expense.create([
        {
          user: employeeId,
          amount: 100,
          description: 'Test expense 1',
          category: 'Travel',
          date: new Date(),
          status: 'Pending'
        },
        {
          user: employeeId,
          amount: 200,
          description: 'Test expense 2',
          category: 'Meals',
          date: new Date(),
          status: 'Approved'
        }
      ]);
    });

    it('should get user expenses', async () => {
      const res = await request(app)
        .get('/api/expenses/my-expenses')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    it('should not get expenses without authentication', async () => {
      const res = await request(app)
        .get('/api/expenses/my-expenses');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/expenses/all', () => {
    beforeEach(async () => {
      await Expense.create([
        {
          user: employeeId,
          amount: 100,
          description: 'Test expense 1',
          category: 'Travel',
          date: new Date(),
          status: 'Pending'
        },
        {
          user: managerId,
          amount: 200,
          description: 'Test expense 2',
          category: 'Meals',
          date: new Date(),
          status: 'Approved'
        }
      ]);
    });

    it('should get all expenses for manager', async () => {
      const res = await request(app)
        .get('/api/expenses/all')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    it('should not get all expenses for employee', async () => {
      const res = await request(app)
        .get('/api/expenses/all')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('PATCH /api/expenses/:id/status', () => {
    let expenseId;

    beforeEach(async () => {
      const expense = await Expense.create({
        user: employeeId,
        amount: 100,
        description: 'Test expense',
        category: 'Travel',
        date: new Date(),
        status: 'Pending'
      });
      expenseId = expense._id;
    });

    it('should update expense status by manager', async () => {
      const res = await request(app)
        .patch(`/api/expenses/${expenseId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'Approved' });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('Approved');
      expect(res.body.reviewedBy).toBe(managerId.toString());
    });

    it('should not update status by employee', async () => {
      const res = await request(app)
        .patch(`/api/expenses/${expenseId}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'Approved' });

      expect(res.statusCode).toBe(403);
    });

    it('should validate status value', async () => {
      const res = await request(app)
        .patch(`/api/expenses/${expenseId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'Invalid' });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/expenses/stats', () => {
    beforeEach(async () => {
      await Expense.create([
        {
          user: employeeId,
          amount: 100,
          description: 'Test expense 1',
          category: 'Travel',
          date: new Date(),
          status: 'Approved'
        },
        {
          user: employeeId,
          amount: 200,
          description: 'Test expense 2',
          category: 'Travel',
          date: new Date(),
          status: 'Approved'
        },
        {
          user: employeeId,
          amount: 150,
          description: 'Test expense 3',
          category: 'Meals',
          date: new Date(),
          status: 'Approved'
        }
      ]);
    });

    it('should get expense statistics', async () => {
      const res = await request(app)
        .get('/api/expenses/stats')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('categoryStats');
      expect(res.body).toHaveProperty('monthlyStats');
      expect(res.body.categoryStats.length).toBe(2);
    });

    it('should not get stats without authentication', async () => {
      const res = await request(app)
        .get('/api/expenses/stats');

      expect(res.statusCode).toBe(401);
    });
  });
}); 