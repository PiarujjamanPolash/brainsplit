
export type TransactionType = 'income' | 'expense';
export type Currency = 'USD' | 'BDT';
export type ExpenseCategory = 'Salary' | 'Bills' | 'Online Tools' | 'Foods' | 'Misc';

export interface Partner {
  id: string;
  email: string;
  name: string;
  sharePercentage: number;
}

export interface Agency {
  id: string;
  name: string;
  partners: Partner[];
}

export interface Transaction {
  id: string;
  type: TransactionType;
  currency: 'USD' | 'BDT';
  amount: number;
  amountUSD: number;
  date: string;
  description: string;
  category?: ExpenseCategory;
  project?: string;
  note?: string;
  handledBy: string; // partnerId
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Settlement {
  id: string;
  fromPartnerId: string;
  toPartnerId: string;
  currency: 'USD' | 'BDT';
  amount: number;
  amountUSD: number;
  date: string;
  note?: string;
}

export interface SettlementSuggestion {
  from: string; // partnerId
  to: string; // partnerId
  amount: number;
}

export interface PartnerBalance {
  partnerId: string;
  name: string;
  shouldReceive: number;
  handledNet: number;
  balance: number; // Positive = holds extra (pays out), Negative = owed
}
