
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
import { Plus, Trash2, HandCoins, ArrowRight, Globe } from 'lucide-react';
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
        <header className="sticky top-0 z-30 flex h-auto min-h-16 items-center justify-between border-b bg-card px-4 md:px-8 pt-[env(safe-area-inset-top,0px)] pb-1">
          <h1 className="text-xl font-bold">Settlements</h1>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus size={18} /> Record Settlement
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

        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          <div className="rounded-lg border bg-card">
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
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
