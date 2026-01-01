// src/services/user.service.js
const db = require('../config/database');
const { NotFoundError } = require('../utils/errors');

class UserService {
  async getUserById(userId) {
    const result = await db.query(
      'SELECT id, email, phone, full_name, role, preferences, last_login, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    return result.rows[0];
  }

  async updateProfile(userId, updates) {
    const allowedFields = ['phone', 'full_name'];
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.getUserById(userId);
    }

    values.push(userId);
    const query = `
      UPDATE users 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING id, email, phone, full_name, role, preferences
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  async updatePreferences(userId, preferences) {
    const result = await db.query(
      `UPDATE users 
       SET preferences = preferences || $1::jsonb, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, preferences`,
      [JSON.stringify(preferences), userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    return result.rows[0];
  }
}

module.exports = new UserService();
