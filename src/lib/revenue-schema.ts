export type RevenueRow = {
  id: string;
  date: string;
  amount: number;
  client: string;
  description?: string;
};

export type RevenueSummary = {
  totalBillable: number;
  totalNonBillable: number;
  rowCount: number;
};
