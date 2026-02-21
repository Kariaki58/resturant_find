"use client";

import { use } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, XCircle, Printer, MapPin, Phone, User, Calendar, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { PaymentProofAnalyzer } from '@/components/orders/PaymentProofAnalyzer';
import { useToast } from '@/hooks/use-toast';

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();

  // Mock order data
  const order = {
    id,
    customer: {
      name: "Tunde Ednut",
      email: "tunde@socials.ng",
      phone: "0801 234 5678",
      transferName: "Tunde A. Ednut"
    },
    items: [
      { name: "Jollof Rice (Large)", qty: 2, price: 2500 },
      { name: "Fried Plantain (Portion)", qty: 1, price: 1000 },
      { name: "Grilled Chicken Quarter", qty: 2, price: 3500 },
      { name: "Coke (50cl)", qty: 2, price: 500 },
    ],
    status: "awaiting_confirmation",
    type: "online",
    total: 14000,
    created_at: "2024-11-20 14:35:12",
    paymentProofUrl: "https://picsum.photos/seed/proof/800/1200",
  };

  const handleConfirm = () => {
    toast({
      title: "Order Confirmed",
      description: "Payment verified successfully. Moving to kitchen.",
      variant: "default"
    });
  };

  const handleReject = () => {
    toast({
      title: "Order Rejected",
      description: "Customer will be notified of payment discrepancy.",
      variant: "destructive"
    });
  };

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/dashboard/orders">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-headline flex items-center gap-3">
            Order #{id}
            <Badge className="bg-orange-500 hover:bg-orange-600">Awaiting Confirmation</Badge>
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <Calendar className="w-4 h-4" /> {order.created_at}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" className="rounded-full">
            <Printer className="mr-2 w-4 h-4" /> Receipt
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {/* Order Items */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Order Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {order.items.map((item, i) => (
                  <div key={i} className="py-4 flex justify-between items-center first:pt-0 last:pb-0">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center font-bold text-primary text-sm">
                        {item.qty}x
                      </div>
                      <div>
                        <p className="font-bold">{item.name}</p>
                        <p className="text-xs text-muted-foreground">₦{item.price.toLocaleString()} each</p>
                      </div>
                    </div>
                    <span className="font-bold">₦{(item.qty * item.price).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>₦13,500</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Service Fee</span>
                  <span>₦500</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-primary pt-2">
                  <span>Total Amount</span>
                  <span>₦{order.total.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Proof Image */}
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payment Proof</CardTitle>
                <CardDescription>Screenshot uploaded by customer</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={order.paymentProofUrl} target="_blank" rel="noreferrer">Open Full Image</a>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="relative rounded-xl overflow-hidden border bg-muted aspect-[4/5] md:aspect-auto md:max-h-[600px] flex items-center justify-center">
                <img 
                  src={order.paymentProofUrl} 
                  alt="Payment Proof" 
                  className="max-w-full max-h-full object-contain"
                  data-ai-hint="payment receipt screenshot"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          {/* AI Analyzer Tool */}
          <PaymentProofAnalyzer 
            imageUrl={order.paymentProofUrl}
            expectedAmount={order.total}
            customerName={order.customer.transferName}
          />

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Customer Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm font-bold">{order.customer.name}</p>
                  <p className="text-xs text-muted-foreground">Buyer Name</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CreditCard className="w-4 h-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm font-bold text-primary">{order.customer.transferName}</p>
                  <p className="text-xs text-muted-foreground">Sender Name on Proof</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm font-bold">{order.customer.phone}</p>
                  <p className="text-xs text-muted-foreground">Phone Number</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm font-bold">Pick-up / Online</p>
                  <p className="text-xs text-muted-foreground">Delivery Method</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary bg-white shadow-xl ring-2 ring-primary/20 sticky top-24">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-center mb-4">Confirm Payment?</h3>
              <Button 
                onClick={handleConfirm}
                className="w-full rounded-full py-6 text-lg bg-primary hover:bg-primary/90"
              >
                <CheckCircle2 className="mr-2 w-5 h-5" /> Confirm Order
              </Button>
              <Button 
                onClick={handleReject}
                variant="outline" 
                className="w-full rounded-full border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
              >
                <XCircle className="mr-2 w-5 h-5" /> Reject Payment
              </Button>
              <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
                Confirming moves the order to the kitchen. Rejecting will notify the customer via SMS/Email.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}