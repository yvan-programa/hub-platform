#!/bin/bash

# CREATE_REMAINING_FILES.sh
# This script creates all remaining service, controller, and route files

echo "Creating remaining backend files..."

# Create directories if they don't exist
mkdir -p src/services
mkdir -p src/controllers
mkdir -p src/routes

# ===================================
# PROVINCES MODULE
# ===================================

cat > src/services/province.service.js << 'EOF'
const db = require('../config/database');
const redis = require('../config/redis');
const config = require('../config');
const { NotFoundError } = require('../utils/errors');

class ProvinceService {
  async getAll() {
    const cacheKey = 'provinces:all';
    const cached = await redis.cache.get(cacheKey);
    
    if (cached) return cached;

    const result = await db.query('SELECT * FROM provinces ORDER BY name');
    await redis.cache.set(cacheKey, result.rows, config.cache.provinces);
    return result.rows;
  }

  async getById(id) {
    const cacheKey = `province:${id}`;
    const cached = await redis.cache.get(cacheKey);
    
    if (cached) return cached;

    const result = await db.query('SELECT * FROM provinces WHERE id = $1', [id]);
    if (result.rows.length === 0) throw new NotFoundError('Province');

    await redis.cache.set(cacheKey, result.rows[0], config.cache.provinces);
    return result.rows[0];
  }

  async getAttractions(id) {
    const province = await this.getById(id);
    return province.attractions || { categories: [], items: [] };
  }

  async search(query) {
    const result = await db.query(
      'SELECT * FROM provinces WHERE name ILIKE $1 OR description ILIKE $1 ORDER BY name',
      [`%${query}%`]
    );
    return result.rows;
  }
}

module.exports = new ProvinceService();
EOF

cat > src/controllers/province.controller.js << 'EOF'
const provinceService = require('../services/province.service');
const { successResponse } = require('../utils/response');

class ProvinceController {
  async getAll(req, res, next) {
    try {
      const provinces = await provinceService.getAll();
      successResponse(res, provinces);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const province = await provinceService.getById(req.params.id);
      successResponse(res, province);
    } catch (error) {
      next(error);
    }
  }

  async getAttractions(req, res, next) {
    try {
      const attractions = await provinceService.getAttractions(req.params.id);
      successResponse(res, attractions);
    } catch (error) {
      next(error);
    }
  }

  async search(req, res, next) {
    try {
      const provinces = await provinceService.search(req.query.q);
      successResponse(res, provinces);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProvinceController();
EOF

cat > src/routes/province.routes.js << 'EOF'
const express = require('express');
const router = express.Router();
const provinceController = require('../controllers/province.controller');
const cache = require('../middleware/cache');

router.get('/', cache(3600), provinceController.getAll);
router.get('/search', provinceController.search);
router.get('/:id', cache(3600), provinceController.getById);
router.get('/:id/attractions', cache(3600), provinceController.getAttractions);

module.exports = router;
EOF

# ===================================
# NEWS CONTROLLER AND ROUTES
# ===================================

cat > src/controllers/news.controller.js << 'EOF'
const newsService = require('../services/news.service');
const { successResponse, paginatedResponse } = require('../utils/response');

class NewsController {
  async getAll(req, res, next) {
    try {
      const { page, limit, category, language } = req.query;
      const result = await newsService.getAll(page, limit, category, language);
      paginatedResponse(res, result.items, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const article = await newsService.getById(req.params.id);
      successResponse(res, article);
    } catch (error) {
      next(error);
    }
  }

  async getTrending(req, res, next) {
    try {
      const articles = await newsService.getTrending(req.query.limit);
      successResponse(res, articles);
    } catch (error) {
      next(error);
    }
  }

  async getCategories(req, res, next) {
    try {
      const categories = await newsService.getCategories();
      successResponse(res, categories);
    } catch (error) {
      next(error);
    }
  }

  async search(req, res, next) {
    try {
      const { q, language, limit } = req.query;
      const articles = await newsService.search(q, language, limit);
      successResponse(res, articles);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const article = await newsService.create(req.body, req.user.id);
      successResponse(res, article, 'Article created', 201);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NewsController();
EOF

cat > src/routes/news.routes.js << 'EOF'
const express = require('express');
const router = express.Router();
const newsController = require('../controllers/news.controller');
const { protect, authorize } = require('../middleware/auth');
const cache = require('../middleware/cache');

router.get('/', cache(300), newsController.getAll);
router.get('/trending', cache(300), newsController.getTrending);
router.get('/categories', cache(600), newsController.getCategories);
router.get('/search', newsController.search);
router.get('/:id', newsController.getById);
router.post('/', protect, authorize('admin'), newsController.create);

module.exports = router;
EOF

# ===================================
# EVENTS, SHOPPING, TRAFFIC, PAYMENTS, AI MODULES
# ===================================

echo "Creating placeholder modules for Events, Shopping, Traffic, Payments, AI..."

# Create simple placeholder files that return basic responses
for module in event shopping traffic payment ai; do
  cat > src/services/${module}.service.js << EOF
// Placeholder service - implement full logic as needed
class ${module^}Service {
  async getAll() {
    return { message: '${module} service - implement logic' };
  }
}

module.exports = new ${module^}Service();
EOF

  cat > src/controllers/${module}.controller.js << EOF
const ${module}Service = require('../services/${module}.service');
const { successResponse } = require('../utils/response');

class ${module^}Controller {
  async getAll(req, res, next) {
    try {
      const data = await ${module}Service.getAll();
      successResponse(res, data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ${module^}Controller();
EOF

  cat > src/routes/${module}.routes.js << EOF
const express = require('express');
const router = express.Router();
const ${module}Controller = require('../controllers/${module}.controller');

router.get('/', ${module}Controller.getAll);

module.exports = router;
EOF
done

echo "✓ All files created successfully!"
echo ""
echo "Note: Some service files (events, shopping, traffic, payments, AI) are placeholders."
echo "You need to implement the full business logic for these modules."
echo ""
echo "Next steps:"
echo "1. Review and customize the created files"
echo "2. Implement full logic for placeholder services"
echo "3. Run: npm install"
echo "4. Run: npm run migrate"
echo "5. Run: npm run seed"
echo "6. Run: npm run dev"
