'use server';
/**
 * @fileOverview An AI assistant that analyzes payment proofs and transfer names
 * to provide a recommendation for order confirmation.
 *
 * - analyzePaymentProof - A function that handles the payment proof analysis process.
 * - PaymentProofAnalysisInput - The input type for the analyzePaymentProof function.
 * - PaymentProofAnalysisOutput - The return type for the analyzePaymentProof function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PaymentProofAnalysisInputSchema = z.object({
  paymentProofDataUri: z
    .string()
    .describe(
      "A screenshot or photo of a bank transfer payment proof, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  transferName: z
    .string()
    .describe('The name provided by the customer for the bank transfer.'),
  expectedAmount: z
    .number()
    .describe('The expected total amount of the order in Naira (NGN).'),
});
export type PaymentProofAnalysisInput = z.infer<typeof PaymentProofAnalysisInputSchema>;

const PaymentProofAnalysisOutputSchema = z.object({
  recommendation: z
    .enum(['high confidence to confirm', 'manual review needed', 'potential fraud'])
    .describe(
      'The AI-generated recommendation for confirming the payment: "high confidence to confirm", "manual review needed", or "potential fraud".'
    ),
  reasoning: z
    .string()
    .describe('An explanation for the given recommendation, including any discrepancies or observations.'),
  extractedAmount: z
    .number()
    .optional()
    .describe('The amount detected in the payment proof image, if identifiable.'),
  extractedName: z
    .string()
    .optional()
    .describe('The sender name detected in the payment proof image, if identifiable.'),
});
export type PaymentProofAnalysisOutput = z.infer<typeof PaymentProofAnalysisOutputSchema>;

export async function analyzePaymentProof(
  input: PaymentProofAnalysisInput
): Promise<PaymentProofAnalysisOutput> {
  return paymentProofAnalysisFlow(input);
}

const paymentProofAnalysisPrompt = ai.definePrompt({
  name: 'paymentProofAnalysisPrompt',
  input: {schema: PaymentProofAnalysisInputSchema},
  output: {schema: PaymentProofAnalysisOutputSchema},
  prompt: [
    {
      text: `You are an expert payment verification assistant for a restaurant. Your task is to analyze a customer's provided payment proof and transfer name against the expected order amount.\n      \n      Carefully examine the payment proof image and the customer-provided transfer name. Your goal is to determine the likelihood of a successful and legitimate payment.\n      \n      Consider the following:\n      1.  **Payment Proof Image:** Look for clear indications of a successful bank transfer, such as transaction IDs, timestamps, sender/receiver details, and the transfer amount. Assess the quality and authenticity of the image (e.g., signs of editing or tampering).\n      2.  **Customer-Provided Transfer Name:** Compare this name with any sender names visible in the payment proof.\n      3.  **Expected Amount:** Compare the amount visible in the payment proof with the expected order amount ({{{expectedAmount}}}).\n\n      Based on your analysis, provide one of the following recommendations:\n      -   "high confidence to confirm": If the payment proof appears legitimate, the amount matches the expected amount, and the transfer name aligns well.\n      -   "manual review needed": If there are minor discrepancies, ambiguities, low image quality, or insufficient information to confidently confirm.\n      -   "potential fraud": If there are clear signs of tampering, mismatched amounts, or suspicious details that strongly suggest a fraudulent payment.\n\n      Always provide a detailed reasoning for your recommendation. If identifiable, also extract the amount and sender name from the proof.\n      \n      Expected Order Amount: {{{expectedAmount}}}\n      Customer Provided Transfer Name: {{{transferName}}}\n      `,
    },
    {
      media: {url: '{{media url=paymentProofDataUri}}'},
    },
  ],
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_NONE',
      },
    ],
  },
});

const paymentProofAnalysisFlow = ai.defineFlow(
  {
    name: 'paymentProofAnalysisFlow',
    inputSchema: PaymentProofAnalysisInputSchema,
    outputSchema: PaymentProofAnalysisOutputSchema,
  },
  async (input) => {
    const {output} = await paymentProofAnalysisPrompt(input);
    return output!;
  }
);
