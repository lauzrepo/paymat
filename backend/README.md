# Payment Portal Backend

Complete backend API for payment portal with Helcim integration.

## Features

- ✅ User authentication with JWT
- ✅ One-time payment processing
- ✅ Recurring subscription management
- ✅ Invoice generation and management
- ✅ Payment method storage
- ✅ Webhook handling for Helcim events
- ✅ GDPR compliance (data export, account deletion)
- ✅ Comprehensive audit logging
- ✅ Rate limiting and security
- ✅ TypeScript with strict mode
- ✅ Prisma ORM with PostgreSQL

## Prerequisites

- Node.js 18+ LTS
- PostgreSQL 14+
- Helcim merchant account
- npm or yarn

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
nano .env

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate
```

## Environment Variables

See `.env.example` for all required environment variables.

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for access tokens (32+ chars)
- `JWT_REFRESH_SECRET` - Secret for refresh tokens (32+ chars)
- `HELCIM_API_TOKEN` - Helcim API token
- `HELCIM_WEBHOOK_SECRET` - Helcim webhook secret
- `FRONTEND_URL` - Frontend application URL

## Development

```bash
# Start development server with hot reload
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# Open Prisma Studio (database GUI)
npm run prisma:studio
```

## Production

```bash
# Build for production
npm run build

# Start production server
npm start

# Run database migrations (production)
npm run prisma:deploy
```

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /logout` - Logout user
- `POST /refresh-token` - Refresh access token
- `GET /me` - Get current user
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password

### Payments (`/api/payments`)
- `POST /create` - Create and process payment
- `GET /history` - Get payment history (paginated)
- `GET /stats` - Get payment statistics
- `GET /:id` - Get single payment
- `POST /:id/refund` - Refund a payment

### Subscriptions (`/api/subscriptions`)
- `GET /plans` - Get available subscription plans
- `POST /create` - Create subscription
- `GET /active` - Get active subscriptions
- `GET /:id` - Get single subscription
- `PUT /:id/cancel` - Cancel subscription
- `PUT /:id/update` - Update subscription plan
- `PUT /:id/reactivate` - Reactivate canceled subscription

### Invoices (`/api/invoices`)
- `GET /` - Get invoices (paginated)
- `GET /stats` - Get invoice statistics
- `GET /:id` - Get single invoice
- `GET /:id/pdf` - Get invoice PDF URL
- `POST /:id/send` - Send invoice via email

### Payment Methods (`/api/payment-methods`)
- `POST /attach` - Save payment method
- `GET /` - Get all payment methods
- `DELETE /:id` - Delete payment method
- `PUT /:id/default` - Set payment method as default

### Webhooks (`/api/webhooks`)
- `POST /helcim` - Handle Helcim webhooks

### GDPR (`/api/gdpr`)
- `GET /export-data` - Export all user data
- `POST /delete-account` - Delete user account
- `GET /status` - Get GDPR compliance status

### Health Check
- `GET /health` - Health check endpoint

## Database Schema

See `prisma/schema.prisma` for complete database schema.

**Models:**
- `User` - User accounts with GDPR consent
- `Payment` - One-time payments
- `Subscription` - Recurring subscriptions
- `Invoice` - Invoices
- `PaymentMethod` - Saved payment methods
- `AuditLog` - Audit trail for all user actions

## Security

- JWT authentication with 15-minute access tokens
- Bcrypt password hashing (10 rounds)
- Rate limiting on all endpoints
- Helmet security headers
- CORS whitelist
- Input validation with Zod
- SQL injection protection via Prisma ORM
- Webhook signature verification

## Helcim Integration

The backend integrates with Helcim for:
- Customer management
- Payment processing
- Recurring billing
- Card tokenization (secure)
- Invoice management
- Transaction tracking
- Webhook events

All card data is tokenized client-side using Helcim.js - no card numbers are ever sent to or stored on the backend.

## Webhook Events Handled

- `transaction.success` - Payment completed
- `transaction.declined` - Payment declined
- `transaction.refunded` - Payment refunded
- `recurring.created` - Subscription created
- `recurring.cancelled` - Subscription cancelled
- `recurring.payment.success` - Recurring payment succeeded
- `recurring.payment.failed` - Recurring payment failed
- `invoice.created` - Invoice created
- `invoice.paid` - Invoice paid
- `invoice.overdue` - Invoice overdue
- `cardtoken.created` - Card token created
- `cardtoken.deleted` - Card token deleted

## Logging

Winston structured logging is configured for:
- Request/response logging
- Error logging with stack traces
- Audit trail logging
- Helcim API interactions

Logs are stored in:
- `logs/error.log` - Error logs only
- `logs/combined.log` - All logs

## Error Handling

Custom `AppError` class for operational errors:
```typescript
throw new AppError(statusCode, message);
```

All errors are caught by centralized error handler.

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests only
npm run test:integration

# Watch mode
npm run test:watch
```

## Deployment

See `/docs/payment-portal-infrastructure.md` for complete deployment guide.

**Recommended platforms:**
- Backend: Railway or Render
- Database: Railway PostgreSQL or managed PostgreSQL
- Environment: Node.js 18+ LTS

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   └── server.ts        # Express server
├── prisma/
│   └── schema.prisma    # Database schema
├── tests/               # Test files
├── logs/                # Log files
├── .env.example         # Environment template
├── package.json
└── tsconfig.json
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run migrations
- `npm run prisma:studio` - Open Prisma Studio

## Contributing

1. Create a feature branch
2. Make changes
3. Run tests and linting
4. Submit pull request

## License

[Your License]
