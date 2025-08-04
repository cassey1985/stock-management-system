# Stock Management System

A comprehensive web-based stock management system built with React, TypeScript, and Node.js. This system implements FIFO (First-In-First-Out) inventory management, customer debt tracking, and financial reporting based on VBA business logic.

## Features

### 📊 Dashboard
- Real-time overview of business metrics
- Key performance indicators (KPIs)
- Recent transaction summary
- Low stock alerts
- Outstanding debt notifications

### 📦 Inventory Management
- Product catalog management
- Real-time stock level tracking
- FIFO-based cost calculation
- Low stock warnings
- Inventory valuation

### 📥 Stock In (Purchases)
- Record new inventory purchases
- Batch tracking with expiry dates
- Supplier information management
- Automatic cost calculation
- FIFO queue management

### 📤 Stock Out (Sales)
- Record sales transactions
- Automatic FIFO cost calculation
- Real-time profit calculation
- Customer information tracking
- Payment status management

### 👥 Customer Debt Management
- Track unpaid invoices
- Partial payment handling
- Overdue debt identification
- Customer-specific debt reports
- Due date management

### 💰 Payment Processing
- Record customer payments
- Multiple payment methods
- Payment history tracking
- Automatic debt reconciliation
- Reference number management

### 📊 Financial Ledger
- Complete transaction history
- Debit/credit tracking
- Running balance calculation
- Advanced filtering options
- Financial reporting

## Technology Stack

### Frontend
- **React 18** - Modern React with hooks
- **TypeScript** - Type safety and better development experience
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Responsive Design** - Mobile-friendly interface

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **TypeScript** - Type safety on the backend
- **In-Memory Data Storage** - For demo purposes (easily replaceable with database)

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd stock-management-system
   ```

2. **Install dependencies for both frontend and backend**
   ```bash
   npm run install:all
   ```

3. **Start the development servers**
   ```bash
   npm run dev:all
   ```

   This will start:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

### Individual Commands

**Frontend only:**
```bash
npm run dev        # Start frontend development server
npm run build      # Build frontend for production
npm run preview    # Preview production build
```

**Backend only:**
```bash
npm run dev:server    # Start backend development server
npm run build:server  # Build backend for production
npm run start:server  # Start production backend server
```

## Project Structure

```
stock-management-system/
├── src/                      # Frontend source code
│   ├── components/           # React components
│   │   ├── Dashboard.tsx
│   │   ├── Layout.tsx
│   │   ├── StockIn.tsx
│   │   ├── StockOut.tsx
│   │   ├── CustomerDebts.tsx
│   │   ├── Payments.tsx
│   │   ├── FinancialLedger.tsx
│   │   └── Inventory.tsx
│   ├── apiService.ts         # API client
│   ├── types.ts              # TypeScript type definitions
│   ├── App.tsx               # Main app component
│   └── index.css             # Global styles
├── server/                   # Backend source code
│   ├── src/
│   │   ├── index.ts          # Express server
│   │   ├── dataService.ts    # Business logic & data management
│   │   └── types.ts          # Backend type definitions
│   └── package.json          # Backend dependencies
├── .github/
│   └── copilot-instructions.md  # GitHub Copilot instructions
└── README.md
```

## Key Business Logic

### FIFO Inventory Management
The system implements First-In-First-Out inventory costing:
- When recording sales, the system automatically calculates cost using the oldest stock first
- Real-time tracking of remaining quantities in each batch
- Accurate profit calculation based on actual purchase costs

### Customer Debt Tracking
- Automatic debt creation when sales are not fully paid
- Support for partial payments
- Overdue debt identification based on due dates
- Complete payment history tracking

### Financial Transactions
- All activities generate transaction records
- Running balance calculation
- Complete audit trail
- Categorized transaction types

## API Endpoints

### Dashboard
- `GET /api/dashboard` - Get dashboard statistics

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create new product

### Stock Management
- `GET /api/stock-in` - Get stock in entries
- `POST /api/stock-in` - Record new stock purchase
- `GET /api/stock-out` - Get stock out entries
- `POST /api/stock-out` - Record new sale

### Customer Management
- `GET /api/customer-debts` - Get customer debts
- `GET /api/payments` - Get payment history
- `POST /api/payments` - Record new payment

### Financial
- `GET /api/transactions` - Get transaction history
- `GET /api/inventory` - Get current inventory levels
- `POST /api/fifo-preview` - Preview FIFO cost calculation

## Sample Data

The system comes with pre-loaded sample data including:
- 5 sample products (Rice, Oil, Sugar, Flour, Tea)
- Sample stock in entries with different dates and prices
- Sample sales transactions with various payment statuses
- Sample customer debt records
- Sample payment records

## Customization

### Adding New Features
1. Add new types to `src/types.ts` and `server/src/types.ts`
2. Extend the data service in `server/src/dataService.ts`
3. Add new API endpoints in `server/src/index.ts`
4. Create new React components in `src/components/`
5. Update the navigation in `src/components/Layout.tsx`

### Database Integration
The current system uses in-memory storage. To integrate with a database:
1. Replace the data service implementation
2. Add database connection and models
3. Update API endpoints to use database operations
4. Add data persistence and migration scripts

### Styling Customization
- Update Tailwind configuration in `tailwind.config.js`
- Modify custom CSS classes in `src/index.css`
- Adjust color scheme in the Tailwind configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or support, please create an issue in the repository or contact the development team.
