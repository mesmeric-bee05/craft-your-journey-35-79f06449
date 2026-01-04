/**
 * Input Validation Schemas for Edge Functions
 * Uses Zod for type-safe validation
 * 
 * SECURITY: All user inputs MUST be validated before processing
 * - Prevents injection attacks
 * - Ensures data integrity
 * - Provides clear error messages
 */

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// ============ Common Validators ============

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z.string()
  .email('Invalid email address')
  .max(255, 'Email must be under 255 characters')
  .transform(val => val.toLowerCase().trim());

export const phoneSchema = z.string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format (E.164 required)')
  .max(16, 'Phone number too long');

// ============ Generate Content Endpoint ============

export const GenerateContentSchema = z.object({
  prompt: z.string()
    .min(1, 'Prompt is required')
    .max(5000, 'Prompt must be under 5000 characters')
    .transform(val => val.trim()),
  contentType: z.enum([
    'caption', 'description', 'email', 'sms', 
    'blog', 'ad_copy', 'hashtags'
  ]).optional().default('caption'),
  language: z.enum(['en', 'sw', 'sheng']).optional().default('en'),
  tone: z.enum([
    'professional', 'casual', 'friendly', 
    'formal', 'humorous', 'urgent'
  ]).optional().default('professional'),
  platform: z.enum([
    'whatsapp', 'instagram', 'facebook', 
    'tiktok', 'twitter', 'email'
  ]).optional(),
}).strict(); // Reject unexpected fields

export type GenerateContentInput = z.infer<typeof GenerateContentSchema>;

// ============ Suggest Reply Endpoint ============

const MessageSchema = z.object({
  content: z.string().max(5000, 'Message content too long').nullable(),
  sender_type: z.enum(['customer', 'agent', 'system', 'bot']),
});

export const SuggestReplySchema = z.object({
  messages: z.array(MessageSchema)
    .min(1, 'At least one message is required')
    .max(50, 'Too many messages provided'),
  customerName: z.string()
    .max(100, 'Customer name too long')
    .optional()
    .transform(val => val?.trim()),
  businessContext: z.string()
    .max(1000, 'Business context too long')
    .optional()
    .transform(val => val?.trim()),
}).strict();

export type SuggestReplyInput = z.infer<typeof SuggestReplySchema>;

// ============ Seed Inbox Data Endpoint ============

export const SeedDataSchema = z.object({
  business_id: uuidSchema,
}).strict();

export type SeedDataInput = z.infer<typeof SeedDataSchema>;

// ============ Send Email Endpoint ============

export const SendEmailSchema = z.object({
  to: emailSchema,
  subject: z.string()
    .min(1, 'Subject is required')
    .max(200, 'Subject must be under 200 characters')
    .transform(val => val.trim()),
  body: z.string()
    .min(1, 'Body is required')
    .max(50000, 'Body must be under 50000 characters'),
  html: z.boolean().optional().default(false),
  conversationId: uuidSchema.optional(),
  replyTo: emailSchema.optional(),
}).strict();

export type SendEmailInput = z.infer<typeof SendEmailSchema>;

// ============ Send SMS Endpoint ============

export const SendSmsSchema = z.object({
  to: phoneSchema,
  body: z.string()
    .min(1, 'Message is required')
    .max(1600, 'Message must be under 1600 characters (10 SMS segments)')
    .transform(val => val.trim()),
  conversationId: uuidSchema.optional(),
}).strict();

export type SendSmsInput = z.infer<typeof SendSmsSchema>;

// ============ Validation Helper ============

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: Response;
}

/**
 * Validate request body against a Zod schema
 * Returns validated data or error response
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  corsHeaders: Record<string, string>
): ValidationResult<T> {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    
    return {
      success: false,
      error: new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input provided',
            details: errors,
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      ),
    };
  }
  
  return { success: true, data: result.data };
}

/**
 * Safely parse JSON request body
 * Returns parsed data or error response
 */
export async function parseJsonBody(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<{ data?: unknown; error?: Response }> {
  try {
    const text = await req.text();
    
    // SECURITY: Limit request body size (1MB)
    if (text.length > 1024 * 1024) {
      return {
        error: new Response(
          JSON.stringify({
            error: {
              code: 'PAYLOAD_TOO_LARGE',
              message: 'Request body too large (max 1MB)',
            },
          }),
          {
            status: 413,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        ),
      };
    }
    
    if (!text) {
      return { data: {} };
    }
    
    const data = JSON.parse(text);
    return { data };
  } catch {
    return {
      error: new Response(
        JSON.stringify({
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid JSON in request body',
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      ),
    };
  }
}
