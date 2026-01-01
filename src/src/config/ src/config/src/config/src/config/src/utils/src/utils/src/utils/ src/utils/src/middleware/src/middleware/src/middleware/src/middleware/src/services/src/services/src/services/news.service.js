// src/services/news.service.js
const db = require('../config/database');
const redis = require('../config/redis');
const config = require('../config');
const { NotFoundError } = require('../utils/errors');
const { validatePagination } = require('../utils/validators');

class NewsService {
  async getAll(page, limit, category, language) {
    const { page: validPage, limit: validLimit } = validatePagination(page, limit);
    const offset = (validPage - 1) * validLimit;

    let query = `
      SELECT id, title, content, category, author, image_url, tags, views, created_at
      FROM news_articles 
      WHERE published = true
    `;
    const params = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (language) {
      query += ` AND $${paramIndex} = ANY(languages)`;
      params.push(language);
      paramIndex++;
    }

    // Get total count
    const countQuery = query.replace(
      'SELECT id, title, content, category, author, image_url, tags, views, created_at',
      'SELECT COUNT(*)'
    );
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(validLimit, offset);

    const result = await db.query(query, params);

    return {
      items: result.rows,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
      },
    };
  }

  async getById(id) {
    const result = await db.query(
      `SELECT * FROM news_articles WHERE id = $1 AND published = true`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Article');
    }

    // Increment view count
    await db.query(
      'UPDATE news_articles SET views = views + 1 WHERE id = $1',
      [id]
    );

    const article = result.rows[0];
    article.views += 1;

    return article;
  }

  async getTrending(limit = 10) {
    const cacheKey = `news:trending:${limit}`;
    const cached = await redis.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const result = await db.query(
      `SELECT id, title, category, author, image_url, views, created_at
       FROM news_articles 
       WHERE published = true
       ORDER BY views DESC, created_at DESC
       LIMIT $1`,
      [limit]
    );

    await redis.cache.set(cacheKey, result.rows, config.cache.news);
    return result.rows;
  }

  async getCategories() {
    const cacheKey = 'news:categories';
    const cached = await redis.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const result = await db.query(
      `SELECT category, COUNT(*) as count
       FROM news_articles
       WHERE published = true
       GROUP BY category
       ORDER BY count DESC`
    );

    await redis.cache.set(cacheKey, result.rows, config.cache.news);
    return result.rows;
  }

  async search(query, language, limit = 20) {
    let sql = `
      SELECT id, title, content, category, author, image_url, views, created_at
      FROM news_articles
      WHERE published = true
        AND (title ILIKE $1 OR content ILIKE $1 OR $2 = ANY(tags))
    `;
    const params = [`%${query}%`, query];
    let paramIndex = 3;

    if (language) {
      sql += ` AND $${paramIndex} = ANY(languages)`;
      params.push(language);
      paramIndex++;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await db.query(sql, params);
    return result.rows;
  }

  async create(data, authorId) {
    const result = await db.query(
      `INSERT INTO news_articles 
       (title, content, category, languages, author, image_url, tags, published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.title,
        data.content,
        data.category,
        data.languages || ['fr'],
        authorId,
        data.image_url,
        data.tags || [],
        data.published !== false,
      ]
    );

    // Clear cache
    await redis.cache.delPattern('news:*');

    return result.rows[0];
  }
}

module.exports = new NewsService();
