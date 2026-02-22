'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Smartphone, Plus, QrCode, Edit, Trash2, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import * as QRCode from 'qrcode';

interface Table {
  id: string;
  table_number: number;
  qr_code_url: string;
  status: 'available' | 'occupied';
}

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [tableNumber, setTableNumber] = useState('');
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('restaurant_id')
        .eq('id', user.id)
        .single();

      if (!userData?.restaurant_id) {
        router.push('/restaurants');
        return;
      }

      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('slug')
        .eq('id', userData.restaurant_id)
        .single();

      if (!restaurantData) return;

      const { data: tablesData } = await supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', userData.restaurant_id)
        .order('table_number');

      if (tablesData) {
        // Generate QR codes if they don't exist
        const tablesWithQR = await Promise.all(
          tablesData.map(async (table) => {
            if (!table.qr_code_url) {
              const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/menu/${restaurantData.slug}?table=${table.table_number}`;
              const qrDataUrl = await QRCode.toDataURL(menuUrl);
              
              // Update table with QR code
              await supabase
                .from('tables')
                .update({ qr_code_url: qrDataUrl })
                .eq('id', table.id);

              return { ...table, qr_code_url: qrDataUrl };
            }
            return table;
          })
        );
        setTables(tablesWithQR);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: userData } = await supabase
        .from('users')
        .select('restaurant_id')
        .eq('id', user!.id)
        .single();

      if (!userData?.restaurant_id) return;

      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('slug')
        .eq('id', userData.restaurant_id)
        .single();

      if (!restaurantData) return;

      const tableNum = parseInt(tableNumber);
      const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/menu/${restaurantData.slug}?table=${tableNum}`;
      const qrDataUrl = await QRCode.toDataURL(menuUrl);

      if (editingTable) {
        // Update existing table
        const { error } = await supabase
          .from('tables')
          .update({
            table_number: tableNum,
            qr_code_url: qrDataUrl,
          })
          .eq('id', editingTable.id);

        if (error) throw error;
        toast({ title: 'Table updated successfully' });
      } else {
        // Create new table
        const { error } = await supabase
          .from('tables')
          .insert({
            restaurant_id: userData.restaurant_id,
            table_number: tableNum,
            qr_code_url: qrDataUrl,
            status: 'available',
          });

        if (error) throw error;
        toast({ title: 'Table created successfully' });
      }

      setIsDialogOpen(false);
      setEditingTable(null);
      setTableNumber('');
      fetchTables();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save table',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this table?')) return;

    try {
      const { error } = await supabase
        .from('tables')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Table deleted successfully' });
      fetchTables();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete table',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (table: Table) => {
    setEditingTable(table);
    setTableNumber(table.table_number.toString());
    setIsDialogOpen(true);
  };

  const downloadQR = async (table: Table) => {
    try {
      const link = document.createElement('a');
      link.href = table.qr_code_url;
      link.download = `table-${table.table_number}-qr.png`;
      link.click();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download QR code',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">QR Tables</h1>
          <p className="text-muted-foreground">Manage your restaurant tables and QR codes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingTable(null);
            setTableNumber('');
          }
        }}>
          <DialogTrigger asChild>
            <Button className="rounded-full">
              <Plus className="mr-2 h-4 w-4" /> Add Table
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTable ? 'Edit Table' : 'Add New Table'}</DialogTitle>
              <DialogDescription>
                {editingTable ? 'Update the table number' : 'Create a new table with QR code'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="table_number">Table Number *</Label>
                <Input
                  id="table_number"
                  type="number"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  required
                  min="1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  setEditingTable(null);
                  setTableNumber('');
                }}>
                  Cancel
                </Button>
                <Button type="submit">{editingTable ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Smartphone className="mx-auto h-12 w-12 mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No tables created yet</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.map((table) => (
            <Card key={table.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Table {table.table_number}</CardTitle>
                  <Badge className={table.status === 'occupied' ? 'bg-orange-500' : 'bg-green-500'}>
                    {table.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center bg-muted rounded-lg p-4">
                  {table.qr_code_url ? (
                    <img src={table.qr_code_url} alt={`Table ${table.table_number} QR Code`} className="w-48 h-48" />
                  ) : (
                    <QrCode className="h-48 w-48 text-muted-foreground opacity-50" />
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => downloadQR(table)}
                  >
                    <Download className="mr-2 h-4 w-4" /> Download QR
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(table)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(table.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

