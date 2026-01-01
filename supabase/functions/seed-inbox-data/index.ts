import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const channelTypes = ['whatsapp', 'instagram', 'facebook', 'tiktok', 'twitter', 'telegram'] as const;

const sampleNames = [
  'Alice Wanjiku', 'Brian Ochieng', 'Catherine Mwangi', 'David Kimani', 'Emily Achieng',
  'Faith Njeri', 'George Otieno', 'Hannah Wambui', 'Isaac Maina', 'Jane Kamau',
  'Kevin Omondi', 'Lucy Nyambura', 'Michael Kiprop', 'Nancy Adhiambo', 'Peter Mutua'
];

const sampleMessages = [
  { customer: "Hi! I saw your products on Instagram. Do you deliver to Westlands?", agent: "Hello! Yes, we deliver to Westlands. Delivery takes 1-2 business days. How can I help you today?" },
  { customer: "What's the price for the large package?", agent: "The large package is KES 2,500. We're currently offering free delivery for orders above KES 3,000!" },
  { customer: "I placed an order 3 days ago but haven't received it", agent: "I apologize for the delay. Let me check the status of your order. Could you please share your order number?" },
  { customer: "Do you have this in blue?", agent: "Yes! We have it in navy blue, sky blue, and royal blue. Which shade would you prefer?" },
  { customer: "Can I pay on delivery?", agent: "Absolutely! We accept cash on delivery and M-Pesa on delivery. Which would you prefer?" },
  { customer: "Your product broke after 2 weeks", agent: "I'm really sorry to hear that. We have a 30-day warranty. Please send photos and we'll arrange a replacement." },
  { customer: "What time do you close?", agent: "Our customer service is available Monday-Saturday 8AM-8PM. For orders, you can place them anytime online." },
  { customer: "I want to order 50 pieces for my shop", agent: "Great! For bulk orders, we offer special wholesale prices. Let me connect you with our sales team." },
  { customer: "How do I track my order?", agent: "You can track your order using the link we sent via SMS. I can also check the status for you right now." },
  { customer: "Is this original or fake?", agent: "All our products are 100% authentic with original packaging. We provide receipts and warranty cards." },
];

const quickReplies = [
  { title: "Greeting", content: "Hello! Thank you for reaching out. How can I assist you today?", shortcut: "/hello", category: "General" },
  { title: "Delivery Info", content: "We deliver within Nairobi in 1-2 business days. Delivery is free for orders above KES 3,000.", shortcut: "/delivery", category: "Shipping" },
  { title: "Payment Options", content: "We accept M-Pesa, Cash on Delivery, and card payments. Which payment method would you prefer?", shortcut: "/payment", category: "Payments" },
  { title: "Return Policy", content: "We offer a 30-day return policy for unused items in original packaging. Would you like to initiate a return?", shortcut: "/return", category: "Returns" },
  { title: "Thank You", content: "Thank you for your purchase! We hope you enjoy your product. Don't hesitate to reach out if you need anything.", shortcut: "/thanks", category: "General" },
  { title: "Out of Stock", content: "Unfortunately, this item is currently out of stock. We expect new stock in 3-5 days. Would you like to be notified?", shortcut: "/oos", category: "Products" },
  { title: "Business Hours", content: "Our customer service is available Monday-Saturday, 8AM-8PM EAT. For urgent matters, please call our hotline.", shortcut: "/hours", category: "General" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    const { business_id } = await req.json();
    
    if (!business_id) {
      throw new Error("business_id is required");
    }

    // Create sample customers
    const customers = [];
    for (let i = 0; i < 15; i++) {
      const name = sampleNames[i];
      const channel = channelTypes[i % channelTypes.length];
      
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          business_id,
          name,
          channel_type: channel,
          email: i % 3 === 0 ? `${name.toLowerCase().replace(' ', '.')}@email.com` : null,
          phone: i % 2 === 0 ? `+2547${Math.floor(10000000 + Math.random() * 90000000)}` : null,
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
          tags: i % 4 === 0 ? ['VIP'] : i % 3 === 0 ? ['New'] : [],
          notes: i % 5 === 0 ? 'Frequent buyer, prefers WhatsApp communication' : null,
        })
        .select()
        .single();

      if (error) throw error;
      customers.push(customer);
    }

    // Create conversations and messages
    const statuses = ['open', 'open', 'open', 'open', 'pending', 'pending', 'pending', 'resolved', 'resolved', 'archived'] as const;
    const priorities = ['normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'high', 'high', 'low', 'urgent'] as const;

    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      const status = statuses[i % statuses.length];
      const priority = priorities[i % priorities.length];
      const msgPair = sampleMessages[i % sampleMessages.length];
      
      const daysAgo = Math.floor(Math.random() * 7);
      const hoursAgo = Math.floor(Math.random() * 24);
      const lastMessageAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - hoursAgo * 60 * 60 * 1000);

      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          business_id,
          customer_id: customer.id,
          channel_type: customer.channel_type,
          status,
          priority,
          last_message_at: lastMessageAt.toISOString(),
          last_message_preview: msgPair.agent.substring(0, 100),
          unread_count: status === 'open' ? Math.floor(Math.random() * 3) : 0,
          tags: i % 5 === 0 ? ['Urgent'] : i % 4 === 0 ? ['Follow-up'] : [],
        })
        .select()
        .single();

      if (convError) throw convError;

      // Create messages for this conversation
      const messageTime = new Date(lastMessageAt.getTime() - 30 * 60 * 1000);
      
      // Customer message
      await supabase.from('messages').insert({
        conversation_id: conversation.id,
        content: msgPair.customer,
        sender_type: 'customer',
        content_type: 'text',
        status: 'delivered',
        created_at: messageTime.toISOString(),
      });

      // Agent response
      await supabase.from('messages').insert({
        conversation_id: conversation.id,
        content: msgPair.agent,
        sender_type: 'agent',
        content_type: 'text',
        status: 'read',
        created_at: lastMessageAt.toISOString(),
      });

      // Add extra messages for some conversations
      if (i % 3 === 0) {
        const extraMsgs = sampleMessages[(i + 1) % sampleMessages.length];
        const extraTime = new Date(lastMessageAt.getTime() + 5 * 60 * 1000);
        
        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          content: extraMsgs.customer,
          sender_type: 'customer',
          content_type: 'text',
          status: 'delivered',
          created_at: extraTime.toISOString(),
        });
      }
    }

    // Create quick replies
    for (const reply of quickReplies) {
      await supabase.from('quick_replies').insert({
        business_id,
        ...reply,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created ${customers.length} customers, ${customers.length} conversations, and ${quickReplies.length} quick replies` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
