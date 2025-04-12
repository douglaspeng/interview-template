'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, Send, Bot, User } from 'lucide-react';
import { toast } from 'sonner';
import { useInvoice } from '@/lib/context/InvoiceContext';
import { Message } from '@/types/chat';

// Custom hook to manage chat history
function useChatHistory() {
  const [messages, setMessages] = useState<Message[]>(() => {
    // Default welcome message
    return [
      {
        role: 'assistant',
        content: 'Hello! I can help you manage your invoices. Here\'s what I can do:\n\n' +
          '1. Upload and process invoices: Just upload a PDF or image file and I\'ll extract the information.\n' +
          '2. Delete invoices: Ask me to delete an invoice by providing the invoice number.\n' +
          '3. Search by vendor/customer: Try "show me invoices with vendor Acme Corp" or "show me invoices with customer John Smith".\n' +
          '4. Search by due date range: Try "show me invoices due date from 2023-01-01 to 2023-12-31".\n\n' +
          'After searching for invoices, you can ask follow-up questions like "what is the due date" or "what is the customer" to get more details.\n\n' +
          'How can I assist you today?',
      },
    ];
  });

  // Store messages in memory only (not in sessionStorage)
  // This will persist during page navigation but reset on refresh
  return { messages, setMessages };
}

export function InvoiceChat() {
  const { messages, setMessages } = useChatHistory();
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentInvoiceData, setCurrentInvoiceData] = useState<any>(() => {
    // Try to load currentInvoiceData from localStorage on component mount
    if (typeof window !== 'undefined') {
      const savedData = localStorage.getItem('currentInvoiceData');
      if (savedData) {
        try {
          return JSON.parse(savedData);
        } catch (error) {
          console.error('Error parsing saved currentInvoiceData:', error);
        }
      }
    }
    return null;
  });
  const [processedInvoiceData, setProcessedInvoiceData] = useState<any>(() => {
    // Try to load processedInvoiceData from localStorage on component mount
    if (typeof window !== 'undefined') {
      const savedData = localStorage.getItem('processedInvoiceData');
      if (savedData) {
        try {
          return JSON.parse(savedData);
        } catch (error) {
          console.error('Error parsing saved processedInvoiceData:', error);
        }
      }
    }
    return null;
  });
  const [lastSearchResults, setLastSearchResults] = useState<any[]>([]);
  const [awaitingSaveConfirmation, setAwaitingSaveConfirmation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast: uiToast } = useToast();
  const router = useRouter();
  const { triggerRefresh } = useInvoice();

  // Save currentInvoiceData to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && currentInvoiceData) {
      localStorage.setItem('currentInvoiceData', JSON.stringify(currentInvoiceData));
    }
  }, [currentInvoiceData]);
  
  // Save processedInvoiceData to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && processedInvoiceData) {
      localStorage.setItem('processedInvoiceData', JSON.stringify(processedInvoiceData));
    }
  }, [processedInvoiceData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input after messages change
  useEffect(() => {
    inputRef.current?.focus();
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      uiToast({
        title: 'Invalid file type',
        description: 'Please upload a PDF or image file (JPEG, PNG)',
        variant: 'destructive',
      });
      return;
    }
    
    setSelectedFile(file);
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'user',
        content: `I've selected a file: ${file.name}`,
        file,
        timestamp: new Date().toISOString(),
      },
      {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I see you've selected a file: ${file.name}. Would you like me to process this invoice? Please answer "yes" or "no".`,
        timestamp: new Date().toISOString(),
      }
    ]);
    
    // Set awaiting save confirmation to false since we're now awaiting process confirmation
    setAwaitingSaveConfirmation(false);
  };

  const processInvoice = async (file: File) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/invoices/process', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Processing failed');
      }
      
      const rawData = await response.json();
      console.log("raw",rawData);
      // Check if the processing was successful
      if (rawData.processingErrors && rawData.processingErrors.length > 0) {
        console.warn('Invoice processing had errors:', rawData.processingErrors);
        
        // If the processing had errors but still extracted some data, we can still try to save it
        if (rawData.vendorName && rawData.vendorName !== '[Processing Error]' &&
            rawData.invoiceNumber && rawData.invoiceNumber !== '[Processing Error]') {
          // Format the data to ensure all required fields are present
          const data = {
            customerName: rawData.customerName || 'Unknown Customer',
            vendorName: rawData.vendorName,
            invoiceNumber: rawData.invoiceNumber,
            invoiceDate: rawData.invoiceDate || new Date().toISOString(),
            dueDate: rawData.dueDate || null,
            amount: rawData.amount || 0,
            currency: rawData.currency || 'USD',
            confidence: rawData.confidence || 0.5,
            extractionMethod: rawData.extractionMethod || 'manual',
            // Ensure processingErrors is an array
            processingErrors: Array.isArray(rawData.processingErrors) ? rawData.processingErrors : [],
            status: 'processed',
            originalFileUrl: rawData.originalFileUrl || null,
            // Store token usage information if available
            tokenUsage: rawData.tokenUsage || null,
          };
          
          setProcessedInvoiceData(data);
          
          // Create the base message content
          let messageContent = `Invoice processed with some errors, but I've extracted the following information:
          
- Vendor: ${data.vendorName}
- Customer: ${data.customerName}
- Invoice Number: ${data.invoiceNumber}
- Date: ${data.invoiceDate ? new Date(data.invoiceDate).toLocaleDateString() : 'Not detected'}
- Amount: ${data.amount ? `$${(data.amount / 100).toFixed(2)}` : 'Not detected'}`;

          // Add token usage information if available
          if (data.tokenUsage) {
            messageContent += `\n\n**Token Usage Information:**
- Prompt Tokens: ${data.tokenUsage.promptTokens}
- Completion Tokens: ${data.tokenUsage.completionTokens}
- Total Tokens: ${data.tokenUsage.totalTokens}
- Estimated Cost: $${data.tokenUsage.cost.toFixed(4)}`;
          }

          messageContent += `\n\nNote: There were some processing errors: ${data.processingErrors.join(', ')}`;
          messageContent += `\n\nWould you like to save this invoice to your database? Please answer "yes" or "no".`;
          
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: messageContent,
              invoiceData: data,
              timestamp: new Date().toISOString(),
            },
          ]);
          
          setAwaitingSaveConfirmation(true);
          return;
        }
      }
      
      // Format the data to ensure all required fields are present
      const data = {
        customerName: rawData.customerName || 'Unknown Customer',
        vendorName: rawData.vendorName || 'Unknown Vendor',
        invoiceNumber: rawData.invoiceNumber || 'Unknown',
        invoiceDate: rawData.invoiceDate || new Date().toISOString(),
        dueDate: rawData.dueDate || null,
        amount: rawData.amount || 0,
        currency: rawData.currency || 'USD',
        confidence: rawData.confidence || 0.5,
        extractionMethod: rawData.extractionMethod || 'manual',
        // Ensure processingErrors is an array
        processingErrors: Array.isArray(rawData.processingErrors) ? rawData.processingErrors : [],
        status: 'processed',
        originalFileUrl: rawData.originalFileUrl || null,
        // Store token usage information if available
        tokenUsage: rawData.tokenUsage || null,
      };
      
      setProcessedInvoiceData(data);
      
      // Create the base message content
      let messageContent = `Invoice processed successfully! I've extracted the following information:
          
- Vendor: ${data.vendorName}
- Customer: ${data.customerName}
- Invoice Number: ${data.invoiceNumber}
- Date: ${data.invoiceDate ? new Date(data.invoiceDate).toLocaleDateString() : 'Not detected'}
- Amount: ${data.amount ? `$${(data.amount / 100).toFixed(2)}` : 'Not detected'}`;

      // Add token usage information if available
      if (data.tokenUsage) {
        messageContent += `\n\n**Token Usage Information:**
- Total Tokens: ${data.tokenUsage.totalTokens}
- Estimated Cost: $${data.tokenUsage.cost.toFixed(4)}`;
      }

      messageContent += `\n\nWould you like to save this invoice to your database? Please answer "yes" or "no".`;
      
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: messageContent,
          invoiceData: data,
          timestamp: new Date().toISOString(),
        },
      ]);
      
      setAwaitingSaveConfirmation(true);
      
    } catch (error) {
      uiToast({
        title: 'Error processing invoice',
        description: error instanceof Error ? error.message : 'Failed to process invoice',
        variant: 'destructive',
      });
      
      // Create error message
      let errorMessage = `Sorry, I encountered an error while processing the invoice: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      // If we have token usage information despite the error, include it
      if (processedInvoiceData?.tokenUsage) {
        errorMessage += `\n\n**Token Usage Information:**
- Prompt Tokens: ${processedInvoiceData.tokenUsage.promptTokens}
- Completion Tokens: ${processedInvoiceData.tokenUsage.completionTokens}
- Total Tokens: ${processedInvoiceData.tokenUsage.totalTokens}
- Estimated Cost: $${processedInvoiceData.tokenUsage.cost.toFixed(4)}`;
      }
      
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveInvoice = async (forceSave = false) => {
    if (!processedInvoiceData) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'No processed invoice data available to save.',
          timestamp: new Date().toISOString(),
        },
      ]);
      return;
    }

    try {
      // Check if the data contains placeholder values
      if (processedInvoiceData.vendorName === '[Processing Error]' || 
          processedInvoiceData.customerName === '[Processing Error]' ||
          processedInvoiceData.invoiceNumber === '[Processing Error]') {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'Cannot save invoice with processing errors. Please try processing the invoice again or upload a different file.',
            timestamp: new Date().toISOString(),
          },
        ]);
        return;
      }
      console.log(processedInvoiceData);
      // Ensure all required fields are present and properly formatted
      const invoiceData = {
        customerName: processedInvoiceData.customerName || 'Unknown Customer',
        vendorName: processedInvoiceData.vendorName || 'Unknown Vendor',
        invoiceNumber: processedInvoiceData.invoiceNumber || 'Unknown',
        invoiceDate: processedInvoiceData.invoiceDate || new Date().toISOString(),
        dueDate: processedInvoiceData.dueDate || null,
        amount: processedInvoiceData.amount || 0,
        currency: processedInvoiceData.currency || 'USD',
        confidence: processedInvoiceData.confidence || 0.5,
        extractionMethod: processedInvoiceData.extractionMethod || 'manual',
        processingErrors: Array.isArray(processedInvoiceData.processingErrors) 
          ? processedInvoiceData.processingErrors 
          : processedInvoiceData.processingErrors ? [processedInvoiceData.processingErrors] : [],
        status: 'processed',
        originalFileUrl: processedInvoiceData.originalFileUrl || null,
        forceSave: forceSave, // Use the parameter value
        // Include token usage information if available
        tokenUsage: processedInvoiceData.tokenUsage || null,
      };

      console.log('Saving invoice data:', invoiceData);

      const response = await fetch('/api/invoices/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      const responseData = await response.json();

      if (!response.ok) {
      //  console.error('Error response from server:', responseData);
        
        // If it's a duplicate error, ask the user if they want to force save
        if (response.status === 409 && responseData.error === 'Duplicate invoice detected') {
          // Get details about the duplicate invoice
          const duplicateResponse = await fetch(`/api/invoices/${responseData.duplicateId}`);
          const duplicateData = await duplicateResponse.json();
          
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: `I found a duplicate invoice in the database:

Existing Invoice:
- Invoice Number: ${duplicateData.invoiceNumber}
- Vendor: ${duplicateData.vendorName}
- Customer: ${duplicateData.customerName}
- Amount: $${(duplicateData.amount / 100).toFixed(2)}
- Date: ${new Date(duplicateData.invoiceDate).toLocaleDateString()}

New Invoice:
- Invoice Number: ${invoiceData.invoiceNumber}
- Vendor: ${invoiceData.vendorName}
- Customer: ${invoiceData.customerName}
- Amount: $${(invoiceData.amount / 100).toFixed(2)}
- Date: ${new Date(invoiceData.invoiceDate).toLocaleDateString()}

Would you like to:
1. Replace the existing invoice (type "replace")
2. Cancel saving this invoice (type "cancel")
3. Save as a new invoice (type "new")

Please type your choice: "replace", "cancel", or "new"`,
              invoiceData: responseData,
              timestamp: new Date().toISOString(),
            },
          ]);
          return;
        }
        
        throw new Error(responseData.details || responseData.error || 'Failed to save invoice');
      }

      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Invoice saved successfully! You can now ask questions about the saved invoice.`,
          invoiceData: responseData,
          timestamp: new Date().toISOString(),
        },
      ]);

      // Clear the processed data after saving
      setProcessedInvoiceData(null);
      
      // Trigger a refresh of the invoice list
      triggerRefresh();
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Error saving invoice: ${error.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const handleQuestion = async (question: string) => {
    // User message is already added in handleSubmit, so we don't need to add it again
    try {
      setIsProcessing(true);
      
      // Call the OpenAI-powered API endpoint
      const response = await fetch('/api/chat/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response from AI assistant');
      }
      
      const data = await response.json();
      
      // Add assistant message with the response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      
      // If this was a search request, store the results for follow-up questions
      if (data.invoices) {
        setLastSearchResults(data.invoices);
      }
    } catch (error) {
      console.error('Error processing question:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
        role: 'assistant',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    
    // Clear input
    setInput('');
    
    // Check if we're waiting for a response about a duplicate invoice
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && 
        lastMessage?.content?.includes('I found a duplicate invoice in the database')) {
      
      const userResponse = input.toLowerCase().trim();
      if (userResponse === 'replace') {
        // User wants to replace the existing invoice
        try {
          // Extract the duplicate ID from the message
          const duplicateIdMatch = lastMessage.content.match(/Existing Invoice:\s*-\s*Invoice Number: ([A-Z0-9-]+)/);
          if (duplicateIdMatch) {
            const invoiceNumber = duplicateIdMatch[1];
            
            // Find the invoice by number
            const findResponse = await fetch(`/api/invoices/find-by-number?number=${encodeURIComponent(invoiceNumber)}`);
            if (!findResponse.ok) {
              throw new Error('Failed to find the duplicate invoice');
            }
            
            const duplicateInvoice = await findResponse.json();
            
            // Delete the duplicate invoice
            const deleteResponse = await fetch(`/api/invoices/${duplicateInvoice.id}`, {
              method: 'DELETE',
            });
            
            if (!deleteResponse.ok) {
              throw new Error('Failed to delete the duplicate invoice');
            }
            
            // Now save the new invoice
            await saveInvoice();
            
            setMessages(prev => [
              ...prev,
              {
                id: Date.now().toString(),
                role: 'assistant',
                content: `I've replaced the existing invoice with the new one. The old invoice has been deleted.`,
                timestamp: new Date().toISOString(),
              }
            ]);
          } else {
            // If we can't extract the invoice number, just try to save with forceSave
            await saveInvoice(true);
          }
        } catch (error) {
          console.error('Error replacing invoice:', error);
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: `Error replacing invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date().toISOString(),
            }
          ]);
        }
        setAwaitingSaveConfirmation(false);
      } else if (userResponse === 'cancel') {
        // User doesn't want to save the duplicate
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'Invoice save cancelled. You can try uploading a different invoice.',
            timestamp: new Date().toISOString(),
          }
        ]);
        setAwaitingSaveConfirmation(false);
      } else if (userResponse === 'new') {
        // User wants to save as a new invoice
        // Modify the invoice number to make it unique
        const modifiedInvoiceData = {
          ...processedInvoiceData,
          invoiceNumber: `${processedInvoiceData.invoiceNumber}-${Date.now()}`
        };
        setProcessedInvoiceData(modifiedInvoiceData);
        await saveInvoice();
        setAwaitingSaveConfirmation(false);
      } else {
        // Invalid response
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'Please respond with "replace" to replace the existing invoice, "cancel" to cancel saving, or "new" to save as a new invoice.',
            timestamp: new Date().toISOString(),
          }
        ]);
      }
      return;
    }
    
    // Process the message
    try {
      // If awaiting save confirmation, handle the response
      if (awaitingSaveConfirmation) {
        const response = input.toLowerCase().trim();
        if (response === 'yes') {
          saveInvoice();
        } else if (response === 'no') {
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: 'Invoice not saved. You can still ask me questions about the processed invoice, but it won\'t be saved to your database.',
              timestamp: new Date().toISOString(),
            },
          ]);
          setAwaitingSaveConfirmation(false);
          setCurrentInvoiceData(processedInvoiceData);
        } else {
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: 'Please answer with "yes" or "no" to confirm if you want to save this invoice.',
              timestamp: new Date().toISOString(),
            },
          ]);
        }
        return;
      }
      
      // Check if this is a delete invoice request
      if (input.toLowerCase().includes('delete invoice') || 
          input.toLowerCase().includes('remove invoice') ||
          input.toLowerCase().includes('delete an invoice')) {
        // For delete requests, we don't need to check for currentInvoiceData or processedInvoiceData
        try {
          setIsProcessing(true);
          
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: 'invoice-assistant',
              messages: [
                { role: 'user', content: input }
              ],
              selectedChatModel: 'gpt-4o',
              isInvoiceAssistant: true
            }),
          });
          
          if (!response.ok) {
            throw new Error('Failed to get response from AI assistant');
          }
          
          const data = await response.json();
          
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: data.response,
              timestamp: new Date().toISOString(),
            },
          ]);
        } catch (error) {
          console.error('Error getting AI response:', error);
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: 'Sorry, I encountered an error while processing your request. Please try again.',
              timestamp: new Date().toISOString(),
            },
          ]);
        } finally {
          setIsProcessing(false);
        }
        return;
      }
      
      // Check if this is a response to the "process this invoice" question
      if (lastMessage?.role === 'assistant' && 
          lastMessage?.content?.includes('Would you like me to process this invoice')) {
        
        const userResponse = input.toLowerCase().trim();
        if (userResponse === 'yes' && selectedFile) {
          processInvoice(selectedFile);
          setSelectedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } else if (userResponse === 'no') {
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: 'No problem. You can select a different file or ask me a question about your invoices.',
              timestamp: new Date().toISOString(),
            },
          ]);
          setSelectedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } else {
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: 'Please answer with "yes" or "no" to confirm if you want to process this invoice.',
              timestamp: new Date().toISOString(),
            },
          ]);
        }
        return;
      }
      
      // If the message contains "process" and we have a file, process it
      if (input.toLowerCase().includes('process') && selectedFile) {
        processInvoice(selectedFile);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else if (input.toLowerCase().includes('process') && !selectedFile) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'Please select a file first before asking me to process it.',
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        // Handle questions about the invoice
        handleQuestion(input);
      }
    } catch (error) {
      console.error('Error handling submit:', error);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'An error occurred while processing your request. Please try again later.',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Invoice Assistant</h2>
        <p className="text-sm text-gray-500">Upload and process invoices with AI</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="flex items-start mb-1">
                {message.role === 'user' ? (
                  <User className="h-4 w-4 mr-2 mt-0.5" />
                ) : (
                  <Bot className="h-4 w-4 mr-2 mt-0.5" />
                )}
                <p className="whitespace-pre-line">{message.content}</p>
              </div>
              {message.file && (
                <div className="mt-2 text-sm flex items-center">
                  <Upload className="h-4 w-4 mr-1" />
                  <span>{message.file.name}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <Upload className="h-4 w-4 mr-2" />
              Select File
            </Button>
            {selectedFile && (
              <span className="text-sm text-gray-500 truncate max-w-[200px]">
                {selectedFile.name}
              </span>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={awaitingSaveConfirmation 
                ? "Type 'yes' to save or 'no' to skip saving..." 
                : "Type a message or ask to process the invoice..."}
              disabled={isProcessing}
            />
            <Button type="submit" disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
} 