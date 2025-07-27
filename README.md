# Lendsqr Wallet Service - MVP

## Overview
Demo Credit is a mobile lending app wallet service built with NodeJS, TypeScript, MySQL, and KnexJS ORM. This MVP provides core wallet functionality including account creation, funding, transfers, withdrawals, and Lendsqr Adjutor Karma blacklist integration.

## Features
- ✅ User account creation with blacklist verification
- ✅ Account funding
- ✅ Fund transfers between users
- ✅ Fund withdrawals
- ✅ Lendsqr Adjutor Karma blacklist integration
- ✅ Token-based authentication
- ✅ Transaction history
- ✅ Unit tests with positive and negative scenarios

## Tech Stack
- **Runtime**: NodeJS (LTS version)
- **Language**: TypeScript
- **Database**: MySQL
- **ORM**: KnexJS
- **Testing**: Jest
- **Authentication**: JWT tokens
- **API Integration**: Lendsqr Adjutor Karma

## Database Design

### Entity Relationship Diagram
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     users       │    │    accounts     │    │  transactions   │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ id (PK)         │────│ user_id (FK)    │    │ id (PK)         │
│ email           │    │ id (PK)         │────│ account_id (FK) │
│ phone           │    │ account_number  │    │ type            │
│ first_name      │    │ balance         │    │ amount          │
│ last_name       │    │ status          │    │ recipient_id    │
│ bvn             │    │ created_at      │    │ reference       │
│ created_at      │    │ updated_at      │    │ status          │
│ updated_at      │    └─────────────────┘    │ description     │
└─────────────────┘                           │ created_at      │
                                               │ updated_at      │
                                               └─────────────────┘
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration with blacklist check
- `POST /api/auth/login` - User login

### Wallet Operations
- `GET /api/wallet/balance` - Get account balance
- `POST /api/wallet/fund` - Fund account
- `POST /api/wallet/transfer` - Transfer funds
- `POST /api/wallet/withdraw` - Withdraw funds
- `GET /api/wallet/transactions` - Get transaction history

## Architecture & Design Decisions

### 1. **Layered Architecture**
```
Controllers → Services → Repositories → Database
```
- **Controllers**: Handle HTTP requests/responses
- **Services**: Business logic and validation
- **Repositories**: Data access layer
- **Models**: Database entities

### 2. **Database Design Approach**
- **Users Table**: Core user information
- **Accounts Table**: Wallet accounts (1:1 with users for MVP)
- **Transactions Table**: All financial transactions
- **Normalized design** to avoid data redundancy
- **Foreign key constraints** for data integrity

### 3. **Transaction Scoping**
- All financial operations use database transactions
- Transfer operations are atomic (debit + credit)
- Rollback on any failure to maintain consistency

### 4. **Security & Validation**
- JWT-based authentication
- Input validation using Joi
- Password hashing with bcrypt
- Blacklist verification before onboarding

### 5. **Error Handling**
- Custom error classes for different scenarios
- Centralized error handling middleware
- Proper HTTP status codes
- Detailed error logging

## Environment Variables
```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=lendsqr_wallet
DB_USER=root
DB_PASSWORD=password

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# Adjutor API
ADJUTOR_API_URL=https://adjutor.lendsqr.com/v2
ADJUTOR_API_KEY=your_api_key

# Server
PORT=3000
NODE_ENV=development
```

## Installation & Setup

### Prerequisites
- NodeJS (LTS version)
- MySQL 8.0+
- npm or yarn

### Steps
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lendsqr-wallet-service
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configurations
   ```

4. **Setup database**
   ```bash
   # Create database
   mysql -u root -p -e "CREATE DATABASE lendsqr_wallet;"
   
   # Run migrations
   npm run migrate
   
   # Seed database (optional)
   npm run seed
   ```

5. **Run the application**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## Testing
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## API Usage Examples

### 1. Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "phone": "08123456789",
    "firstName": "John",
    "lastName": "Doe",
    "bvn": "12345678901",
    "password": "securepassword"
  }'
```

### 2. Fund Account
```bash
curl -X POST http://localhost:3000/api/wallet/fund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "amount": 10000,
    "description": "Initial funding"
  }'
```

### 3. Transfer Funds
```bash
curl -X POST http://localhost:3000/api/wallet/transfer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "recipientAccountNumber": "1234567890",
    "amount": 5000,
    "description": "Payment for services"
  }'
```

## Project Structure
```
src/
├── controllers/        # HTTP request handlers
├── services/          # Business logic
├── repositories/      # Data access layer
├── models/           # Database models
├── middleware/       # Custom middleware
├── utils/            # Utility functions
├── types/            # TypeScript interfaces
├── config/           # Configuration files
├── migrations/       # Database migrations
├── seeds/            # Database seeders
└── tests/            # Test files

database/
├── migrations/       # Knex migrations
└── seeds/           # Knex seeds

docs/
├── api.md           # API documentation
└── deployment.md    # Deployment guide
```

## Error Codes & Messages
- `USER_BLACKLISTED`: User found in Karma blacklist
- `INSUFFICIENT_FUNDS`: Account balance too low
- `ACCOUNT_NOT_FOUND`: Account doesn't exist
- `INVALID_CREDENTIALS`: Wrong email/password
- `DUPLICATE_EMAIL`: Email already registered

## Performance Considerations
- Database indexing on frequently queried fields
- Connection pooling for database connections
- Pagination for transaction listings
- Caching for frequently accessed data

## Security Measures
1. **Input Validation**: All inputs validated using Joi
2. **Authentication**: JWT tokens for API access
3. **Password Security**: Bcrypt hashing with salt
4. **SQL Injection Prevention**: Parameterized queries via Knex
5. **Rate Limiting**: API rate limiting middleware
6. **Blacklist Integration**: Real-time verification against Karma

## Deployment
The application is deployed on Heroku at:
`https://[candidate-name]-lendsqr-be-test.herokuapp.com`

### Deployment Steps
1. **Prepare for deployment**
   ```bash
   npm run build
   ```

2. **Configure Heroku**
   ```bash
   heroku create [candidate-name]-lendsqr-be-test
   heroku addons:create cleardb:ignite
   ```

3. **Set environment variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your_production_secret
   # ... other variables
   ```

4. **Deploy**
   ```bash
   git push heroku main
   heroku run npm run migrate
   ```

## Testing Strategy
1. **Unit Tests**: Individual function testing
2. **Integration Tests**: API endpoint testing
3. **Positive Scenarios**: Happy path testing
4. **Negative Scenarios**: Error condition testing
5. **Edge Cases**: Boundary value testing

## Code Quality Standards
- **DRY Principle**: No code duplication
- **WET Avoidance**: Write Everything Twice avoided
- **SOLID Principles**: Followed in service design
- **TypeScript**: Strong typing throughout
- **ESLint**: Code style enforcement
- **Prettier**: Code formatting

## Future Enhancements
- Multi-currency support
- Transaction limits and controls
- Advanced fraud detection
- Mobile app integration
- Real-time notifications
- Analytics and reporting

## Support & Contact
For questions or support, please contact: careers@lendsqr.com

---

**Note**: This is an MVP implementation focusing on core functionality. The codebase demonstrates proficiency in NodeJS, TypeScript, MySQL, and modern software engineering practices as required by the assessment.