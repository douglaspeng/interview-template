import {
  type Message,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';

import { auth } from '@/app/(auth)/auth';
import { myProvider } from '@/lib/ai/models';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';
import { getMostRecentUserMessage, sanitizeResponseMessages } from '@/lib/chat-utils';

import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';

// Add this function to handle invoice deletion
async function deleteInvoiceByNumber(invoiceNumber: string) {
  try {
    console.log(`Looking for invoice with number: ${invoiceNumber}`);
    
    // Get the base URL with fallback
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
    console.log(`Using base URL: ${baseUrl}`);
    
    // First, find the invoice by number
    const findUrl = `${baseUrl}/api/invoices/find-by-number?number=${encodeURIComponent(invoiceNumber)}`;
    console.log(`Find URL: ${findUrl}`);
    
    const findResponse = await fetch(findUrl);
    
    if (!findResponse.ok) {
      const errorData = await findResponse.json();
      console.error(`Error finding invoice: ${JSON.stringify(errorData)}`);
      return { success: false, message: errorData.error || 'Failed to find invoice' };
    }
    
    const invoice = await findResponse.json();
    console.log(`Found invoice: ${JSON.stringify(invoice)}`);
    
    // Then delete the invoice by ID
    const deleteUrl = `${baseUrl}/api/invoices/${invoice.id}`;
    console.log(`Delete URL: ${deleteUrl}`);
    
    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
    });
    
    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json();
      console.error(`Error deleting invoice: ${JSON.stringify(errorData)}`);
      return { success: false, message: errorData.error || 'Failed to delete invoice' };
    }
    
    return { success: true, message: 'Invoice deleted successfully' };
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return { success: false, message: `An error occurred while deleting the invoice: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Update the system prompt to include the delete invoice functionality
const invoiceSystemPrompt = `You are an AI assistant for an invoice management system. You can help users with the following tasks:

1. Upload and process invoices
2. View and search invoices
3. Edit invoice details
4. Delete invoices
5. Answer questions about invoices and the system

For invoice deletion, ask the user for the invoice number they want to delete. Once they provide the invoice number, use the deleteInvoiceByNumber function to delete the invoice.

When helping users, be friendly, professional, and concise. If you're not sure about something, ask for clarification.

When an invoice is processed, you should display the token usage information to the user, showing how many tokens were used and the estimated cost.`;

export const maxDuration = 60;

// Store conversation state for invoice assistant
let invoiceConversationHistory: { role: 'user' | 'assistant', content: string }[] = [];
let currentInvoiceNumber: string | null = null;

export async function POST(request: Request) {
  const {
    id,
    messages,
    selectedChatModel,
    isInvoiceAssistant,
  }: { 
    id: string; 
    messages: Array<Message>; 
    selectedChatModel: string;
    isInvoiceAssistant?: boolean;
  } = await request.json();

  // Handle invoice assistant separately
  if (isInvoiceAssistant) {
    try {
      const userMessage = messages[messages.length - 1]?.content || '';
      
      if (!userMessage) {
        return new Response(JSON.stringify({ error: 'Message is required' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Add user message to conversation history
      invoiceConversationHistory.push({ role: 'user', content: userMessage });
      
      // Check if the message contains an invoice number
      const invoiceNumberMatch = userMessage.match(/invoice (?:number )?([A-Z0-9-]+)/i) || 
                                userMessage.match(/([A-Z0-9-]+)/i);
      if (invoiceNumberMatch) {
        currentInvoiceNumber = invoiceNumberMatch[1];
        console.log('Extracted invoice number:', currentInvoiceNumber);
      }
      
      // Check if the user wants to delete an invoice
      if (userMessage.toLowerCase().includes('delete invoice') || 
          userMessage.toLowerCase().includes('remove invoice') || 
          userMessage.toLowerCase().includes('delete an invoice')) {
        
        // If we already have an invoice number, delete it
        if (currentInvoiceNumber) {
          console.log('Attempting to delete invoice:', currentInvoiceNumber);
          const result = await deleteInvoiceByNumber(currentInvoiceNumber);
          console.log('Delete result:', result);
          const response = result.success 
            ? `I've deleted invoice ${currentInvoiceNumber} for you.`
            : `I couldn't delete the invoice: ${result.message}`;
          
          // Add assistant response to conversation history
          invoiceConversationHistory.push({ role: 'assistant', content: response });
          
          return new Response(JSON.stringify({ response }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Otherwise, ask for the invoice number
        const response = "Please provide the invoice number you'd like to delete.";
        
        // Add assistant response to conversation history
        invoiceConversationHistory.push({ role: 'assistant', content: response });
        
        return new Response(JSON.stringify({ response }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Check if the message is about processing an invoice
      if (userMessage.toLowerCase().includes('process invoice') || 
          userMessage.toLowerCase().includes('upload invoice') || 
          userMessage.toLowerCase().includes('scan invoice')) {
        
        // For other messages, use OpenAI to generate a response
        const openai = new (await import('openai')).default;
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: invoiceSystemPrompt },
            ...invoiceConversationHistory
          ],
          temperature: 0.7,
          max_tokens: 500,
        });
        
        let response = completion.choices[0].message.content || 'I apologize, but I could not generate a response.';
        
        // Add token usage information to the response
        if (completion.usage) {
          const promptTokens = completion.usage.prompt_tokens || 0;
          const completionTokens = completion.usage.completion_tokens || 0;
          const totalTokens = completion.usage.total_tokens || 0;
          
          // Calculate cost (approximate)
          const promptCost = (promptTokens / 1000) * 0.01; // $0.01 per 1K tokens for input
          const completionCost = (completionTokens / 1000) * 0.03; // $0.03 per 1K tokens for output
          const totalCost = promptCost + completionCost;
          
          response += `\n\n**Token Usage Information:**\n`;
          response += `- Prompt Tokens: ${promptTokens}\n`;
          response += `- Completion Tokens: ${completionTokens}\n`;
          response += `- Total Tokens: ${totalTokens}\n`;
          response += `- Estimated Cost: $${totalCost.toFixed(4)}\n`;
        }
        
        // Add assistant response to conversation history
        invoiceConversationHistory.push({ role: 'assistant', content: response });
        
        return new Response(JSON.stringify({ response }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // For other messages, use OpenAI to generate a response
      const openai = new (await import('openai')).default;
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: invoiceSystemPrompt },
          ...invoiceConversationHistory
        ],
        temperature: 0.7,
        max_tokens: 500,
      });
      
      const response = completion.choices[0].message.content || 'I apologize, but I could not generate a response.';
      
      // Add assistant response to conversation history
      invoiceConversationHistory.push({ role: 'assistant', content: response });
      
      return new Response(JSON.stringify({ response }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error in invoice chat API:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to process chat message' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Original chat functionality
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userMessage = getMostRecentUserMessage(messages);

  if (!userMessage) {
    return new Response('No user message found', { status: 400 });
  }

  const chat = await getChatById({ id });

  if (!chat) {
    const title = await generateTitleFromUserMessage({ message: userMessage });
    await saveChat({ id, userId: session.user.id, title });
  }

  await saveMessages({
    messages: [{ ...userMessage, createdAt: new Date(), chatId: id }],
  });

  return createDataStreamResponse({
    execute: (dataStream) => {
      const result = streamText({
        model: myProvider.languageModel(selectedChatModel),
        system: systemPrompt({ selectedChatModel }),
        messages,
        maxSteps: 5,
        experimental_activeTools:
          selectedChatModel === 'chat-model-reasoning'
            ? []
            : [
                'getWeather',
                'createDocument',
                'updateDocument',
                'requestSuggestions',
              ],
        experimental_transform: smoothStream({ chunking: 'word' }),
        experimental_generateMessageId: generateUUID,
        tools: {
          getWeather,
          createDocument: createDocument({ session, dataStream }),
          updateDocument: updateDocument({ session, dataStream }),
          requestSuggestions: requestSuggestions({
            session,
            dataStream,
          }),
        },
        onFinish: async ({ response, reasoning }) => {
          if (session.user?.id) {
            try {
              const sanitizedResponseMessages = sanitizeResponseMessages(response.messages);

              await saveMessages({
                messages: sanitizedResponseMessages.map((message) => {
                  return {
                    id: message.id,
                    chatId: id,
                    role: message.role,
                    content: message.content,
                    createdAt: new Date(),
                  };
                }),
              });
            } catch (error) {
              console.error('Failed to save chat');
            }
          }
        },
        experimental_telemetry: {
          isEnabled: true,
          functionId: 'stream-text',
        },
      });

      result.mergeIntoDataStream(dataStream, {
        sendReasoning: true,
      });
    },
    onError: () => {
      return 'Oops, an error occured!';
    },
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}
