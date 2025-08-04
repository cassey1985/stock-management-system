<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Stock Management System - Copilot Instructions

This is a full-stack stock management system with the following architecture:

## Frontend (React + TypeScript + Vite)
- React components in `src/components/`
- TypeScript types in `src/types.ts`
- API service in `src/apiService.ts`
- Uses Tailwind CSS for styling
- Custom CSS classes defined in `src/index.css`

## Backend (Node.js + Express + TypeScript)
- Server code in `server/src/`
- Main server file: `server/src/index.ts`
- Data service with FIFO logic: `server/src/dataService.ts`
- TypeScript types: `server/src/types.ts`

## Key Features
- **FIFO Inventory Management**: Implements First-In-First-Out stock tracking
- **Customer Debt Management**: Track unpaid invoices and partial payments
- **Financial Dashboard**: Overview with charts and statistics
- **Transaction Ledger**: Complete financial transaction history
- **Product Management**: Add/manage products and inventory
- **Stock In/Out**: Record purchases and sales with automatic cost calculation

## Code Patterns
- Use TypeScript interfaces for type safety
- Follow React functional component patterns with hooks
- Use Tailwind utility classes for styling
- API calls through centralized service
- Error handling with try/catch blocks
- Date formatting using built-in Intl APIs
- Currency formatting using Intl.NumberFormat

## Business Logic
- FIFO cost calculation for sales
- Automatic debt creation for unpaid invoices
- Real-time inventory quantity tracking
- Profit calculation based on FIFO costs
- Payment tracking and debt updates

When working on this project:
1. Maintain TypeScript type safety
2. Follow existing component structure
3. Use the established API patterns
4. Implement proper error handling
5. Follow the FIFO inventory logic for any stock-related features
