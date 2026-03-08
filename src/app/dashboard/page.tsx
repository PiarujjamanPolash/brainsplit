
'use client';

import { useEffect, useState } from 'react';
import { Navigation, MobileNav } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { calculateBalances, simplifySettlements } from '@/lib/calculations';
import { Agency, Transaction, Settlement, PartnerBalance, SettlementSuggestion } from '@/lib/types';
import { ArrowUpRight, ArrowDownRight, Wallet, Plus, TrendingUp, Globe, Coins } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { getAgency, getTransactions, getSettlements } from '@/lib/mock-db';
import { getUSDToBDTRate, convertToBDT } from '@/lib/fx';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';

export default function DashboardPage() {
  const [data, setData] = useState<{
    agency: Agency;
    transactions: Transaction[];
    settlements: Settlement[];
  } | null>(null);

  const [balances, setBalances] = useState<PartnerBalance[]>([]);
  const [suggestions, setSuggestions] = useState<SettlementSuggestion[]>([]);
  const [fxRate, setFxRate] = useState(120);
  const [showInBDT, setShowInBDT] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      console.log('Dashboard: Starting data load...');
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firebase timeout')), 10000)
        );

        const fetchDataPromise = Promise.all([
          getAgency(),
          getTransactions(),
          getSettlements(),
          getUSDToBDTRate()
        ]);

        console.log('Dashboard: Fetching data...');
        const [agency, transactions, settlements, rate] = await Promise.race([
          fetchDataPromise,
          timeoutPromise
        ]) as [Agency, Transaction[], Settlement[], number];

        setFxRate(rate);

        console.log('Dashboard: Data received', { agency, transactionsCount: transactions.length });

        const dbData = { agency, transactions, settlements };
        setData(dbData);
        const calculated = calculateBalances(agency.partners, transactions, settlements);
        setBalances(calculated);
        setSuggestions(simplifySettlements(calculated));
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
  if (!data) return null;

  const totalIncome = data.transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amountUSD, 0);
  const totalExpense = data.transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amountUSD, 0);
  const totalProfit = totalIncome - totalExpense;

  const displayVal = (usd: number) => {
    if (showInBDT) return `৳${(usd * fxRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    return `$${usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

  const getPartnerName = (id: string) =>
    data.agency.partners.find((p) => p.id === id)?.name || 'Unknown';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="flex flex-col md:pl-64">
        <header className="sticky top-0 z-30 flex h-auto min-h-16 items-center justify-between border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 md:px-8 pt-[env(safe-area-inset-top,0.5rem)] pb-2 supports-[backdrop-filter]:bg-background/60">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className={cn("gap-2 text-xs", showInBDT && "bg-primary text-primary-foreground hover:bg-primary/90")}
              onClick={() => setShowInBDT(!showInBDT)}
            >
              <Coins size={14} />
              {showInBDT ? 'Show in USD' : 'Show in BDT'}
            </Button>
          </div>
        </header>

        <main className="flex-1 space-y-8 p-4 md:p-8 pb-32 md:pb-8">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{displayVal(totalIncome)}</div>
                <p className="text-xs text-muted-foreground">Collected by partners</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <ArrowDownRight className="h-4 w-4 text-rose-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{displayVal(totalExpense)}</div>
                <p className="text-xs text-muted-foreground">Paid by partners</p>
              </CardContent>
            </Card>
            <Card className="bg-primary text-primary-foreground sm:col-span-2 lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-primary-foreground/80">Net Profit</CardTitle>
                <TrendingUp className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{displayVal(totalProfit)}</div>
                <p className="text-xs text-primary-foreground/60">Distributed by share %</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-8 lg:grid-cols-7">
            {/* Partner Balances */}
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Partner Balances</CardTitle>
                <CardDescription>Breakdown of who owes what to the agency pool.</CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Partner</TableHead>
                        <TableHead>Should Receive</TableHead>
                        <TableHead>Handled Net</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {balances.map((b) => (
                        <TableRow key={b.partnerId}>
                          <TableCell className="font-medium">{b.name}</TableCell>
                          <TableCell>{displayVal(b.shouldReceive)}</TableCell>
                          <TableCell>{displayVal(b.handledNet)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={b.balance > 0 ? 'destructive' : 'secondary'} className="whitespace-nowrap">
                              {b.balance > 0
                                ? `Pay ${displayVal(b.balance)}`
                                : `Owed ${displayVal(Math.abs(b.balance))}`}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="space-y-3 md:hidden">
                  {balances.map((b) => (
                    <div key={b.partnerId} className="flex flex-col gap-2 rounded-2xl border border-border/50 bg-card/50 p-4 text-sm shadow-sm transition-colors hover:bg-card">
                      <div className="flex items-center justify-between border-b border-border/50 pb-3">
                        <span className="font-bold text-base">{b.name}</span>
                        <Badge variant={b.balance > 0 ? 'destructive' : 'secondary'}>
                          {b.balance > 0 ? 'To Pay' : 'To Receive'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-y-1">
                        <span className="text-muted-foreground">Should Rec:</span>
                        <span className="text-right">{displayVal(b.shouldReceive)}</span>
                        <span className="text-muted-foreground">Handled Net:</span>
                        <span className="text-right">{displayVal(b.handledNet)}</span>
                        <span className="text-muted-foreground font-bold">Current Bal:</span>
                        <span className={cn("text-right font-bold", b.balance > 0 ? "text-destructive" : "text-emerald-600")}>
                          {displayVal(Math.abs(b.balance))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Suggested Settlements */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Suggested Settlements</CardTitle>
                <CardDescription>Minimal transfers to zero out balances.</CardDescription>
              </CardHeader>
              <CardContent>
                {suggestions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <Wallet className="mb-2 h-8 w-8 opacity-20" />
                    <p>All settled! Everyone has their fair share.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {suggestions.map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-2xl border border-border/50 bg-card/50 p-4 shadow-sm gap-2">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-medium text-muted-foreground uppercase">From</span>
                          <span className="font-bold truncate text-sm sm:text-base">{getPartnerName(s.from)}</span>
                        </div>
                        <div className="flex flex-col items-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary">{displayVal(s.amount)}</span>
                          <div className="h-px w-6 bg-border" />
                        </div>
                        <div className="flex flex-col text-right min-w-0">
                          <span className="text-[10px] font-medium text-muted-foreground uppercase">To</span>
                          <span className="font-bold truncate text-sm sm:text-base">{getPartnerName(s.to)}</span>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full" asChild>
                      <a href="/settlements">Record a Settlement</a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      <MobileNav />
      <PWAInstallPrompt />
    </div>
  );
}
