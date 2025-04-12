import { OpenAI } from 'openai';
import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';
import { db } from './db';
import { invoice } from './db/schema';
import { eq } from 'drizzle-orm';
import PDFParser from 'pdf2json';
import { getCachedPrompt, savePromptToCache, TokenUsage } from './prompt-cache';
import fs from 'fs/promises';

interface StructuredData {
  customerName: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date | null;
  amount: number;
  currency: string;
  confidence: number;
  extractionMethod: string;
  processingErrors: string[];
  originalFileUrl?: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
    originalPromptTokens?: number;
    originalCompletionTokens?: number;
    originalTotalTokens?: number;
    originalCost?: number;
    cached?: boolean;
  };
}

async function cleanPDFText(text: string): Promise<string> {
  // Remove excessive whitespace and normalize line endings
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();
}

async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    let text = '';

    pdfParser.on('pdfParser_dataReady', (pdfData) => {
      text = pdfData.Pages.map((page: any) => 
        page.Texts.map((text: any) => decodeURIComponent(text.R[0].T)).join(' ')
      ).join('\n');
      resolve(cleanPDFText(text));
    });

    pdfParser.on('pdfParser_dataError', (error) => {
      reject(new Error(`Failed to parse PDF: ${error}`));
    });

    pdfParser.parseBuffer(pdfBuffer);
  });
}

function isImageFile(filePathOrUrl: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  const extension = filePathOrUrl.toLowerCase().split('.').pop();
  return extension ? imageExtensions.includes(`.${extension}`) : false;
}

async function validateInvoiceWithGPT(text: string): Promise<boolean> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `You are an expert at identifying invoice documents. Your task is to determine if the provided text contains an invoice.
          
          Look for key indicators of an invoice such as:
          - Invoice number or reference
          - Billing information
          - Line items or charges
          - Total amount
          - Payment terms
          - Vendor/Supplier information
          
          Respond with a JSON object containing:
          {
            "isInvoice": boolean,
            "confidence": number (0-1),
            "reason": string (brief explanation of your decision)
          }`
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from OpenAI API');
    }

    const result = JSON.parse(content);
    return result.isInvoice;
  } catch (error) {
    console.error('Error validating invoice:', error);
    return false;
  }
}

async function extractTextFromImage(buffer: Buffer): Promise<string> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  try {
    // Convert buffer to base64
    const base64Image = buffer.toString('base64');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please extract all text from this image. Include any numbers, dates, and text you can find."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    return completion.choices[0].message.content || '';
  } catch (error) {
    console.error('Error extracting text from image:', error);
    return '';
  }
}

export async function processInvoice(filePathOrUrl: string, forceNoCache = false): Promise<StructuredData> {
  console.log(`Processing invoice from: ${filePathOrUrl}`);
  
  let buffer: Buffer;
  
  // Check if the input is a URL or a file path
  if (filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://')) {
    // Handle URL
    const response = await fetch(filePathOrUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    // Handle file path
    buffer = await fs.readFile(filePathOrUrl);
  }
  
  console.log(`File loaded successfully, size: ${buffer.byteLength} bytes`);
  
  // Extract text for validation
  const extractedText = isImageFile(filePathOrUrl) 
    ? await extractTextFromImage(buffer)
    : await extractTextFromPDF(buffer);
  
  // Validate if the document is an invoice
  const isValidInvoice = await validateInvoiceWithGPT(extractedText);
  if (!isValidInvoice) {
    return {
      customerName: "[Not an Invoice]",
      vendorName: "[Not an Invoice]",
      invoiceNumber: "[Not an Invoice]",
      invoiceDate: new Date(),
      dueDate: null,
      amount: 0,
      currency: "USD",
      confidence: 0,
      extractionMethod: "validation_failed",
      processingErrors: ["The document does not appear to be a valid invoice"],
      originalFileUrl: filePathOrUrl
    };
  }
  
  // Check if we have a cached result
  const cacheKey = isImageFile(filePathOrUrl) ? filePathOrUrl : extractedText;
  console.log("forceNoCache", forceNoCache);
  const cachedResult = await getCachedPrompt(cacheKey);
  console.log("cachedResult", cachedResult);
  
  if (cachedResult) {
    console.log('Using cached prompt result');
    const result = JSON.parse(cachedResult.result);
    const originalTokenUsage = JSON.parse(cachedResult.tokenUsage);
    // When using cache, return zero token usage but store the original usage for savings calculation
    return {
      ...result,
      tokenUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        cost: 0,
        originalPromptTokens: originalTokenUsage.promptTokens,
        originalCompletionTokens: originalTokenUsage.completionTokens,
        originalTotalTokens: originalTokenUsage.totalTokens,
        originalCost: originalTokenUsage.cost,
        cached: true
      }
    };
  }
  
  // Process with OpenAI based on file type
  const result = isImageFile(filePathOrUrl)
    ? await processImageWithOpenAI(filePathOrUrl)
    : await processTextWithOpenAI(extractedText, filePathOrUrl);
  
  console.log("no cache");
  console.log(result);
  
  // Save to cache for future use
  if (result.tokenUsage) {
    await savePromptToCache(cacheKey, JSON.stringify(result), result.tokenUsage);
  }
  
  return result;
}

async function processImageWithOpenAI(imageUrl: string): Promise<StructuredData> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  try {
    // Process with GPT-4 Vision
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting information from invoice documents. 
          Extract the following information from the provided invoice image:
          - Customer Name
          - Vendor Name
          - Invoice Number
          - Invoice Date
          - Due Date (if available)
          - Total Amount
          - Currency (e.g., USD, EUR, GBP, etc.)
          
          Format the response as a JSON object with these exact keys:
          {
            "customerName": string,
            "vendorName": string,
            "invoiceNumber": string,
            "invoiceDate": string (ISO format),
            "dueDate": string (ISO format) or null,
            "amount": number (in cents),
            "currency": string (e.g., "USD", "EUR", "GBP"),
            "confidence": number (0-1)
          }
          
          If you cannot find a value, use null for dates and 0 for amount.
          For text fields, use "[Not Found]" if the value cannot be determined.
          For currency, default to "USD" if not specified.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this invoice image and extract the required information."
            },
            {
              type: "image_url" as const,
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from OpenAI API');
    }

    // Clean the response by removing markdown code blocks if present
    const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(cleanedContent);
    
    // Extract token usage information
    const tokenUsage = {
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
      cost: calculateCost(completion.usage)
    };
    
    console.log('Token usage:', tokenUsage);
    
    // Create the structured data with token usage
    const structuredData: StructuredData = {
      customerName: result.customerName || "[Not Found]",
      vendorName: result.vendorName || "[Not Found]",
      invoiceNumber: result.invoiceNumber || "[Not Found]",
      invoiceDate: new Date(result.invoiceDate || new Date()),
      dueDate: result.dueDate ? new Date(result.dueDate) : null,
      amount: result.amount || 0,
      currency: result.currency || "USD",
      confidence: result.confidence || 0.5,
      extractionMethod: "vision",
      processingErrors: [],
      originalFileUrl: imageUrl,
      tokenUsage
    };

    return structuredData;
  } catch (error) {
    console.error('Error processing invoice image:', error);
    return {
      customerName: "[Processing Error]",
      vendorName: "[Processing Error]",
      invoiceNumber: "[Processing Error]",
      invoiceDate: new Date(),
      dueDate: null,
      amount: 0,
      currency: "USD",
      confidence: 0,
      extractionMethod: "failed",
      processingErrors: [error instanceof Error ? error.message : "Unknown error"],
      originalFileUrl: imageUrl
    };
  }
}

async function processTextWithOpenAI(text: string, fileUrl: string): Promise<StructuredData> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  try {
    // Process with GPT-4 Turbo
    const completion = await openai.chat.completions.create({
      model: "gpt-4-0125-preview",
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting information from invoice documents. 
          Extract the following information from the provided text:
          - Customer Name
          - Vendor Name
          - Invoice Number
          - Invoice Date
          - Due Date (if available)
          - Total Amount
          - Currency (e.g., USD, EUR, GBP, etc.)
          
          Format the response as a JSON object with these exact keys:
          {
            "customerName": string,
            "vendorName": string,
            "invoiceNumber": string,
            "invoiceDate": string (ISO format),
            "dueDate": string (ISO format) or null,
            "amount": number (in cents),
            "currency": string (e.g., "USD", "EUR", "GBP"),
            "confidence": number (0-1)
          }
          
          If you cannot find a value, use null for dates and 0 for amount.
          For text fields, use "[Not Found]" if the value cannot be determined.
          For currency, default to "USD" if not specified.`
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from OpenAI API');
    }

    // Clean the response by removing markdown code blocks if present
    const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(cleanedContent);
    
    // Extract token usage information
    const tokenUsage = {
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
      cost: calculateCost(completion.usage)
    };
    
    console.log('Token usage:', tokenUsage);
    
    // Create the structured data with token usage
    const structuredData: StructuredData = {
      customerName: result.customerName || "[Not Found]",
      vendorName: result.vendorName || "[Not Found]",
      invoiceNumber: result.invoiceNumber || "[Not Found]",
      invoiceDate: new Date(result.invoiceDate || new Date()),
      dueDate: result.dueDate ? new Date(result.dueDate) : null,
      amount: result.amount || 0,
      currency: result.currency || "USD",
      confidence: result.confidence || 0.5,
      extractionMethod: "text",
      processingErrors: [],
      originalFileUrl: fileUrl,
      tokenUsage
    };

    return structuredData;
  } catch (error) {
    console.error('Error processing invoice:', error);
    return {
      customerName: "[Processing Error]",
      vendorName: "[Processing Error]",
      invoiceNumber: "[Processing Error]",
      invoiceDate: new Date(),
      dueDate: null,
      amount: 0,
      currency: "USD",
      confidence: 0,
      extractionMethod: "failed",
      processingErrors: [error instanceof Error ? error.message : "Unknown error"],
      originalFileUrl: fileUrl
    };
  }
}

function calculateCost(usage: any): number {
  if (!usage) return 0;
  
  // GPT-4 Turbo pricing (as of March 2024)
  const inputCostPer1K = 0.01;  // $0.01 per 1K tokens
  const outputCostPer1K = 0.03; // $0.03 per 1K tokens
  
  const inputCost = (usage.prompt_tokens || 0) * inputCostPer1K / 1000;
  const outputCost = (usage.completion_tokens || 0) * outputCostPer1K / 1000;
  
  return inputCost + outputCost;
} 