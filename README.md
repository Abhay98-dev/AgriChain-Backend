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

## Core Project Capabilities

### Smart crop listing and offer generation

- Farmers can create crop batches with harvest details, geolocation, spoilage risk, and structured quality data (grade, moisture, size, colour, damage, images, and inspection state).
- Crop batches follow a controlled supply-chain lifecycle: `LISTED` → `OFFERED` → `ACCEPTED`/`REJECTED` → `IN_TRANSIT` → `STORED` or `AT_WAREHOUSE` → `SOLD` (with additional `AT_MARKET` and `CLOSED` states available in the data model).
- A listing generates a transparent farmer offer, including expected selling price, estimated distance, transport, storage, labour, spoilage-buffer, platform-margin, final farmer price, and confidence.
- The backend calls an ML service for price, demand, spoilage probability, and shelf-life predictions. If an ML prediction is unavailable, safe fallback values allow the listing flow to continue and expose per-prediction health status.
- Gemini produces advisory-only farmer and warehouse views: pricing explanation, quality assessment, storage and selling recommendations, sell-by guidance, and risk warnings. It does not set the final price or override ML outputs.

### Warehouse selection engine and logistics planning

- The warehouse selection engine considers only warehouses with enough remaining capacity after normalising crop quantity from kilograms or quintals.
- Eligible warehouses are ranked using farmer-to-warehouse distance, predicted demand, spoilage priority, and a cold-storage bonus for high-spoilage crops.
- Once a farmer accepts an offer, logistics assigns the highest-scoring warehouse, retrieves driving distance and duration through OSRM, estimates transport cost, and creates a six-to-twelve-hour pickup window.
- The assigned warehouse, transport mode, route distance, travel time, estimated cost, and assignment time are retained with the crop batch for operational visibility and traceability.

### Warehouse operations and inventory control

- Administrators can create, update, delete, and paginate warehouse records, including coordinates, capacity, cold-storage availability, current load, and crop-level inventory.
- Warehouse staff can receive only batches assigned to their warehouse and currently `IN_TRANSIT`; receipt changes the batch to `STORED` or `AT_WAREHOUSE` and optionally records a quality inspection.
- Receiving a batch verifies remaining capacity and increments both the warehouse load and crop-specific inventory in kilograms.
- Selling a stored batch decrements warehouse load and removes empty crop inventory entries.
- Warehouse views expose assigned batches, AI warehouse advice, sell-by dates, and an urgent-batch queue based on high AI risk levels.

### Buyer marketplace and fulfilment safeguards

- The marketplace lists batches that are in transit or available at warehouses, with quality, warehouse, expected price, risk level, and sell-by information.
- For buyers with coordinates, it calculates warehouse-to-buyer road distance and delivery time, and warns when the estimated journey exceeds the remaining sell-by window.
- Buyers cannot buy their own crop, buy unavailable batches, purchase on another user's behalf, or submit a price below the batch's minimum farmer price.
- Completed purchases mark the batch as `SOLD`, record buyer and sale information, update warehouse inventory when applicable, and append the purchase to the buyer's order history.

### Traceability and access control

- A public crop trace endpoint returns the farmer, assigned warehouse, buyer, offer, logistics details, AI insight, current state, and an event timeline covering creation, offer generation, acceptance, logistics start, and sale.
- Trace responses explicitly identify that the current timeline is off-chain; blockchain fields are present in the data model, but blockchain verification is not enabled by this backend.
- JWT claims enforce authenticated user access for farmer and buyer actions, while warehouse administration and receiving operations require the `ADMIN` role.

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
