
'use client';

import { useEffect, useState } from 'react';
import { Navigation, MobileNav } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getAgency, updateAgency } from '@/lib/mock-db';
import { Agency, Partner } from '@/lib/types';
import { Plus, Trash2, Mail, Percent, User, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function PartnersPage() {
  const [data, setData] = useState<{ agency: Agency } | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPartner, setNewPartner] = useState({ name: '', email: '', sharePercentage: 0 });

  const loadData = async () => {
    setLoading(true);
    try {
      const agency = await getAgency();
      setData({ agency });
    } catch (error) {
      console.error('Error loading partners:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalShare = data?.agency.partners.reduce((sum: number, p: Partner) => sum + p.sharePercentage, 0) || 0;

  const handleUpdateShare = async (id: string, share: number) => {
    if (!data) return;
    const updatedPartners = data.agency.partners.map((p: Partner) =>
      p.id === id ? { ...p, sharePercentage: share } : p
    );
    const updatedAgency = { ...data.agency, partners: updatedPartners };
    try {
      await updateAgency(updatedAgency);
      await loadData();
    } catch (error) {
      console.error('Error updating share:', error);
    }
  };

  const handleAddPartner = async () => {
    if (!data || !newPartner.name || !newPartner.email) return;
    const partner: Partner = {
      id: Math.random().toString(36).substr(2, 9),
      ...newPartner
    };
    const updatedAgency = { ...data.agency, partners: [...data.agency.partners, partner] };
    try {
      await updateAgency(updatedAgency);
      await loadData();
      setNewPartner({ name: '', email: '', sharePercentage: 0 });
    } catch (error) {
      console.error('Error adding partner:', error);
    }
  };

  const deletePartner = async (id: string) => {
    if (!data) return;
    const updatedAgency = {
      ...data.agency,
      partners: data.agency.partners.filter((p: Partner) => p.id !== id)
    };
    try {
      await updateAgency(updatedAgency);
      await loadData();
    } catch (error) {
      console.error('Error deleting partner:', error);
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
        <header className="sticky top-0 z-30 flex h-auto min-h-16 items-center border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 md:px-8 pt-[env(safe-area-inset-top,0.5rem)] pb-2 supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden md:hidden">
              <img src="/logo.png" alt="Braingig" className="h-full w-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Partners & Shares</h1>
          </div>
        </header>

        <main className="flex-1 space-y-8 p-4 md:p-8 pb-32 md:pb-8">
          {totalShare !== 100 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Invalid Shares</AlertTitle>
              <AlertDescription>
                Profit shares must sum to exactly 100%. Current total: {totalShare}%
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-8 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Manage Partners</CardTitle>
                <CardDescription>Adjust profit shares for each agency partner.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.agency.partners.map((p: Partner) => (
                  <div key={p.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-2xl border border-border/50 bg-card p-4 shadow-sm gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary flex-shrink-0">
                        <User size={24} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-base truncate">{p.name}</span>
                        <span className="text-xs text-muted-foreground truncate flex items-center gap-1"><Mail size={12} className="flex-shrink-0" /> {p.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <div className="relative w-20">
                        <Input
                          type="number"
                          value={p.sharePercentage}
                          className="pr-6 rounded-xl font-medium"
                          onChange={(e) => handleUpdateShare(p.id, Number(e.target.value))}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">%</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deletePartner(p.id)} className="h-9 w-9 rounded-full">
                        <Trash2 size={16} className="text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add Partner</CardTitle>
                <CardDescription>Invite a new partner to the agency.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    placeholder="John Doe"
                    value={newPartner.name}
                    onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    placeholder="john@example.com"
                    value={newPartner.email}
                    onChange={(e) => setNewPartner({ ...newPartner, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Initial Profit Share (%)</Label>
                  <Input
                    type="number"
                    value={newPartner.sharePercentage}
                    onChange={(e) => setNewPartner({ ...newPartner, sharePercentage: Number(e.target.value) })}
                  />
                </div>
                <Button onClick={handleAddPartner} className="w-full gap-2">
                  <Plus size={18} /> Add Partner
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
