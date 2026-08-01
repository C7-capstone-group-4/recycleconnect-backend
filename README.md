# RecycleConnect Backend API

> Smart Schedules Recycling Coordination and Rewards Platform

RecycleConnect is a RESTful API backend built to coordinate recyclable waste collection,
partner pricing, household readiness signals, digital wallet payouts, and bulk recycler marketplace
inventory across Nigerian urban communities.

The platform connects four distinct user roles:

1. Households (Marks materials ready for scheduled collection or drop-off, earns digital wallet rewards).
2. Collection Partners (Verified local aggregators who set buying prices, publish collection schedules, and log cash/digital transactions).
3. Recycling Organisations (Commercial processing companies viewing aggregated partner stock and making bulk purchases).
4. Admins (Internal team verifying partners, reviewing applications, and resolving transaction disputes).

---

## Technical Stack & Dependencies

- Runtime Environment: Node.js (v18+)
- Web Framework: Express.js (v4.x)
- Database: PostgreSQL (Relational Database)
- Object-Relational Mapping (ORM): Prisma ORM (v7.x) with `@prisma/adapter-pg`
- Authentication & Security: JSON Web Tokens (JWT), Bcrypt.js, Helmet.js, CORS
- Media Storage: Cloudinary SDK
- Payment Gateway & Wallet Integrations: Paystack REST API
- Push Notifications: Firebase Cloud Messaging (FCM via `firebase-admin`)
- SMS & OTP Gateway: Termii API / Development Mock Mode

---

## System Architecture & Project Structure

The codebase uses a Feature-Based Modular Architecture (`src/modules/<feature>/`), keeping controllers, routes, and services for each domain self-contained and isolated.

```text
recycleconnect-backend/
├── prisma/
│   ├── schema.prisma            # Prisma Database Schema & Models
│   ├── seed.js                  # Initial Database Seeder for Material Categories
│   └── migrations/              # SQL Database Migration History
├── src/
│   ├── config/                  # DB connection, Cloudinary, and Firebase configs
│   ├── middlewares/             # Auth JWT (protect), RBAC (restrictTo), Multer upload
│   ├── utils/                   # Helper functions (validator, jwt, referenceCode, paystackService, otpService)
│   └── modules/
│       ├── auth/                # Registration (Household, Partner, Recycler), Login (PIN & Password), OTP
│       ├── users/               # Profile management, Location updates, FCM device tokens
│       ├── schedules/           # Partner-published buying prices & weekly collection schedules
│       ├── demand/              # Household "Mark as Ready" declarations & Area demand view
│       ├── transactions/        # Transaction logging (Single/Batch), Household confirmations, Disputes
│       ├── wallet/              # Digital Wallet ledger, Paystack top-ups, Bank withdrawals, Utility spending
│       ├── recyclers/           # Aggregated stock inventory & Express Interest purchase workflow
│       ├── upload/              # Cloudinary media upload routes
│       └── admin/               # Application verification, Dispute resolution, Oversight list
├── .env.example                 # Environment variables template
├── .gitignore
├── app.js                       # Express application configuration & route mounting
└── server.js                    # Server entry point
```

## Getting Started (Local Setup)

### Prerequisites

- Node.js v18.0.0 or higher
- PostgreSQL database instance (local or hosted on Render/Neon)
- Git

### Installation Steps

1. Clone the repository:

```Bash
git clone https://github.com/C7-capstone-group-4/recycleconnect-backend.git
cd recycleconnect-backend
```

2. Install dependencies:

```Bash
npm install
```

3. Configure Environment Variables:
   Copy `.env.example` to create your local `.env` file:

```Bash
cp .env.example .env
```

Update the values in `.env` with your PostgreSQL database connection string and API keys. 4. Run Database Migrations:

```Bash
npx prisma migrate dev --name init
```

5. Seed Initial Database Data:
   Populates default material categories (PET Plastics, Aluminum Cans, Glass Bottles, Cartons & Paper, Scrap Metal):

```Bash
npm run prisma:seed
```

6. Start the Development Server:

```Bash
npm run dev
```

The server will start on `http://localhost:5000`. Test the health check endpoint at `http://localhost:5000/health`.

## Environment Variables Configuration

| Variable                | Description                       | Example Value                                             |
| :---------------------- | :-------------------------------- | :-------------------------------------------------------- |
| `PORT`                  | Local server port                 | `5000`                                                    |
| `NODE_ENV`              | Application environment           | `development` or `production`                             |
| `DATABASE_URL`          | PostgreSQL connection string      | `postgresql://user:pass@host:5432/dbname?sslmode=require` |
| `JWT_SECRET`            | Secret key for signing JWT tokens | `your_super_secret_jwt_key`                               |
| `JWT_EXPIRES_IN`        | Token validity duration           | `7d`                                                      |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Cloud Name             | `your_cloud_name`                                         |
| `CLOUDINARY_API_KEY`    | Cloudinary API Key                | `your_api_key`                                            |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret             | `your_api_secret`                                         |
| `PAYSTACK_SECRET_KEY`   | Paystack Secret Key               | `sk_test_xxxxxxxx`                                        |
| `PAYSTACK_PUBLIC_KEY`   | Paystack Public Key               | `pk_test_xxxxxxxx`                                        |

## API Endpoints Summary

Base URL: `http://localhost:5000/api/v1` (Development) | `https://recycleconnect-api.onrender.com/api/v1` (Production)

### Authentication & Users (`/api/v1/auth`, `/api/v1/users`)

- `POST /auth/send-otp` - Request 4-digit SMS OTP
- `POST /auth/register/household` - Register Household (Phone + OTP + PIN)
- `POST /auth/register/partner` - Register Collection Partner Application
- `POST /auth/register/recycler` - Register Recycling Organisation
- `POST /auth/login/pin` - Login via Phone + PIN (Household & Partner)
- `POST /auth/login/password` - Login via Email + Password (Recyclers & Admin)
- `POST /auth/forgot-pin` - Reset PIN via OTP verification
- `POST /auth/forgot-password` - Request password reset token
- `POST /auth/reset-password` - Reset password using token
- `GET /users/me` - Get current logged-in user profile details
- `PATCH /users/device-token` - Update FCM push notification token

### Schedules & Demand (`/api/v1/partners`, `/api/v1/households`)

- `POST /partners/prices` - Partner publish/update buying prices per kg
- `POST /partners/schedules` - Partner publish recurring collection schedule
- `GET /households/partners` - Household browse nearby partners, schedules, prices, drop-off points
- `POST /households/declarations` - Household mark materials as ready for collection
- `PATCH /households/declarations/:id/cancel` - Household cancel active declaration
- `GET /partners/demand` - Partner view accumulated area demand count and landmark list

### Collections & Wallet (`/api/v1/partners`, `/api/v1/households`, `/api/v1/wallet`)

- `GET /households/lookup/:refCode` - Partner lookup household by Reference Code
- `POST /partners/transactions` - Partner log completed collection (single or batch)
- `PATCH /households/transactions/:id/confirm` - Household confirm cash transaction & receive wallet credit
- `POST /households/transactions/:id/dispute` - Household flag transaction dispute
- `GET /households/history` - Household view recycling transaction history
- `GET /partners/history` - Partner view logged transaction history
- `GET /wallet` - Fetch wallet balance and transaction statement
- `POST /wallet/topup` - Partner pre-fund wallet via Paystack
- `POST /wallet/link-bank` - Link bank account via Paystack account resolution
- `POST /wallet/withdraw` - Household withdraw wallet earnings to bank account
- `POST /wallet/spend-utility` - Spend wallet balance in-app on airtime/data/bills

### Recycler Marketplace & Admin (`/api/v1/recyclers`, `/api/v1/admin`)

- `GET /recyclers/inventory` - View aggregated available material inventory across partners
- `POST /recyclers/express-interest` - Recycler signal purchase intent to partner
- `PATCH /partners/interests/:id/respond` - Partner accept or decline recycler interest
- `POST /recyclers/purchases/paystack` - Recycler pay for bulk stock via Paystack in-app
- `GET /admin/applications` - Admin review pending partner and recycler applications
- `PATCH /admin/applications/:id/review` - Admin approve or reject application
- `GET /admin/disputes` - Admin view flagged transaction disputes
- `PATCH /admin/disputes/:id/resolve` - Admin resolve dispute and set final payout
- `GET /admin/oversight` - Admin view platform oversight list
