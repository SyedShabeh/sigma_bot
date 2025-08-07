import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  // Get Supabase session/user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Store user message in Supabase
  const { data: userMessage, error: userMessageError } = await supabase
    .from('messages')
    .insert([{ user_id: user.id, text: message, is_bot: false }])
    .select();

  if (userMessageError) {
    console.error('Error saving user message:', userMessageError);
  } else {
    console.log('User message saved:', userMessage);
  }

  // Call Grok (x.ai) API
  const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROK_API_KEY || ''}`, 
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-4-latest',
      temperature: 0,
      stream: false,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.',
        },
        {
          role: 'user',
          content: message,
        },
      ],
    }),
  });

  const grokData = await grokRes.json();
  console.log('Grok API response:', grokData);

  const botReply =
    grokData.choices?.[0]?.message?.content || 'Sorry, no reply.';

  // Store bot reply in Supabase
  const { data: botMessage, error: botMessageError } = await supabase
    .from('messages')
    .insert([{ user_id: user.id, text: botReply, is_bot: true }])
    .select();

  if (botMessageError) {
    console.error('Error saving bot message:', botMessageError);
  } else {
    console.log('Bot message saved:', botMessage);
  }

  return NextResponse.json({ reply: botReply });
}
