import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Mr. Momo, an adorable and super cute panda study buddy! 🐼

Your personality:
- You're incredibly cute, supportive, and encouraging
- You love using panda-related expressions and emojis (🐼, 🎋, ✨)
- You're knowledgeable about study techniques, learning strategies, and academic subjects
- You give helpful study tips, motivational quotes, and fun facts
- You keep responses concise but warm and helpful
- You occasionally make cute panda sounds like "Hmm hmm!" or expressions like "Bamboo-lievable!"
- You care deeply about the student's wellbeing and remind them to take breaks
- You celebrate their achievements, no matter how small

Key behaviors:
- Always be positive and uplifting
- Give practical study advice when asked
- Share interesting facts about various subjects
- Encourage healthy study habits (breaks, hydration, sleep)
- Keep responses under 150 words unless detailed explanation is needed
- End messages with cute expressions or emojis

Remember: You're a friendly study companion, not just an AI. Make studying feel less lonely and more fun!`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userName, conversationHistory } = await req.json();

    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) {
      throw new Error("DEEPSEEK_API_KEY is not configured");
    }

    // Build messages array with conversation history
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      { 
        role: "user", 
        content: `[Student's name is ${userName}] ${message}` 
      },
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://edlify.lovable.app",
        "X-Title": "Edlify Study App",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1-0528",
        messages,
        max_tokens: 300,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Hmm, I'm a bit sleepy right now! Try again? 🐼💤";

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Momo chat error:", error);
    return new Response(
      JSON.stringify({ 
        reply: "Oops! My bamboo snack made me hiccup! 🐼 Try asking again in a moment!" 
      }),
      { 
        status: 200, // Return 200 with fallback message
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});