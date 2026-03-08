
'use client';

import { useEffect, useState } from 'react';
import { Navigation, MobileNav } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getAgency, getTransactions, addTransaction, deleteTransaction } from '@/lib/mock-db';
import { Transaction, Agency, TransactionType } from '@/lib/types';
import { Plus, Trash2, Download, Loader2, ArrowUpRight, ArrowDownRight, Calendar, User, FileText } from 'lucide-react';
import { getUSDToBDTRate, convertToUSD } from '@/lib/fx';

export default function TransactionsPage() {
  const [data, setData] = useState<{ agency: Agency; transactions: Transaction[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [fxRate, setFxRate] = useState(120);
  const [newTx, setNewTx] = useState<Partial<Transaction>>({
    type: 'income',
    currency: 'USD',
    date: new Date().toISOString().split('T')[0],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [agency, transactions, rate] = await Promise.all([
        getAgency(),
        getTransactions(),
        getUSDToBDTRate()
      ]);
      setData({ agency, transactions });
      setFxRate(rate);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddTransaction = async () => {
    if (!data || !newTx.amount || !newTx.handledBy || !newTx.description || isSubmitting) return;

    setIsSubmitting(true);

    const currency = (newTx.currency || 'USD') as 'USD' | 'BDT';
    const amount = Number(newTx.amount);
    const amountUSD = convertToUSD(amount, currency, fxRate);

    const tx: Omit<Transaction, 'id'> = {
      type: newTx.type as TransactionType,
      currency,
      amount,
      amountUSD,
      date: newTx.date || new Date().toISOString().split('T')[0],
      description: newTx.description,
      project: newTx.project || '',
      category: newTx.category || '',
      handledBy: newTx.handledBy,
    };

    try {
      await addTransaction(tx);
      await loadData();
      setIsOpen(false);
      setNewTx({ type: 'income', currency: 'USD', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error('Error adding transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
  if (!data) return null;

  const availableMonths = Array.from(new Set(data.transactions.map(t => t.date.substring(0, 7)))).sort().reverse();
  const displayedTransactions = data.transactions
    .filter(t => selectedMonth === 'all' || t.date.startsWith(selectedMonth))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleExportCSV = () => {
    if (!displayedTransactions.length) return;

    const headers = ['Date', 'Description', 'Project', 'Partner', 'Type', 'Currency', 'Amount', 'Amount (USD)'];

    const csvContent = [
      headers.join(','),
      ...displayedTransactions.map(tx => {
        const partnerName = data.agency.partners.find(p => p.id === tx.handledBy)?.name || 'Unknown';
        const escapeCSV = (str: string) => `"${str.replace(/"/g, '""')}"`;

        return [
          tx.date,
          escapeCSV(tx.description),
          escapeCSV(tx.project || ''),
          escapeCSV(partnerName),
          tx.type,
          tx.currency,
          tx.amount,
          tx.amountUSD.toFixed(2)
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${selectedMonth === 'all' ? 'all' : selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="flex flex-col md:pl-64">
        <header className="sticky top-0 z-30 flex flex-col sm:flex-row h-auto min-h-16 items-start sm:items-center justify-between border-b border-border/40 bg-background/60 backdrop-blur-2xl backdrop-saturate-[180%] px-4 md:px-8 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-4 sm:pb-3 gap-4">
          <div className="flex items-center gap-3 mt-2 sm:mt-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden md:hidden">
              <img src="/logo.png" alt="Braingig" className="h-full w-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="All Months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {availableMonths.map(month => (
                  <SelectItem key={month} value={month}>
                    {new Date(month + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-9 gap-2" onClick={handleExportCSV} disabled={!displayedTransactions.length}>
              <Download size={16} /> <span className="hidden sm:inline">Export</span>
            </Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="hidden md:flex h-9 gap-2 shadow-sm">
                  <Plus size={16} /> <span>Add New</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Transaction</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select onValueChange={(v) => setNewTx({ ...newTx, type: v as TransactionType })} defaultValue="income">
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">Income</SelectItem>
                          <SelectItem value="expense">Expense</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select onValueChange={(v) => setNewTx({ ...newTx, currency: v as 'USD' | 'BDT' })} defaultValue="USD">
                        <SelectTrigger>
                          <SelectValue placeholder="USD" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="BDT">BDT (৳)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {newTx.currency === 'BDT' ? '৳' : '$'}
                        </span>
                        <Input
                          type="number"
                          placeholder="0.00"
                          className="pl-8"
                          onChange={(e) => setNewTx({ ...newTx, amount: Number(e.target.value) })}
                        />
                      </div>
                      {newTx.currency === 'BDT' && newTx.amount && (
                        <p className="text-xs text-muted-foreground">
                          ≈ ${convertToUSD(Number(newTx.amount), 'BDT', fxRate).toFixed(2)} USD (Rate: {fxRate})
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="e.g. Website payment"
                      onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Handled By</Label>
                    <Select onValueChange={(v) => setNewTx({ ...newTx, handledBy: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select partner" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.agency.partners.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Project (Optional)</Label>
                      <Input placeholder="Project name" onChange={(e) => setNewTx({ ...newTx, project: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={newTx.date}
                        onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddTransaction} disabled={isSubmitting} className="w-full">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Transaction'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 pb-32 md:pb-8">

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      {data.transactions.length === 0 ? 'No transactions recorded yet.' : 'No transactions found for the selected month.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-muted-foreground">{tx.date}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{tx.description}</span>
                          {tx.project && <span className="text-xs text-muted-foreground">{tx.project}</span>}
                        </div>
                      </TableCell>
                      <TableCell>{data.agency.partners.find(p => p.id === tx.handledBy)?.name || '?'}</TableCell>
                      <TableCell>
                        <Badge variant={tx.type === 'income' ? 'secondary' : 'outline'} className={tx.type === 'income' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}>
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        <div className="flex flex-col items-end">
                          <span className={tx.type === 'income' ? 'text-emerald-600' : 'text-foreground'}>
                            {tx.type === 'income' ? '+' : '-'}{tx.currency === 'USD' ? '$' : '৳'}{tx.amount.toLocaleString()}
                          </span>
                          {tx.currency === 'BDT' && (
                            <span className="text-[10px] font-normal text-muted-foreground">
                              ${tx.amountUSD.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(tx.id)}>
                          <Trash2 size={16} className="text-muted-foreground hover:text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {displayedTransactions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground border border-dashed rounded-2xl">
                {data.transactions.length === 0 ? 'No transactions yet.' : 'No transactions found.'}
              </div>
            ) : (
              displayedTransactions.map((tx) => (
                <div key={tx.id} className="relative flex items-center gap-3 p-4 rounded-2xl border border-border/50 bg-card shadow-sm">
                  {/* Icon Indicator */}
                  <div className={`flex-shrink-0 flex items-center justify-center p-3 rounded-2xl ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                    }`}>
                    {tx.type === 'income' ? <ArrowUpRight size={20} strokeWidth={2.5} /> : <ArrowDownRight size={20} strokeWidth={2.5} />}
                  </div>

                  {/* Transaction Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-base font-bold text-foreground truncate">{tx.description}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar size={12} /> {tx.date.substring(5)}</span>
                      {tx.project && <><span>•</span> <span className="flex items-center gap-1 truncate"><FileText size={12} /> {tx.project}</span></>}
                      <span>•</span>
                      <span className="flex items-center gap-1 truncate">
                        <User size={12} /> {data.agency.partners.find(p => p.id === tx.handledBy)?.name.split(' ')[0] || '?'}
                      </span>
                    </div>
                  </div>

                  {/* Amounts & Options */}
                  <div className="flex flex-col items-end flex-shrink-0 ml-2">
                    <span className={`text-base font-bold tracking-tight ${tx.type === 'income' ? 'text-emerald-600' : 'text-foreground'}`}>
                      {tx.type === 'income' ? '+' : ''}{tx.currency === 'USD' ? '$' : '৳'}{tx.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    {tx.currency === 'BDT' && (
                      <span className="text-[10px] text-muted-foreground">
                        ${tx.amountUSD.toFixed(1)}
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="absolute top-1 right-2 p-2 text-muted-foreground/30 hover:text-destructive active:text-destructive transition-colors opacity-0 md:opacity-100 focus:opacity-100"
                      aria-label="Delete transaction"
                    >
                      <Trash2 size={14} />
                    </button>
                    {/* Simplified mobile delete - usually revealed via swipe or a small persistent icon */}
                    <button onClick={() => handleDelete(tx.id)} className="mt-1 text-muted-foreground border border-border/50 rounded-full p-1 -mr-1">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </main>
      </div>

      {/* Mobile Floating Action Button (FAB) */}
      <div className="md:hidden fixed bottom-24 right-4 z-40">
        <Button size="icon" className="h-14 w-14 rounded-full shadow-lg" onClick={() => setIsOpen(true)}>
          <Plus size={24} strokeWidth={2.5} />
        </Button>
      </div>

      <MobileNav />
    </div>
  );
}
