/**
 * Support Ticket Webhook Edge Function
 * Handles incoming webhooks for support ticket operations
 * Creates tickets from external sources and sends notifications
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createServiceClient } from '../_shared/auth.ts';
import { getCorsHeaders, secureResponse } from '../_shared/security-headers.ts';
import { badRequest, internalError, logError, logSecurityEvent } from '../_shared/errors.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Input validation schemas
const CreateTicketWebhookSchema = z.object({
  event: z.literal('ticket.create'),
  source: z.enum(['email', 'chat', 'api', 'form']),
  business_id: z.string().uuid(),
  user_email: z.string().email(),
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  category: z.enum(['technical', 'billing', 'feature_request', 'bug_report', 'general']).default('general'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    type: z.string(),
    size: z.number(),
  })).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const UpdateTicketWebhookSchema = z.object({
  event: z.literal('ticket.update'),
  ticket_id: z.string().uuid(),
  status: z.enum(['open', 'in_progress', 'waiting_response', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assigned_to: z.string().uuid().optional(),
  internal_note: z.string().max(2000).optional(),
});

const EscalateTicketWebhookSchema = z.object({
  event: z.literal('ticket.escalate'),
  ticket_id: z.string().uuid(),
  reason: z.string().max(500),
  escalate_to: z.string().uuid().optional(),
});

const WebhookSchema = z.discriminatedUnion('event', [
  CreateTicketWebhookSchema,
  UpdateTicketWebhookSchema,
  EscalateTicketWebhookSchema,
]);

type WebhookPayload = z.infer<typeof WebhookSchema>;

// Verify webhook signature (if secret is configured)
async function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string | null
): Promise<boolean> {
  if (!secret || !signature) {
    return true; // Skip verification if not configured
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );
    
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return signature === expectedSignature || signature === `sha256=${expectedSignature}`;
  } catch {
    return false;
  }
}

serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders('*', origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return badRequest('Method not allowed', corsHeaders);
  }

  try {
    const rawBody = await req.text();
    
    // Verify webhook signature
    const signature = req.headers.get('x-webhook-signature');
    const webhookSecret = Deno.env.get('SUPPORT_WEBHOOK_SECRET') || null;
    
    const isValid = await verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      logSecurityEvent('INVALID_WEBHOOK_SIGNATURE', {
        signature,
        source: req.headers.get('x-webhook-source'),
      });
      return badRequest('Invalid webhook signature', corsHeaders);
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return badRequest('Invalid JSON body', corsHeaders);
    }

    const validation = WebhookSchema.safeParse(body);
    if (!validation.success) {
      return badRequest('Validation failed', corsHeaders, validation.error.errors);
    }

    const payload: WebhookPayload = validation.data;
    const serviceClient = createServiceClient();

    logSecurityEvent('SUPPORT_WEBHOOK_RECEIVED', {
      event: payload.event,
      timestamp: new Date().toISOString(),
    });

    switch (payload.event) {
      case 'ticket.create': {
        // Find user by email
        const { data: userData } = await serviceClient.auth.admin.listUsers();
        const user = userData?.users?.find(u => u.email === payload.user_email);

        if (!user) {
          logError('USER_NOT_FOUND', { email: payload.user_email });
          return badRequest('User not found', corsHeaders);
        }

        // Create the support ticket
        const { data: ticket, error: ticketError } = await serviceClient
          .from('support_tickets')
          .insert({
            business_id: payload.business_id,
            user_id: user.id,
            subject: payload.subject,
            description: payload.description,
            category: payload.category,
            priority: payload.priority,
            attachments: payload.attachments || [],
            metadata: {
              ...payload.metadata,
              source: payload.source,
              created_via_webhook: true,
            },
          })
          .select()
          .single();

        if (ticketError) {
          logError('CREATE_TICKET_ERROR', ticketError);
          return internalError(corsHeaders);
        }

        // Auto-assign based on category (if configured)
        const categoryAssignments: Record<string, string | null> = {
          technical: null, // Could be configured via business settings
          billing: null,
          bug_report: null,
        };

        const autoAssignTo = categoryAssignments[payload.category];
        if (autoAssignTo) {
          await serviceClient
            .from('support_tickets')
            .update({ assigned_to: autoAssignTo })
            .eq('id', ticket.id);
        }

        // Notify user that ticket was created
        await serviceClient
          .from('notifications')
          .insert({
            business_id: payload.business_id,
            user_id: user.id,
            type: 'status_change',
            title: 'Support Ticket Created',
            body: `Your ticket "${payload.subject}" has been received. We'll respond within 24 hours.`,
            data: {
              ticket_id: ticket.id,
              subject: payload.subject,
              category: payload.category,
              priority: payload.priority,
            },
          });

        // Notify admins about high/urgent priority tickets
        if (payload.priority === 'high' || payload.priority === 'urgent') {
          const { data: admins } = await serviceClient
            .from('user_roles')
            .select('user_id')
            .eq('role', 'admin');

          if (admins) {
            for (const admin of admins) {
              await serviceClient
                .from('notifications')
                .insert({
                  business_id: payload.business_id,
                  user_id: admin.user_id,
                  type: 'status_change',
                  title: `${payload.priority.toUpperCase()} Priority Ticket`,
                  body: `New ${payload.priority} priority ticket: ${payload.subject}`,
                  data: {
                    ticket_id: ticket.id,
                    priority: payload.priority,
                  },
                });
            }
          }
        }

        logSecurityEvent('TICKET_CREATED_VIA_WEBHOOK', {
          ticketId: ticket.id,
          source: payload.source,
          userId: user.id,
          priority: payload.priority,
        });

        return secureResponse(
          JSON.stringify({
            success: true,
            ticket: {
              id: ticket.id,
              status: 'open',
              created_at: ticket.created_at,
            },
          }),
          201,
          corsHeaders
        );
      }

      case 'ticket.update': {
        // Verify ticket exists
        const { data: existingTicket, error: findError } = await serviceClient
          .from('support_tickets')
          .select('*')
          .eq('id', payload.ticket_id)
          .maybeSingle();

        if (findError || !existingTicket) {
          return badRequest('Ticket not found', corsHeaders);
        }

        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        if (payload.status) {
          updates.status = payload.status;
          if (payload.status === 'resolved') {
            updates.resolved_at = new Date().toISOString();
          }
        }

        if (payload.priority) {
          updates.priority = payload.priority;
        }

        if (payload.assigned_to) {
          updates.assigned_to = payload.assigned_to;
        }

        // Update ticket
        const { data: updatedTicket, error: updateError } = await serviceClient
          .from('support_tickets')
          .update(updates)
          .eq('id', payload.ticket_id)
          .select()
          .single();

        if (updateError) {
          logError('UPDATE_TICKET_ERROR', updateError);
          return internalError(corsHeaders);
        }

        // Notify user of status change
        if (payload.status && payload.status !== existingTicket.status) {
          await serviceClient
            .from('notifications')
            .insert({
              business_id: existingTicket.business_id,
              user_id: existingTicket.user_id,
              type: 'status_change',
              title: 'Ticket Status Updated',
              body: `Your ticket "${existingTicket.subject}" is now ${payload.status.replace('_', ' ')}`,
              data: {
                ticket_id: payload.ticket_id,
                old_status: existingTicket.status,
                new_status: payload.status,
              },
            });
        }

        // Notify if assigned
        if (payload.assigned_to && payload.assigned_to !== existingTicket.assigned_to) {
          await serviceClient
            .from('notifications')
            .insert({
              business_id: existingTicket.business_id,
              user_id: payload.assigned_to,
              type: 'assignment',
              title: 'Ticket Assigned to You',
              body: `You've been assigned to ticket: ${existingTicket.subject}`,
              data: {
                ticket_id: payload.ticket_id,
                priority: updatedTicket.priority,
              },
            });
        }

        return secureResponse(
          JSON.stringify({
            success: true,
            ticket: {
              id: updatedTicket.id,
              status: updatedTicket.status,
              updated_at: updatedTicket.updated_at,
            },
          }),
          200,
          corsHeaders
        );
      }

      case 'ticket.escalate': {
        // Verify ticket exists
        const { data: ticket, error: findError } = await serviceClient
          .from('support_tickets')
          .select('*')
          .eq('id', payload.ticket_id)
          .maybeSingle();

        if (findError || !ticket) {
          return badRequest('Ticket not found', corsHeaders);
        }

        // Update priority to urgent and optionally reassign
        const updates: Record<string, unknown> = {
          priority: 'urgent',
          updated_at: new Date().toISOString(),
          metadata: {
            ...ticket.metadata,
            escalated: true,
            escalation_reason: payload.reason,
            escalated_at: new Date().toISOString(),
          },
        };

        if (payload.escalate_to) {
          updates.assigned_to = payload.escalate_to;
        }

        const { error: updateError } = await serviceClient
          .from('support_tickets')
          .update(updates)
          .eq('id', payload.ticket_id);

        if (updateError) {
          logError('ESCALATE_TICKET_ERROR', updateError);
          return internalError(corsHeaders);
        }

        // Notify all admins about escalation
        const { data: admins } = await serviceClient
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');

        if (admins) {
          for (const admin of admins) {
            await serviceClient
              .from('notifications')
              .insert({
                business_id: ticket.business_id,
                user_id: admin.user_id,
                type: 'status_change',
                title: '🚨 Ticket Escalated',
                body: `Ticket "${ticket.subject}" has been escalated: ${payload.reason}`,
                data: {
                  ticket_id: payload.ticket_id,
                  reason: payload.reason,
                },
              });
          }
        }

        // Notify the escalation target if specified
        if (payload.escalate_to) {
          await serviceClient
            .from('notifications')
            .insert({
              business_id: ticket.business_id,
              user_id: payload.escalate_to,
              type: 'assignment',
              title: '🚨 Escalated Ticket Assigned',
              body: `You've been assigned an escalated ticket: ${ticket.subject}`,
              data: {
                ticket_id: payload.ticket_id,
                reason: payload.reason,
              },
            });
        }

        logSecurityEvent('TICKET_ESCALATED', {
          ticketId: payload.ticket_id,
          reason: payload.reason,
          escalateTo: payload.escalate_to,
        });

        return secureResponse(
          JSON.stringify({
            success: true,
            message: 'Ticket escalated successfully',
          }),
          200,
          corsHeaders
        );
      }

      default:
        return badRequest('Unknown event type', corsHeaders);
    }

  } catch (error) {
    logError('SUPPORT_WEBHOOK_UNHANDLED', error);
    return internalError(corsHeaders);
  }
});
