"use client";

import { useState } from 'react';
import { analyzePaymentProof, PaymentProofAnalysisOutput } from '@/ai/flows/payment-proof-analysis-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck, AlertTriangle, ShieldAlert, ScanSearch } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  imageUrl: string;
  expectedAmount: number;
  customerName: string;
  onAnalysisComplete?: (recommendation: string) => void;
}

export function PaymentProofAnalyzer({ imageUrl, expectedAmount, customerName, onAnalysisComplete }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PaymentProofAnalysisOutput | null>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      // In a real app, we'd fetch the image as a base64 data URI
      // For this demo, we assume imageUrl is already accessible
      // We'll simulate the data URI conversion if needed, but for the flow:
      const analysis = await analyzePaymentProof({
        paymentProofDataUri: imageUrl,
        transferName: customerName,
        expectedAmount: expectedAmount
      });
      setResult(analysis);
      if (onAnalysisComplete) {
        onAnalysisComplete(analysis.recommendation);
      }
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Could not process the payment proof image.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getBadge = (rec: string) => {
    switch (rec) {
      case 'high confidence to confirm':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 flex gap-1"><ShieldCheck size={14} /> High Confidence</Badge>;
      case 'manual review needed':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 flex gap-1"><AlertTriangle size={14} /> Needs Review</Badge>;
      case 'potential fraud':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 flex gap-1"><ShieldAlert size={14} /> Potential Fraud</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <ScanSearch className="text-primary w-4 h-4" />
          AI Payment Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-xs text-muted-foreground text-center">
              Let our AI analyze the screenshot for authenticity, amount matching, and sender name discrepancies.
            </p>
            <Button 
              onClick={handleAnalyze} 
              disabled={loading}
              className="w-full rounded-full"
              size="sm"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Run AI Analysis"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-muted-foreground">Recommendation:</span>
              {getBadge(result.recommendation)}
            </div>
            
            <div className="bg-white p-3 rounded-lg border text-xs">
              <p className="font-medium text-foreground mb-1">AI Reasoning:</p>
              <p className="text-muted-foreground leading-relaxed">{result.reasoning}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white p-2 rounded-md border">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Extracted Amount</p>
                <p className="font-bold">₦{result.extractedAmount?.toLocaleString() || '---'}</p>
              </div>
              <div className="bg-white p-2 rounded-md border">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Extracted Name</p>
                <p className="font-bold truncate">{result.extractedName || '---'}</p>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setResult(null)} 
              className="text-[10px] h-auto p-0 hover:bg-transparent text-muted-foreground underline"
            >
              Re-analyze image
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}