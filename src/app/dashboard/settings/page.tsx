'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings as SettingsIcon, Save, Building2, CreditCard, User, Upload, Image as ImageIcon, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  delivery_enabled: boolean;
  banner_url: string | null;
}

interface UserData {
  full_name: string;
  email: string;
  phone: string;
}

export default function SettingsPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [restaurantForm, setRestaurantForm] = useState({
    name: '',
    slug: '',
    bank_name: '',
    account_number: '',
    account_name: '',
    delivery_enabled: false,
  });
  const [userForm, setUserForm] = useState({
    full_name: '',
    phone: '',
  });
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('restaurant_id, full_name, email, phone')
        .eq('id', user.id)
        .single();

      if (!userData) return;

      setUserForm({
        full_name: userData.full_name,
        phone: userData.phone,
      });
      setUserData({
        full_name: userData.full_name,
        email: userData.email,
        phone: userData.phone,
      });

      if (userData.restaurant_id) {
        const { data: restaurantData } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', userData.restaurant_id)
          .single();

        if (restaurantData) {
          setRestaurant(restaurantData);
          setBannerUrl(restaurantData.banner_url || null);
          setBannerPreview(restaurantData.banner_url || null);
          setRestaurantForm({
            name: restaurantData.name,
            slug: restaurantData.slug,
            bank_name: restaurantData.bank_name,
            account_number: restaurantData.account_number,
            account_name: restaurantData.account_name,
            delivery_enabled: restaurantData.delivery_enabled || false,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching settings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleRestaurantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!restaurant) return;

      // Check if name or slug is already taken by another restaurant
      const { data: existing } = await supabase
        .from('restaurants')
        .select('id, name, slug')
        .or(`name.eq."${restaurantForm.name}",slug.eq."${restaurantForm.slug}"`)
        .neq('id', restaurant.id)
        .maybeSingle();

      if (existing) {
        if (existing.name === restaurantForm.name) {
          toast({
            title: 'Error',
            description: 'This restaurant name is already taken',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error',
            description: 'This slug is already taken by another restaurant',
            variant: 'destructive',
          });
        }
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('restaurants')
        .update({
          name: restaurantForm.name,
          slug: restaurantForm.slug,
          bank_name: restaurantForm.bank_name,
          account_number: restaurantForm.account_number,
          account_name: restaurantForm.account_name,
          delivery_enabled: restaurantForm.delivery_enabled,
        })
        .eq('id', restaurant.id);

      if (error) throw error;

      toast({ title: 'Restaurant settings updated successfully' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update restaurant settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, or WebP image.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setBannerFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setBannerPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleBannerUpload = async () => {
    if (!bannerFile || !restaurant) return;

    setUploadingBanner(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', bannerFile);
      uploadFormData.append('type', 'banner');

      const response = await fetch('/api/upload/cloudinary', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload banner');
      }

      // Update restaurant with banner URL
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ banner_url: data.url })
        .eq('id', restaurant.id);

      if (updateError) throw updateError;

      setBannerUrl(data.url);
      setBannerFile(null);
      toast({
        title: 'Banner uploaded',
        description: 'Your restaurant banner has been updated successfully',
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload banner',
        variant: 'destructive',
      });
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleRemoveBanner = async () => {
    if (!restaurant) return;

    setUploadingBanner(true);

    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ banner_url: null })
        .eq('id', restaurant.id);

      if (error) throw error;

      setBannerUrl(null);
      setBannerPreview(null);
      setBannerFile(null);
      toast({
        title: 'Banner removed',
        description: 'Your restaurant banner has been removed',
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove banner',
        variant: 'destructive',
      });
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('users')
        .update({
          full_name: userForm.full_name,
          phone: userForm.phone,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({ title: 'Profile updated successfully' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-7xl mx-auto">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-headline">Settings</h1>
        <p className="text-muted-foreground">Manage your restaurant and account settings</p>
      </div>

      <Tabs defaultValue="restaurant" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="restaurant">
            <Building2 className="mr-2 h-4 w-4" /> Restaurant
          </TabsTrigger>
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" /> Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="restaurant">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Restaurant Information</CardTitle>
              <CardDescription>Update your restaurant details and payment information</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Banner Upload Section */}
              <div className="space-y-4 mb-6 pb-6 border-b">
                <div className="space-y-2">
                  <Label>Restaurant Banner</Label>
                  <p className="text-xs text-muted-foreground">
                    Upload a banner image that will be displayed at the top of your menu page (recommended: 1200x400px)
                  </p>
                  <div className="space-y-4">
                    {/* Banner Preview/Display */}
                    {(bannerPreview || bannerUrl) && (
                      <div className="relative w-full h-48 rounded-lg overflow-hidden border bg-muted group">
                        <img
                          src={bannerPreview || bannerUrl || ''}
                          alt="Banner preview"
                          className="w-full h-full object-cover"
                        />
                        {bannerFile && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2">
                            <Button
                              type="button"
                              onClick={handleBannerUpload}
                              disabled={uploadingBanner}
                              size="sm"
                            >
                              {uploadingBanner ? 'Uploading...' : 'Upload New Banner'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setBannerFile(null);
                                setBannerPreview(bannerUrl);
                              }}
                              disabled={uploadingBanner}
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                        {!bannerFile && bannerUrl && (
                          <div className="absolute top-2 right-2 flex gap-2">
                            <label htmlFor="banner-upload-update" className="cursor-pointer">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="bg-white/90 hover:bg-white"
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Change
                              </Button>
                            </label>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={handleRemoveBanner}
                              disabled={uploadingBanner}
                              className="bg-red-500/90 hover:bg-red-500"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Upload Area - Show when no banner exists */}
                    {!bannerPreview && !bannerUrl && (
                      <div className="flex items-center justify-center w-full h-48 border-2 border-dashed border-muted-foreground/20 rounded-lg hover:bg-muted/30 transition-colors">
                        <label htmlFor="banner-upload" className="flex flex-col items-center justify-center cursor-pointer w-full h-full">
                          <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                          <p className="text-sm font-medium text-muted-foreground">Click to upload banner</p>
                          <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, or WebP (max 5MB)</p>
                          <Input
                            id="banner-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleBannerChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                    
                    {/* Hidden input for updating existing banner */}
                    {bannerUrl && !bannerFile && (
                      <Input
                        id="banner-upload-update"
                        type="file"
                        accept="image/*"
                        onChange={handleBannerChange}
                        className="hidden"
                      />
                    )}
                    
                    {/* File Info when new file selected */}
                    {bannerFile && (
                      <div className="text-sm text-muted-foreground flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Selected: {bannerFile.name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setBannerFile(null);
                            setBannerPreview(bannerUrl);
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={handleRestaurantSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="restaurant_name">Restaurant Name *</Label>
                  <Input
                    id="restaurant_name"
                    value={restaurantForm.name}
                    onChange={(e) => {
                      setRestaurantForm({
                        ...restaurantForm,
                        name: e.target.value,
                        slug: generateSlug(e.target.value),
                      });
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restaurant_slug">Restaurant URL Slug *</Label>
                  <Input
                    id="restaurant_slug"
                    value={restaurantForm.slug}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, slug: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Your menu will be available at: /menu/{restaurantForm.slug || 'your-slug'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank Name *</Label>
                  <Input
                    id="bank_name"
                    value={restaurantForm.bank_name}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, bank_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_number">Account Number *</Label>
                  <Input
                    id="account_number"
                    value={restaurantForm.account_number}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, account_number: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_name">Account Name *</Label>
                  <Input
                    id="account_name"
                    value={restaurantForm.account_name}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, account_name: e.target.value })}
                    required
                  />
                </div>
                <div className="flex items-center space-x-2 pt-4 border-t">
                  <input
                    type="checkbox"
                    id="delivery_enabled"
                    checked={restaurantForm.delivery_enabled}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, delivery_enabled: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="delivery_enabled" className="font-medium cursor-pointer">
                    Enable Delivery Service
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">
                  When enabled, customers can choose delivery or pickup when placing orders.
                </p>
                <Button type="submit" disabled={saving} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={userForm.full_name}
                    onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userData?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" disabled={saving} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

