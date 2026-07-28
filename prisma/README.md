# Database & Prisma Quick Reference

This directory manages database models, migrations, seeding, and cleanup using **Prisma 7 ORM** and **PostgreSQL**.

---

## Command Reference

| Command                  | Action                                                 |
| :----------------------- | :----------------------------------------------------- |
| `npm run prisma:migrate` | Applies `schema.prisma` changes to PostgreSQL database |
| `npm run prisma:seed`    | Populates default categories and PRD test accounts     |
| `npm run prisma:clear`   | Truncates all database tables (wipes data)             |
| `npm run prisma:reset`   | Wipes and re-seeds the database in 1 step              |
| `npx prisma generate`    | Rebuilds `@prisma/client` types (run after `git pull`) |
| `npx prisma studio`      | Opens visual database GUI at `http://localhost:5555`   |

---

## Seeded Test Accounts

| Role          | Login Identifier                 | Password / PIN | Key Data / Balances                                       |
| :------------ | :------------------------------- | :------------- | :-------------------------------------------------------- |
| **Admin**     | `admin@recycleconnect.ng`        | `Password123!` | System Admin                                              |
| **Partner**   | `+2348087654321`                 | PIN: `1234`    | _Green Cycle Hub_ (`Ikeja Zone A`) \| Wallet: ₦50,000     |
| **Household** | `+2348012345678`                 | PIN: `1234`    | Name: _Blessing_ \| Code: **`HC-8392`** \| Wallet: ₦2,500 |
| **Recycler**  | `procurement@lagosrecycling.com` | `Password123!` | _Lagos Plastic Processing Ltd_                            |

---

## Database Import Rule

Always import the shared Prisma instance in controllers and services:

```javascript
import prisma from "../../config/db.js";
```
