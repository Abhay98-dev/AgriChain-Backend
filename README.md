# AgriChain Backend

A Node.js + Express backend for AgriChain, providing authenticated marketplace, warehouse management, crop tracing, and rate-limited API security.

## Features

- JWT authentication for users
- User registration and login
- Buyer marketplace endpoints
- Warehouse management endpoints
- Traceability endpoint for crop batches
- Request validation with `express-validator`
- Rate limiting with `express-rate-limit`
- HTTP request logging with `morgan`
- Structured application logging with `winston`
- Security headers via `helmet`
- Pagination support on list endpoints
- Centralized error handling

## Project Structure

- `index.js` - app entrypoint
- `connectDB.js` - MongoDB connection helper
- `models/` - Mongoose schema definitions
- `routes/` - API route definitions
- `controller/` - business logic handlers
- `middlewares/` - authentication, validation, rate limiting, and error handling
- `utils/` - helpers for pagination, logging, inventory, distance, and warehouse selection
- `services/` - AI-related service stubs

## Requirements

- Node.js 18+ or later
- npm
- MongoDB Atlas or MongoDB connection string



## Environment Variables

Create a `.env` file in the project root and define:

```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES=7d
FRONTEND_URL=http://localhost:5173
```

## Running the App

```bash
npm start
```

Or with Nodemon for development:

```bash
npx nodemon index.js
```

## API Endpoints

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`

### Buyer

- `GET /api/buyer/marketplace`
- `POST /api/buyer/purchase`
- `GET /api/buyer/orders/:buyerId`

### Farmer

- `POST /api/farmer/crop-batch`
- `POST /api/farmer/crop-batch/accept-or-reject`
- `POST /api/farmer/crop-batch/initiate-logistics`
- `GET /api/farmer/crop-batch`

### Warehouse

- `POST /api/warehouse/create`
- `PUT /api/warehouse/:warehouseId`
- `DELETE /api/warehouse/:warehouseId`
- `GET /api/warehouse/all`
- `GET /api/warehouse/:warehouseId/batches`
- `GET /api/warehouse/batch/:batchId`
- `POST /api/warehouse/batch/:batchId/receive`
- `GET /api/warehouse/:warehouseId/urgent`

### Trace

- `GET /api/trace/:batchId`

## Notes

- Authentication uses bearer JWT tokens in `Authorization` headers.
- Rate limiting is applied globally and more strictly on auth routes.
- Pagination parameters are `page` and `limit` for list endpoints.
- Validation errors return structured JSON field information.

## Troubleshooting

- If MongoDB fails to connect, confirm `MONGO_URI` in `.env`.
- If authorization fails, verify the token and `JWT_SECRET`.
- All logs appear in the console; HTTP request logs are forwarded through `winston`.
