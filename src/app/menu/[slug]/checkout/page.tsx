'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CreditCard, Upload, CheckCircle2, Building2, User, Phone, Mail, FileText, Image as ImageIcon, X, Truck, Store, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  available: boolean;
  category_id: string;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  delivery_enabled: boolean;
}

export default function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const supabase = createClient();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    note: '',
    paymentReference: '',
    buyerTransferName: '',
    deliveryMethod: 'pickup' as 'delivery' | 'pickup' | 'dine_in',
  });

  useEffect(() => {
    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    }

    fetchRestaurant();
  }, [slug]);

  const fetchRestaurant = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, slug, bank_name, account_number, account_name, delivery_enabled')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({
          title: 'Restaurant not found',
          description: 'The restaurant you are looking for does not exist.',
          variant: 'destructive',
        });
        router.push(`/menu/${slug}`);
        return;
      }

      setRestaurant(data);
    } catch (error: any) {
      console.error('Error fetching restaurant:', error);
      toast({
        title: 'Error',
        description: 'Failed to load restaurant information.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setPaymentProofFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentProofPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadPaymentProof = async (): Promise<string | null> => {
    if (!paymentProofFile) {
      return null;
    }

    setUploadingProof(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', paymentProofFile);

      const response = await fetch('/api/upload/cloudinary', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload payment proof');
      }

      return data.url;
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload payment proof',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploadingProof(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const getTotal = () => {
    return cart.reduce((total, item) => total + item.menuItem.price * item.quantity, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Please add items to your cart before placing an order.',
        variant: 'destructive',
      });
      return;
    }

    if (!paymentProofFile) {
      toast({
        title: 'Payment proof required',
        description: 'Please upload a screenshot of your payment receipt.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Upload payment proof first
      const paymentProofUrl = await uploadPaymentProof();
      if (!paymentProofUrl) {
        setSubmitting(false);
        return;
      }

      // Create order
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantId: restaurant!.id,
          cart: cart.map((item) => ({
            menuItemId: item.menuItem.id,
            quantity: item.quantity,
            price: item.menuItem.price,
          })),
          customerInfo: {
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
          },
          paymentInfo: {
            paymentReference: formData.paymentReference,
            buyerTransferName: formData.buyerTransferName,
            paymentProofUrl: paymentProofUrl,
          },
          note: formData.note || null,
          tableNumber: searchParams.get('table') ? parseInt(searchParams.get('table')!) : null,
          deliveryMethod: formData.deliveryMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      // Clear cart
      localStorage.removeItem('cart');

      // Redirect to success page
      router.push(`/menu/${slug}/order-success?orderId=${data.orderId}`);
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast({
        title: 'Order failed',
        description: error.message || 'Failed to place your order. Please try again.',
        variant: 'destructive',
      });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant || cart.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <h2 className="text-2xl font-bold">Cart is Empty</h2>
            <p className="text-muted-foreground">Please add items to your cart before checkout.</p>
            <Button asChild>
              <Link href={`/menu/${slug}`}>Back to Menu</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/menu/${slug}`}>
              <ArrowLeft size={20} />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-headline">Checkout</h1>
            <p className="text-muted-foreground">Complete your order from {restaurant.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Order Details & Payment */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.map((item) => (
                  <div key={item.menuItem.id} className="flex items-center gap-4 pb-4 border-b last:border-0 last:pb-0">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                      {item.menuItem.image_url ? (
                        <img
                          src={item.menuItem.image_url}
                          alt={item.menuItem.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground opacity-50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold truncate">{item.menuItem.name}</h4>
                      <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(item.menuItem.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(getTotal())}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User size={20} />
                  Customer Information
                </CardTitle>
                <CardDescription>We'll use this to contact you about your order</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    placeholder="+234 800 000 0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Special Instructions (Optional)</Label>
                  <Textarea
                    id="note"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Any special requests or notes for your order..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Order Type Selection */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils size={20} />
                  Order Type
                </CardTitle>
                <CardDescription>Choose how you'd like to receive your order</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryMethod: 'dine_in' })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.deliveryMethod === 'dine_in'
                        ? 'border-primary bg-primary/10'
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <Utensils className="mx-auto mb-2 h-6 w-6" />
                    <p className="font-bold">Dine In</p>
                    <p className="text-xs text-muted-foreground">Eat at restaurant</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryMethod: 'pickup' })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.deliveryMethod === 'pickup'
                        ? 'border-primary bg-primary/10'
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <Store className="mx-auto mb-2 h-6 w-6" />
                    <p className="font-bold">Pickup</p>
                    <p className="text-xs text-muted-foreground">Collect at restaurant</p>
                  </button>
                  {restaurant.delivery_enabled ? (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, deliveryMethod: 'delivery' })}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.deliveryMethod === 'delivery'
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      <Truck className="mx-auto mb-2 h-6 w-6" />
                      <p className="font-bold">Delivery</p>
                      <p className="text-xs text-muted-foreground">Deliver to address</p>
                    </button>
                  ) : (
                    <div className="p-4 rounded-lg border-2 border-muted bg-muted/30 opacity-50 cursor-not-allowed">
                      <Truck className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                      <p className="font-bold text-muted-foreground">Delivery</p>
                      <p className="text-xs text-muted-foreground">Not available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard size={20} />
                  Payment Information
                </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentReference">Payment Reference *</Label>
                    <Input
                      id="paymentReference"
                      value={formData.paymentReference}
                      onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                      required
                      placeholder="Transaction reference or receipt number"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the transaction reference from your bank transfer
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buyerTransferName">Name on Transfer *</Label>
                    <Input
                      id="buyerTransferName"
                      value={formData.buyerTransferName}
                      onChange={(e) => setFormData({ ...formData, buyerTransferName: e.target.value })}
                      required
                      placeholder="Name as it appears on the transfer"
                    />
                    <p className="text-xs text-muted-foreground">
                      The name you used when making the bank transfer
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentProof">Payment Proof (Screenshot) *</Label>
                    <div className="space-y-3">
                      <Input
                        id="paymentProof"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handlePaymentProofChange}
                        className="cursor-pointer"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Upload a screenshot of your payment receipt. Max 5MB. Formats: JPEG, PNG, WebP
                      </p>
                      {paymentProofPreview && (
                        <div className="relative w-full h-48 border rounded-lg overflow-hidden bg-muted">
                          <img
                            src={paymentProofPreview}
                            alt="Payment proof preview"
                            className="w-full h-full object-contain"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              setPaymentProofFile(null);
                              setPaymentProofPreview(null);
                            }}
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
            </Card>
          </div>

          {/* Right Column - Bank Details & Submit */}
          <div className="space-y-6">
            {/* Bank Account Details */}
            <Card className="border-none shadow-sm bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 size={20} className="text-primary" />
                  Bank Account Details
                </CardTitle>
                <CardDescription>Transfer the exact amount to this account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Bank Name</Label>
                  <p className="text-lg font-bold">{restaurant.bank_name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Account Number</Label>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold font-mono">{restaurant.account_number}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(restaurant.account_number);
                        toast({
                          title: 'Copied!',
                          description: 'Account number copied to clipboard',
                        });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Account Name</Label>
                  <p className="text-lg font-bold">{restaurant.account_name}</p>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Amount to Transfer</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(getTotal())}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Instructions */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText size={20} />
                  How to Complete Your Order
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    1
                  </div>
                  <p>Transfer <strong>{formatCurrency(getTotal())}</strong> to the bank account above</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    2
                  </div>
                  <p>Fill in your customer information and payment details</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    3
                  </div>
                  <p>Upload a screenshot of your payment receipt</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    4
                  </div>
                  <p>Submit your order. We'll verify and confirm it!</p>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full h-14 text-lg font-bold rounded-xl"
              disabled={submitting || uploadingProof}
            >
              {submitting || uploadingProof ? (
                <>
                  <Upload className="mr-2 h-5 w-5 animate-spin" />
                  {uploadingProof ? 'Uploading...' : 'Placing Order...'}
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Place Order
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By placing this order, you agree to our terms and conditions. Your order will be confirmed after payment verification.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

