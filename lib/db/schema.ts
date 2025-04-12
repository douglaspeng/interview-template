import {
  sqliteTable,
  text,
  integer,
  blob,
  foreignKey,
  primaryKey,
  real,
} from 'drizzle-orm/sqlite-core';
import type { InferSelectModel } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const chat = sqliteTable('Chat', {
  id: text('id').primaryKey().notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  title: text('title').notNull(),
  visibility: text('visibility')
    .notNull()
    .default('private')
    .$type<'public' | 'private'>(),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = sqliteTable('Message', {
  id: text('id').primaryKey().notNull(),
  chatId: text('chatId')
    .notNull()
    .references(() => chat.id),
  role: text('role').notNull(),
  content: blob('content', { mode: 'json' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
});

export type Message = InferSelectModel<typeof message>;

export const vote = sqliteTable(
  'Vote',
  {
    chatId: text('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: text('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: integer('isUpvoted', { mode: 'boolean' }).notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = sqliteTable(
  'Document',
  {
    id: text('id').notNull(),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: text('kind')
      .notNull()
      .default('text')
      .$type<'text' | 'code' | 'image' | 'sheet'>(),
    userId: text('userId').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = sqliteTable(
  'Suggestion',
  {
    id: text('id').notNull(),
    documentId: text('documentId').notNull(),
    documentCreatedAt: integer('documentCreatedAt', {
      mode: 'timestamp',
    }).notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: integer('isResolved', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey(() => ({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    })),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const invoice = sqliteTable('Invoice', {
  id: text('id').primaryKey().notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
  customerName: text('customerName').notNull(),
  vendorName: text('vendorName').notNull(),
  invoiceNumber: text('invoiceNumber').notNull(),
  invoiceDate: integer('invoiceDate', { mode: 'timestamp' }).notNull(),
  dueDate: integer('dueDate', { mode: 'timestamp' }),
  amount: integer('amount').notNull(), // Stored in cents
  currency: text('currency').default('USD'), // Default to USD if not specified
  status: text('status').notNull().$type<'pending' | 'processed' | 'error'>(),
  originalFileUrl: text('originalFileUrl').notNull(),
  confidence: integer('confidence'), // AI confidence score
  extractionMethod: text('extraction_method'),
  processingErrors: text('processing_errors'),
});

export const invoiceLineItem = sqliteTable('InvoiceLineItem', {
  id: text('id').primaryKey().notNull(),
  invoiceId: text('invoiceId')
    .notNull()
    .references(() => invoice.id),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unitPrice').notNull(), // Stored in cents
  amount: integer('amount').notNull(), // Stored in cents
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
});

export const tokenUsage = sqliteTable('tokenUsage', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  promptTokens: integer('promptTokens').notNull(),
  completionTokens: integer('completionTokens').notNull(),
  totalTokens: integer('totalTokens').notNull(),
  cost: real('cost').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  operation: text('operation').notNull(),
  invoiceId: text('invoiceId').references(() => invoice.id),
  cached: integer('cached', { mode: 'boolean' }).notNull().default(false),
  cacheKey: text('cacheKey'),
  cacheHit: integer('cacheHit', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('createdAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const promptCache = sqliteTable('promptCache', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  promptHash: text('promptHash').notNull().unique(),
  prompt: text('prompt').notNull(),
  result: text('result').notNull(),
  tokenUsage: text('tokenUsage').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export type Invoice = InferSelectModel<typeof invoice> & {
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  } | null;
};

export type InvoiceLineItem = InferSelectModel<typeof invoiceLineItem>;
export type TokenUsage = InferSelectModel<typeof tokenUsage>;
