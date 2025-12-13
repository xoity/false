# Multi-Brand Backend - Medusa Configuration

## 🔧 Backend Setup

This is the Medusa backend for the Multi-Brand E-Commerce platform.

### Features

- ✅ Product management
- ✅ Multi-store support
- ✅ Order management
- ✅ Customer management
- ✅ Inventory management
- ✅ Custom banner API
- ✅ Secure authentication
- ✅ Rate limiting
- ✅ Redis caching

---

## 📋 Prerequisites

- Node.js 20+
- PostgreSQL 13+
- Redis 6+

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.template .env
```

Edit `.env`:

```env
DATABASE_URL=postgres://user:password@localhost:5432/medusa-db
REDIS_URL=redis://localhost:6379
JWT_SECRET=<your-secure-secret-32-chars>
COOKIE_SECRET=<your-secure-secret-32-chars>
STORE_CORS=http://localhost:3000
ADMIN_CORS=http://localhost:3000,http://localhost:9000
AUTH_CORS=http://localhost:3000,http://localhost:9000
```

### 3. Create Database

```bash
createdb medusa-db
```

### 4. Run Migrations

```bash
npm run build
npx medusa db:migrate
```

### 5. Seed Data (Optional)

```bash
npm run seed
```

### 6. Start Server

```bash
# Development
npm run dev

# Production
npm run build && npm start
```

---

## 📡 API Endpoints

### Store API

- Base URL: `http://localhost:9000/store`
- Products: `/store/products`
- Cart: `/store/carts`
- Customers: `/store/customers`
- Orders: `/store/orders`

### Admin API

- Base URL: `http://localhost:9000/admin`
- Products: `/admin/products`
- Orders: `/admin/orders`
- Customers: `/admin/customers`
- Banner: `/admin/banner` (custom endpoint)

### Custom Endpoints

- **GET** `/store/health` - Health check with rate limiting
- **GET** `/admin/banner` - Get banner settings
- **POST** `/admin/banner` - Update banner (requires auth)

---

## 🛡️ Security Features

### Authentication

- JWT-based authentication
- Secure session management
- Password hashing

### Rate Limiting

- Health endpoint: 100 requests/minute
- Admin endpoints: Protected by Medusa auth
- Custom rate limiting on sensitive endpoints

### CORS

- Configurable CORS origins
- Separate configs for store, admin, and auth

### Environment Security

- All secrets in environment variables
- Production secret validation
- No hardcoded credentials

---

## 🗄️ Database Schema

Medusa uses PostgreSQL with the following main tables:

- `products` - Product catalog
- `product_variants` - Product variations
- `orders` - Customer orders
- `customers` - Customer information
- `carts` - Shopping carts
- `regions` - Store regions
- `shipping_options` - Shipping methods

---

## 📦 Custom Modules

### Banner Management

Location: `src/api/admin/banner/route.ts`

Manages dynamic banner text for the storefront.

**API**:

```typescript
GET /admin/banner
Response: { text, enabled, backgroundColor, textColor }

POST /admin/banner
Body: { text, enabled?, backgroundColor?, textColor? }
Response: { message, settings }
```

---

## 🔌 Integrations

### Payment Providers

Configure in `medusa-config.ts`:

- Stripe (recommended)
- PayPal
- Manual payment

### Fulfillment Providers

- Manual fulfillment
- Webshipper
- Custom providers

### Notification Providers

- SendGrid
- Mailgun
- Custom SMTP

---

## 🧪 Testing

```bash
# Integration tests
npm run test:integration:http

# Module tests
npm run test:integration:modules

# Unit tests
npm run test:unit
```

---

## 📈 Monitoring

### Health Check

```bash
curl http://localhost:9000/store/health
```

Response:

```json
{
  "message": "Multi-Brand Store API",
  "version": "1.0.0",
  "timestamp": "2024-..."
}
```

---

## 🚀 Deployment

### Production Checklist

- [ ] Set strong JWT_SECRET
- [ ] Set strong COOKIE_SECRET
- [ ] Configure production DATABASE_URL
- [ ] Configure production REDIS_URL
- [ ] Set correct CORS origins
- [ ] Enable HTTPS
- [ ] Set up database backups
- [ ] Configure monitoring
- [ ] Set up error tracking

### Environment Variables

```env
# Production
NODE_ENV=production
DATABASE_URL=postgres://...?sslmode=require
REDIS_URL=redis://...
JWT_SECRET=<strong-random-secret>
COOKIE_SECRET=<strong-random-secret>
STORE_CORS=https://yourdomain.com
ADMIN_CORS=https://admin.yourdomain.com
```

---

## 📚 Documentation

- Medusa Docs: <https://docs.medusajs.com>
- API Reference: <https://docs.medusajs.com/api>
- Development Guide: <https://docs.medusajs.com/development>

---

## 🆘 Troubleshooting

### Database Connection Failed

```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -h localhost -U postgres -d medusa-db
```

### Redis Connection Failed

```bash
# Check Redis is running
redis-cli ping

# Should return: PONG
```

### Migrations Failed

```bash
# Reset database (WARNING: deletes all data)
npx medusa db:reset

# Run migrations
npx medusa db:migrate
```

---

## 📝 Notes

- The `false-storefront` directory can be ignored - we use `multi-brand-shop` as the frontend
- Custom API routes are in `src/api/`
- Middleware and custom logic in `src/`
- Admin customizations in `src/admin/`

---

## 🔐 Security

See `../multi-brand-shop/SECURITY.md` for complete security documentation.

**Important**:

- Never commit `.env` files
- Rotate secrets regularly
- Use strong random secrets (32+ characters)
- Enable SSL for PostgreSQL in production
- Monitor logs for security events
