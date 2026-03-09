
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
import { getAgency, getTransactions, addTransaction, updateTransaction, deleteTransaction } from '@/lib/mock-db';
import { Transaction, Agency, TransactionType, ExpenseCategory } from '@/lib/types';
import { Plus, Trash2, Pencil, Download, Loader2, ArrowUpRight, ArrowDownRight, Calendar, User, FileText, Tag, Clock } from 'lucide-react';
import { getUSDToBDTRate, convertToUSD } from '@/lib/fx';

export default function TransactionsPage() {
  const [data, setData] = useState<{ agency: Agency; transactions: Transaction[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | 'all'>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fxRate, setFxRate] = useState(120);
  const [newTx, setNewTx] = useState<Partial<Transaction>>({
    type: 'expense',
    currency: 'USD',
    date: new Date().toISOString().split('T')[0],
    category: undefined,
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

  const openNewTransaction = () => {
    setIsEditing(false);
    setEditingId(null);
    setNewTx({ type: 'expense', currency: 'USD', date: new Date().toISOString().split('T')[0], category: undefined, description: '', amount: undefined, handledBy: undefined, project: '', note: '' });
    setIsOpen(true);
  };

  const openEditTransaction = (tx: Transaction) => {
    setIsEditing(true);
    setEditingId(tx.id);
    setNewTx({ ...tx });
    setIsOpen(true);
  };

  const handleAddOrUpdateTransaction = async () => {
    if (!data || !newTx.amount || !newTx.handledBy || !newTx.description || isSubmitting) {
      alert("Please fill in all required fields (Amount, Handled By, Description).");
      return;
    }

    if (newTx.type === 'expense' && !newTx.category) {
      alert("Please select an expense category.");
      return;
    }

    setIsSubmitting(true);
    const currency = (newTx.currency || 'USD') as 'USD' | 'BDT';
    const amount = Number(newTx.amount);
    const amountUSD = convertToUSD(amount, currency, fxRate);

    const tx: Omit<Transaction, 'id'> = {
      type: newTx.type as TransactionType,
      amount,
      amountUSD,
      currency,
      handledBy: newTx.handledBy,
      date: newTx.date || new Date().toISOString().split('T')[0],
      description: newTx.description || '',
      project: newTx.project || '',
      note: newTx.note || '',
    };

    if (tx.type === 'expense') {
      tx.category = newTx.category as ExpenseCategory;
    }

    try {
      if (isEditing && editingId) {
        // Find existing to preserve createdAt/By
        const existingTx = data.transactions.find(t => t.id === editingId);

        const updatePayload: any = {
          ...tx,
          id: editingId,
          updatedAt: new Date().toISOString(),
          updatedBy: newTx.handledBy
        };

        if (existingTx?.createdAt) updatePayload.createdAt = existingTx.createdAt;
        if (existingTx?.createdBy) updatePayload.createdBy = existingTx.createdBy;

        await updateTransaction(updatePayload as Transaction);
      } else {
        await addTransaction({
          ...tx,
          createdAt: new Date().toISOString(),
          createdBy: newTx.handledBy
        });
      }

      await loadData();
      setIsOpen(false);
      setNewTx({ type: 'expense', currency: 'USD', date: new Date().toISOString().split('T')[0], category: undefined });
      setIsEditing(false);
      setEditingId(null);
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

  const availableMonths = data ? Array.from(new Set(data.transactions.map(t => t.date.substring(0, 7)))).sort().reverse() : [];

  let displayedTransactions = data ? data.transactions : [];
  if (selectedMonth !== 'all') {
    displayedTransactions = displayedTransactions.filter(t => t.date.startsWith(selectedMonth));
  }
  if (filterType !== 'all') {
    displayedTransactions = displayedTransactions.filter(t => t.type === filterType);
  }
  if (filterCategory !== 'all') {
    displayedTransactions = displayedTransactions.filter(t => t.category === filterCategory && t.type === 'expense');
  }
  displayedTransactions = displayedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
            <Select value={filterType} onValueChange={(val) => setFilterType(val as TransactionType | 'all')}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={(val) => setFilterCategory(val as ExpenseCategory | 'all')}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Salary">Salary</SelectItem>
                <SelectItem value="Bills">Bills & Utilities</SelectItem>
                <SelectItem value="Online Tools">Online Tools & Software</SelectItem>
                <SelectItem value="Foods">Foods & Entertainment</SelectItem>
                <SelectItem value="Misc">Miscellaneous</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-9 gap-2" onClick={handleExportCSV} disabled={!displayedTransactions.length}>
              <Download size={16} /> <span className="hidden sm:inline">Export</span>
            </Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="hidden md:flex h-9 gap-2 shadow-sm" onClick={openNewTransaction}>
                  <Plus size={16} /> <span>Add New</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{isEditing ? 'Edit Transaction' : 'Record New Transaction'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select onValueChange={(v) => {
                        const type = v as TransactionType;
                        setNewTx(prev => ({
                          ...prev,
                          type,
                          category: type === 'income' ? undefined : prev.category
                        }));
                      }} defaultValue="expense" value={newTx.type}>
                        <SelectTrigger>
                          <SelectValue placeholder="Expense" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="expense">Expense (-)</SelectItem>
                          <SelectItem value="income">Income (+)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {newTx.type === 'expense' && (
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select onValueChange={(v) => setNewTx({ ...newTx, category: v as ExpenseCategory })} value={newTx.category || ''}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Salary">Salary</SelectItem>
                            <SelectItem value="Bills">Bills & Utilities</SelectItem>
                            <SelectItem value="Online Tools">Online Tools & Software</SelectItem>
                            <SelectItem value="Foods">Foods & Entertainment</SelectItem>
                            <SelectItem value="Misc">Miscellaneous</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select onValueChange={(v) => setNewTx({ ...newTx, currency: v as 'USD' | 'BDT' })} defaultValue="USD" value={newTx.currency}>
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
                          value={newTx.amount || ''}
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
                      value={newTx.description || ''}
                      onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Handled By</Label>
                    <Select onValueChange={(v) => setNewTx({ ...newTx, handledBy: v })} value={newTx.handledBy}>
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
                      <Input placeholder="Project name" value={newTx.project || ''} onChange={(e) => setNewTx({ ...newTx, project: e.target.value })} />
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
                {isEditing && (newTx.createdAt || newTx.updatedAt) && (
                  <div className="text-[10px] text-muted-foreground bg-muted/30 p-2 rounded-md flex flex-col gap-1 mt-2 border border-border/40">
                    {newTx.createdAt && (
                      <div className="flex items-center gap-1">
                        <Clock size={10} /> Added by {data.agency.partners.find(p => p.id === newTx.createdBy)?.name || 'Unknown'} on {new Date(newTx.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    )}
                    {newTx.updatedAt && (
                      <div className="flex items-center gap-1">
                        <Clock size={10} /> Last updated by {data.agency.partners.find(p => p.id === newTx.updatedBy)?.name || 'Unknown'} on {new Date(newTx.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    )}
                  </div>
                )}
                <DialogFooter>
                  <Button onClick={handleAddOrUpdateTransaction} className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                    ) : (isEditing ? 'Save Changes' : 'Record Transaction')}
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
                  <TableHead className="pl-6 w-[200px]">Activity Log</TableHead>
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
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{tx.description}</span>
                            {tx.category && (
                              <Badge variant="outline" className="text-[10px] h-5 py-0 px-1.5 font-normal bg-muted/50">
                                {tx.category}
                              </Badge>
                            )}
                          </div>
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
                      <TableCell className="pl-6">
                        <div className="flex flex-col gap-1 text-[10px] text-muted-foreground min-w-[140px]">
                          {tx.createdAt ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-foreground/70">Added:</span>
                              <span>{new Date(tx.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })} by {data.agency.partners.find(p => p.id === tx.createdBy)?.name.split(' ')[0] || '?'}</span>
                            </div>
                          ) : (
                            <div className="text-muted-foreground/40 italic">Legacy record</div>
                          )}
                          {tx.updatedAt && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-medium text-foreground/70">Edited:</span>
                              <span>{new Date(tx.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })} by {data.agency.partners.find(p => p.id === tx.updatedBy)?.name.split(' ')[0] || '?'}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditTransaction(tx)}>
                            <Pencil size={16} className="text-muted-foreground hover:text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(tx.id)}>
                            <Trash2 size={16} className="text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
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
                      {tx.category && <><span>•</span> <span className="flex items-center gap-1 truncate"><Tag size={12} /> {tx.category}</span></>}
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
                      onClick={() => openEditTransaction(tx)}
                      className="absolute top-1 right-8 p-2 text-muted-foreground/40 hover:text-primary active:text-primary transition-colors opacity-0 md:opacity-100 focus:opacity-100"
                      aria-label="Edit transaction"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="absolute top-1 right-2 p-2 text-muted-foreground/30 hover:text-destructive active:text-destructive transition-colors opacity-0 md:opacity-100 focus:opacity-100"
                      aria-label="Delete transaction"
                    >
                      <Trash2 size={14} />
                    </button>
                    {/* Simplified mobile actions */}
                    <div className="mt-1 flex gap-2">
                      <button onClick={() => openEditTransaction(tx)} className="text-muted-foreground border border-border/50 rounded-full p-1">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => handleDelete(tx.id)} className="text-muted-foreground border border-border/50 rounded-full p-1 -mr-1">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </main>
      </div>

      {/* Mobile Floating Action Button (FAB) */}
      <div className="md:hidden fixed bottom-24 right-4 z-40">
        <Button size="icon" className="h-14 w-14 rounded-full shadow-lg" onClick={openNewTransaction}>
          <Plus size={24} strokeWidth={2.5} />
        </Button>
      </div>

      <MobileNav />
    </div>
  );
}
