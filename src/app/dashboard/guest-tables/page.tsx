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

interface GuestTable {
  id: string;
  name: string;
  qr_code_url: string;
  is_active: boolean;
}

export default function GuestTablesPage() {
  const [guestTables, setGuestTables] = useState<GuestTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<GuestTable | null>(null);
  const [tableName, setTableName] = useState('');
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchGuestTables();
  }, []);

  const fetchGuestTables = async () => {
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
        .from('guest_tables')
        .select('*')
        .eq('restaurant_id', userData.restaurant_id)
        .order('name');

      if (tablesData) {
        // Generate QR codes if they don't exist
        const tablesWithQR = await Promise.all(
          tablesData.map(async (table) => {
            if (!table.qr_code_url) {
              const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/guest/${restaurantData.slug}?table=${table.id}`;
              const qrDataUrl = await QRCode.toDataURL(menuUrl);
              
              // Update table with QR code
              await supabase
                .from('guest_tables')
                .update({ qr_code_url: qrDataUrl })
                .eq('id', table.id);

              return { ...table, qr_code_url: qrDataUrl };
            }
            return table;
          })
        );
        setGuestTables(tablesWithQR);
      }
    } catch (error) {
      console.error('Error fetching guest tables:', error);
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

      const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/guest/${restaurantData.slug}?table=${editingTable?.id || 'new'}`;
      const qrDataUrl = await QRCode.toDataURL(menuUrl);

      if (editingTable) {
        // Update existing table
        const { error } = await supabase
          .from('guest_tables')
          .update({
            name: tableName,
            qr_code_url: qrDataUrl,
          })
          .eq('id', editingTable.id);

        if (error) throw error;
        toast({ title: 'Guest table updated successfully' });
      } else {
        // Create new table - need to get the ID first
        const { data: newTable, error: insertError } = await supabase
          .from('guest_tables')
          .insert({
            restaurant_id: userData.restaurant_id,
            name: tableName,
            qr_code_url: qrDataUrl, // Temporary, will update with correct ID
            is_active: true,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Now generate QR with correct table ID
        const correctMenuUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/guest/${restaurantData.slug}?table=${newTable.id}`;
        const correctQrDataUrl = await QRCode.toDataURL(correctMenuUrl);

        // Update with correct QR code
        const { error: updateError } = await supabase
          .from('guest_tables')
          .update({ qr_code_url: correctQrDataUrl })
          .eq('id', newTable.id);

        if (updateError) throw updateError;
        toast({ title: 'Guest table created successfully' });
      }

      setIsDialogOpen(false);
      setEditingTable(null);
      setTableName('');
      fetchGuestTables();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save guest table',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this guest table?')) return;

    try {
      const { error } = await supabase
        .from('guest_tables')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Guest table deleted successfully' });
      fetchGuestTables();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete guest table',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (table: GuestTable) => {
    setEditingTable(table);
    setTableName(table.name);
    setIsDialogOpen(true);
  };

  const toggleActive = async (table: GuestTable) => {
    try {
      const { error } = await supabase
        .from('guest_tables')
        .update({ is_active: !table.is_active })
        .eq('id', table.id);

      if (error) throw error;
      toast({ title: `Guest table ${!table.is_active ? 'activated' : 'deactivated'}` });
      fetchGuestTables();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update guest table',
        variant: 'destructive',
      });
    }
  };

  const downloadQR = async (table: GuestTable) => {
    try {
      const link = document.createElement('a');
      link.href = table.qr_code_url;
      link.download = `${table.name.toLowerCase().replace(/\s+/g, '-')}-qr.png`;
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold font-headline">Guest Tables</h1>
          <p className="text-muted-foreground text-sm">Manage guest tables for QR code ordering without upfront payment</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingTable(null);
            setTableName('');
          }
        }}>
          <DialogTrigger asChild>
            <Button className="rounded-full shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> Add Guest Table
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTable ? 'Edit Guest Table' : 'Add New Guest Table'}</DialogTitle>
              <DialogDescription>
                {editingTable ? 'Update the guest table name' : 'Create a new guest table with QR code'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="table_name">Guest Table Name *</Label>
                <Input
                  id="table_name"
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  required
                  placeholder="Guest Table 1"
                />
                <p className="text-xs text-muted-foreground">Example: Guest Table 1, Guest Table 2, etc.</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  setEditingTable(null);
                  setTableName('');
                }}>
                  Cancel
                </Button>
                <Button type="submit">{editingTable ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Guest Tables Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : guestTables.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Smartphone className="mx-auto h-12 w-12 mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No guest tables created yet</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guestTables.map((table) => (
            <Card key={table.id} className="border border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <QrCode className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg font-bold">{table.name}</CardTitle>
                  </div>
                  <Badge 
                    variant={table.is_active ? "default" : "secondary"}
                    className={table.is_active 
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : 'bg-gray-400 hover:bg-gray-500 text-white'
                    }
                  >
                    {table.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {/* QR Code Display */}
                <div className="relative flex items-center justify-center bg-gradient-to-br from-muted/30 via-muted/50 to-muted/30 rounded-xl p-6 border border-border/50">
                  {table.qr_code_url ? (
                    <div className="relative bg-white p-4 rounded-lg shadow-md ring-1 ring-border/50">
                      <img 
                        src={table.qr_code_url} 
                        alt={`${table.name} QR Code`} 
                        className="w-40 h-40 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="relative bg-white p-4 rounded-lg shadow-md ring-1 ring-border/50">
                      <QrCode className="h-40 w-40 text-muted-foreground opacity-30" />
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full rounded-lg font-medium"
                    onClick={() => downloadQR(table)}
                  >
                    <Download className="mr-2 h-4 w-4" /> 
                    Download QR Code
                  </Button>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => toggleActive(table)}
                      title={table.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {table.is_active ? (
                        <span className="text-xs">Deactivate</span>
                      ) : (
                        <span className="text-xs">Activate</span>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => handleEdit(table)}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={() => handleDelete(table.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

