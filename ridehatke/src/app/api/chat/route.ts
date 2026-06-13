import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, language } = await req.json();
    const msg = message.toLowerCase();
    const isHindi = language === 'HI';
    
    // Simulate thinking delay for realism
    await new Promise(resolve => setTimeout(resolve, 1500));

    let reply = "";
    let action: string | null = null;
    let pickup: string | null = null;
    let dropoff: string | null = null;

    // ============================================
    // AGENTIC AI: Detect ride search intent
    // ============================================
    
    // English patterns: "ride from X to Y", "cab from X to Y", "check X to Y", "search X to Y", "book from X to Y", "X to Y price"
    const enPatterns = [
      /(?:ride|cab|taxi|check|search|find|book|compare|fare|price|go|travel|drive).*?(?:from)\s+(.+?)\s+(?:to)\s+(.+?)(?:\s*$|\s*\?|\s*please|\s*\.)/i,
      /(?:from)\s+(.+?)\s+(?:to)\s+(.+?)(?:\s+(?:ride|cab|taxi|price|fare|check|search|book|compare)|\s*$|\s*\?|\s*\.)/i,
      /(.+?)\s+(?:to)\s+(.+?)\s+(?:ride|cab|taxi|price|fare|check|search|book|compare|kitna|kितना)/i,
    ];

    // Hindi patterns: "X se Y", "X se Y tak", "X se Y ka kiraya"
    const hiPatterns = [
      /(.+?)\s+(?:se|से)\s+(.+?)(?:\s+(?:tak|तक|ka|का|ki|की|kiraya|किराया|ride|cab|check|price|kitna|कितना|jaana|जाना|book)|\s*$|\s*\?|\s*\.)/i,
    ];

    const allPatterns = [...enPatterns, ...hiPatterns];

    for (const pattern of allPatterns) {
      const match = msg.match(pattern);
      if (match && match[1] && match[2]) {
        pickup = match[1].trim().replace(/^(a |the |my )/i, '');
        dropoff = match[2].trim().replace(/^(a |the |my )/i, '');
        
        // Validate: both locations should be at least 2 chars and not be common words
        const stopWords = ['me', 'i', 'the', 'a', 'is', 'it', 'this', 'that', 'how', 'much', 'what'];
        if (pickup.length >= 2 && dropoff.length >= 2 && 
            !stopWords.includes(pickup.toLowerCase()) && !stopWords.includes(dropoff.toLowerCase())) {
          action = "search_ride";
          reply = isHindi
            ? `🔍 मैं **${pickup}** से **${dropoff}** तक की सवारी खोज रहा हूँ... एक सेकंड रुकिए!`
            : `🔍 Searching rides from **${pickup}** to **${dropoff}**... Hold on!`;
          break;
        }
      }
    }

    // If no ride search detected, fall back to normal chatbot responses
    if (!action) {
      if (msg.includes("cheap") || msg.includes("lowest") || msg.includes("best price") || msg.includes("sasta")) {
        reply = isHindi 
          ? "आम तौर पर, **Rapido** सिंगल राइडर्स (बाइक टैक्सी) के लिए सबसे सस्ता होता है, जबकि **Uber Go** और **Ola Mini** कैब के लिए बजट-फ्रेंडली हैं। लेकिन प्राइसेस ट्रैफ़िक के हिसाब से बदलते रहते हैं, इसलिए हमेशा ऐप पर चेक करें!"
          : "Generally, **Rapido** offers the cheapest prices for single riders (bike taxis), while **Uber Go** and **Ola Mini** are the most budget-friendly options for cabs. However, prices change based on live traffic and surge. Always compare them on our app first!";
      } 
      else if (msg.includes("safe") || msg.includes("safety") || msg.includes("rating") || msg.includes("suraksha")) {
        reply = isHindi
          ? "**BluSmart** की सेफ्टी रेटिंग्स सबसे ज़्यादा हैं क्योंकि उनके ड्राइवर्स प्रोफेशनल होते हैं। **Uber** और **Ola** में भी सुरक्षा के लिए SOS बटन और राइड-ट्रैकिंग होती है।"
          : "**BluSmart** currently has the highest safety ratings and zero surge pricing, with professional drivers. **Uber** and **Ola** also provide SOS buttons and ride-tracking for standard safety.";
      } 
      else if (msg.includes("fast") || msg.includes("quick") || msg.includes("route") || msg.includes("jaldi")) {
        reply = isHindi
          ? "भारी ट्रैफ़िक में, **Rapido** बाइक्स सबसे तेज़ होती हैं। लंबी दूरी के लिए हमारा मैप सिस्टम सबसे बढ़िया हाईवे रूट खोजता है ताकि आप जल्दी पहुँच सकें।"
          : "For heavy traffic, **Rapido** bikes are usually the fastest way to cut through the city. For longer distances, our OpenStreetMap integration finds the most optimal highway route to avoid congestion.";
      } 
      else if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey") || msg.includes("namaste") || msg.includes("नमस्ते")) {
        reply = isHindi
          ? "नमस्ते! 👋 मैं **RideCare AI** हूँ। मैं आपको सबसे अच्छे रूट, कैब के प्राइसेस और रेटिंग्स के बारे में बता सकता हूँ। आप बोलकर भी मुझसे राइड सर्च करवा सकते हैं! बस कहें — **'दिल्ली से आगरा तक राइड चेक करो'**"
          : "Hello there! 👋 I am **RideCare AI**. I can help you find the best routes, compare prices, or give you details about cab ratings. You can also **speak to me**! Just say — **'Check ride from Delhi to Agra'** and I'll search it for you!";
      } 
      else if (msg.includes("ola") || msg.includes("uber") || msg.includes("rapido")) {
        reply = isHindi
          ? "तीनों ही बहुत अच्छे हैं! Uber में सेडान आसानी से मिलती है, Ola शहर के लिए अच्छी है, और Rapido सस्ते सफर (बाइक/ऑटो) के लिए बेस्ट है। लाइव प्राइस देखने के लिए 'Compare' बटन दबाएं!"
          : "All three providers are great! Uber often has better sedan availability, Ola is great for quick city rides, and Rapido is perfect for budget travel on bikes or autos. Use the Compare button to see live differences!";
      }
      else if (msg.includes("voice") || msg.includes("mic") || msg.includes("speak") || msg.includes("bolo") || msg.includes("awaz")) {
        reply = isHindi
          ? "🎤 हाँ! मैं आपकी आवाज़ सुन सकता हूँ। नीचे **माइक बटन (🎙️)** दबाएं और बोलें — जैसे: **'दिल्ली से मुंबई तक कैब चेक करो'**। मैं खुद ही सर्च कर दूँगा!"
          : "🎤 Yes! I can listen to your voice. Tap the **mic button (🎙️)** below and say something like — **'Find ride from Delhi to Mumbai'**. I'll search it automatically for you!";
      }
      else {
        reply = isHindi
          ? "मैं आपकी मदद कर सकता हूँ! 🎤 आप **माइक बटन** दबाकर बोल सकते हैं — जैसे **'दिल्ली से आगरा'** — और मैं खुद सर्च कर दूँगा। या मुझसे **सबसे सस्ती राइड**, **ड्राइवर रेटिंग**, या **सबसे तेज़ रूट** के बारे में पूछें!"
          : "I can help! 🎤 Try the **mic button** and say something like **'Ride from Delhi to Agra'** — I'll search it for you automatically! Or ask me about the **cheapest rides**, **driver ratings**, or **fastest routes**!";
      }
    }

    return NextResponse.json({ reply, action, pickup, dropoff });
    
  } catch (error) {
    return NextResponse.json({ reply: "Oops, my circuits are a bit jammed! Try asking me again in a moment." });
  }
}
