
'use client';

import { useEffect, useState } from 'react';
import { Navigation, MobileNav } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAgency, getSettlements, addSettlement, deleteSettlement } from '@/lib/mock-db';
import { Settlement, Agency } from '@/lib/types';
import { Plus, Trash2, HandCoins, ArrowRight, Calendar, User, Globe } from 'lucide-react';
import { getUSDToBDTRate, convertToUSD } from '@/lib/fx';

export default function SettlementsPage() {
  const [data, setData] = useState<{ agency: Agency; settlements: Settlement[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [fxRate, setFxRate] = useState(120);
  const [newSet, setNewSet] = useState<Partial<Settlement>>({
    currency: 'USD',
    date: new Date().toISOString().split('T')[0],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [agency, settlements, rate] = await Promise.all([
        getAgency(),
        getSettlements(),
        getUSDToBDTRate()
      ]);
      setData({ agency, settlements });
      setFxRate(rate);
    } catch (error) {
      console.error('Error loading settlements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSettlement = async () => {
    if (!data || !newSet.amount || !newSet.fromPartnerId || !newSet.toPartnerId) return;

    const currency = (newSet.currency || 'USD') as 'USD' | 'BDT';
    const amount = Number(newSet.amount);
    const amountUSD = convertToUSD(amount, currency, fxRate);

    const settlement: Omit<Settlement, 'id'> = {
      fromPartnerId: newSet.fromPartnerId,
      toPartnerId: newSet.toPartnerId,
      currency,
      amount,
      amountUSD,
      date: newSet.date || new Date().toISOString().split('T')[0],
      note: newSet.note || '',
    };

    try {
      await addSettlement(settlement);
      await loadData();
      setIsOpen(false);
      setNewSet({ currency: 'USD', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error('Error adding settlement:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSettlement(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting settlement:', error);
    }
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
  if (!data) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="flex flex-col md:pl-64">
        <header className="sticky top-0 z-30 flex h-auto min-h-16 items-center justify-between border-b border-border/40 bg-background/60 backdrop-blur-2xl backdrop-saturate-[180%] px-4 md:px-8 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden md:hidden">
              <img src="/logo.png" alt="Braingig" className="h-full w-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Settlements</h1>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="hidden md:flex h-9 gap-2 shadow-sm">
                <Plus size={16} /> <span>Record Settlement</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From (Sender)</Label>
                    <Select onValueChange={(v) => setNewSet({ ...newSet, fromPartnerId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sender" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.agency.partners.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>To (Receiver)</Label>
                    <Select onValueChange={(v) => setNewSet({ ...newSet, toPartnerId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Receiver" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.agency.partners.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select onValueChange={(v) => setNewSet({ ...newSet, currency: v as 'USD' | 'BDT' })} defaultValue="USD">
                      <SelectTrigger>
                        <SelectValue placeholder="USD" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="BDT">BDT (৳)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {newSet.currency === 'BDT' ? '৳' : '$'}
                      </span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        className="pl-8"
                        onChange={(e) => setNewSet({ ...newSet, amount: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newSet.date}
                    onChange={(e) => setNewSet({ ...newSet, date: e.target.value })}
                  />
                  {newSet.currency === 'BDT' && newSet.amount && (
                    <p className="text-xs text-muted-foreground">
                      ≈ ${convertToUSD(Number(newSet.amount), 'BDT', fxRate).toFixed(2)} USD (Rate: {fxRate})
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Note (Optional)</Label>
                  <Input placeholder="Settlement for May" onChange={(e) => setNewSet({ ...newSet, note: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddSettlement} className="w-full">Record Payment</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <main className="flex-1 p-4 md:p-8 pb-32 md:pb-8">

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead></TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.settlements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No settlements recorded yet. Use the suggestion tool on the dashboard!
                    </TableCell>
                  </TableRow>
                ) : (
                  data.settlements.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-muted-foreground">{s.date}</TableCell>
                      <TableCell className="font-medium">
                        {data.agency.partners.find(p => p.id === s.fromPartnerId)?.name}
                      </TableCell>
                      <TableCell className="text-center">
                        <ArrowRight size={14} className="mx-auto text-muted-foreground" />
                      </TableCell>
                      <TableCell className="font-medium">
                        {data.agency.partners.find(p => p.id === s.toPartnerId)?.name}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        <div className="flex flex-col items-end">
                          <span>{s.currency === 'USD' ? '$' : '৳'}{s.amount.toLocaleString()}</span>
                          {s.currency === 'BDT' && (
                            <span className="text-[10px] font-normal text-muted-foreground">
                              ${s.amountUSD.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
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
            {data.settlements.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground border border-dashed rounded-2xl">
                No settlements recorded yet. Use the suggestion tool!
              </div>
            ) : (
              data.settlements.map((s) => (
                <div key={s.id} className="relative flex items-center gap-3 p-4 rounded-2xl border border-border/50 bg-card shadow-sm">
                  {/* Icon Indicator */}
                  <div className="flex-shrink-0 flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary">
                    <HandCoins size={20} strokeWidth={2.5} />
                  </div>

                  {/* Settlement Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 text-base font-bold text-foreground truncate">
                      <span className="truncate">{data.agency.partners.find(p => p.id === s.fromPartnerId)?.name.split(' ')[0]}</span>
                      <ArrowRight size={14} className="text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{data.agency.partners.find(p => p.id === s.toPartnerId)?.name.split(' ')[0]}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar size={12} /> {s.date.substring(5)}</span>
                      {s.note && <><span>•</span> <span className="truncate max-w-[120px]">{s.note}</span></>}
                    </div>
                  </div>

                  {/* Amounts & Options */}
                  <div className="flex flex-col items-end flex-shrink-0 ml-2">
                    <span className="text-base font-bold tracking-tight text-primary">
                      {s.currency === 'USD' ? '$' : '৳'}{s.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    {s.currency === 'BDT' && (
                      <span className="text-[10px] text-muted-foreground">
                        ${s.amountUSD.toFixed(1)}
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="absolute top-1 right-2 p-2 text-muted-foreground/30 hover:text-destructive active:text-destructive transition-colors opacity-0 md:opacity-100 focus:opacity-100"
                      aria-label="Delete settlement"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="mt-1 text-muted-foreground border border-border/50 rounded-full p-1 -mr-1">
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
      <div className="md:hidden fixed bottom-[calc(env(safe-area-inset-bottom,1rem)+4rem)] right-4 z-40">
        <Button size="icon" className="h-14 w-14 rounded-full shadow-lg" onClick={() => setIsOpen(true)}>
          <HandCoins size={24} strokeWidth={2.5} />
        </Button>
      </div>

      <MobileNav />
    </div>
  );
}
