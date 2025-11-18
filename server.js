import express from "express"
import fetch from "node-fetch"
import path from "path"
import { fileURLToPath } from "url"
import cors from "cors"
import dotenv from "dotenv"

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json())

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")))

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

if (!OPENROUTER_API_KEY) {
  console.error("Missing OPENROUTER_API_KEY in .env")
  process.exit(1)
}

// Enhanced system prompt with multiple modes
const getSystemPrompt = (mode, userQuestion) => {
  const chattyKeywords = ["hi", "hello", "hey", "how are you", "good morning", "good evening"]
  const solutionTriggers = ["?", "solve", "calculate", "explain", "why", "how", "find", "prove"]
  
  // Auto-detect mode if not specified
  let detectedMode = mode
  if (!mode) {
    if (chattyKeywords.some(word => userQuestion.toLowerCase().includes(word)) && 
        !solutionTriggers.some(kw => userQuestion.toLowerCase().includes(kw))) {
      detectedMode = "chatty"
    } else {
      detectedMode = "solution"
    }
  }

  if (detectedMode === "chatty") {
    return `You are NelaX Lite, a friendly and motivational AI study buddy. 
For casual chats:
- Reply in clean HTML using <p> only.
- Be warm, short, and natural like a human friend.
- Use emojis for friendliness.
- DO NOT structure into steps or Final Answer.
- Example: <p>👋 Hey! Great to see you. What's on your mind today?</p>`
  } else {
    return `You are NelaX Lite, an AI study assistant specialized in mathematics and science. 
      
IMPORTANT FORMATTING RULES:
- Use $...$ for inline math expressions (e.g., $f(x)$ or $\\frac{dy}{dx}$)
- Use $$...$$ for display math blocks (e.g., $$\\int_a^b f(x)dx$$)
- Use **bold** for emphasis and key terms
- Use numbered lists like 1), 2), 3) for step-by-step explanations
- Use bullet points • for lists
- Structure your answers clearly with proper mathematical notation
- Always provide detailed, educational explanations

For problem-solving, format answers like this:

<p><strong>Intro:</strong> Short motivational opener.</p>
<h3>🔹 Step 1:</h3>
<p>Explain clearly with short sentences or bullets.</p>
<h3>🔹 Step 2:</h3>
<p>Keep guiding step by step like a tutor.</p>
<hr>
<h2>✅ Final Answer</h2>
<pre><strong>🎯 Show the final solution here, copyable</strong></pre>

MATHEMATICAL EXAMPLES:
- Inline: "The derivative $f'(x)$ represents..."
- Block: "$$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$$"
- Numbered: "1) First, compute the derivative..."
- Bold: "**Key Concept:** The chain rule states..."

Your responses should be professional, educational, and mathematically precise.`
  }
}

// Main AI chat endpoint
app.post("/execute", async (req, res) => {
  try {
    const { command, args } = req.body
    if (command !== "ask_question") {
      return res.json({ success: false, error: "Unknown command" })
    }

    const userQuestion = args.message
    const mode = args.mode // Optional: "chatty" or "solution"

    const systemPrompt = getSystemPrompt(mode, userQuestion)

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuestion }
        ]
      })
    })

    const data = await response.json()
    const answer = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response."

    res.json({ success: true, response: answer })
  } catch (err) {
    console.error("OpenRouter error:", err)
    res.json({ success: false, error: "Failed to fetch response" })
  }
})

// Study materials API
app.get("/api/materials", async (req, res) => {
  try {
    const { topic, level, department, goal = "general" } = req.query

    if (!topic || !level || !department) {
      return res.json({ 
        success: false, 
        error: "Missing one or more parameters: topic, level, department" 
      })
    }

    // AI Explanation
    const prompt = `You're an educational AI helping a ${level} student in the ${department} department.
They want to learn: '${goal}' in the topic of ${topic}.
Provide a short and clear explanation to help them get started.
End with: '📚 Here are materials to study further:'`

    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You're a helpful and knowledgeable tutor." },
          { role: "user", content: prompt }
        ]
      })
    })

    const aiData = await aiResponse.json()
    const explanation = aiData.choices?.[0]?.message?.content || 
      `Let me help you learn ${topic}. Start with the basic concepts and build from there. 📚 Here are materials to study further:`

    // Mock study materials (in a real app, you'd integrate with actual APIs)
    const materials = {
      pdfs: [
        { title: `${topic} Fundamentals Guide`, link: "#" },
        { title: `${department} ${topic} Textbook`, link: "#" }
      ],
      books: [
        { title: `Introduction to ${topic}`, author: "Expert Author", link: "#" },
        { title: `${topic} for ${level} Students`, author: "Education Press", link: "#" }
      ],
      videos: [
        { title: `${topic} Crash Course`, video_url: "#" },
        { title: `${department} ${topic} Tutorial`, video_url: "#" }
      ]
    }

    res.json({
      success: true,
      query: topic,
      ai_explanation: explanation,
      ...materials
    })

  } catch (err) {
    console.error("Materials API error:", err)
    res.json({ success: false, error: "Failed to fetch study materials" })
  }
})

// Educational reels API
app.get("/api/reels", async (req, res) => {
  try {
    const { course } = req.query

    const allReels = [
      { course: "Programming", caption: "Python Basics Tutorial", video_url: "https://youtu.be/Gua2Bo_G-J0?si=FNnNZBbmBh0yqvrk" },
      { course: "Mathematics", caption: "Calculus Fundamentals", video_url: "https://youtu.be/fb7YCVR5fIU?si=XWozkxGoBV2HP2HW" },
      { course: "Science", caption: "Physics Concepts Explained", video_url: "https://youtu.be/qISkyoiGHcI?si=BKRnkFfl-fqKXgLG" },
      { course: "Programming", caption: "JavaScript Crash Course", video_url: "https://youtu.be/27gabbJQZqc?si=rsOLmkD2QXOoxSoi" },
      { course: "Mathematics", caption: "Algebra Made Easy", video_url: "https://youtu.be/Cox8rLXYAGQ?si=CvKUaPuPJOxPb6cr" }
    ]

    const matchingReels = course ? allReels.filter(reel => reel.course === course) : allReels

    res.json({ success: true, reels: matchingReels })
  } catch (err) {
    console.error("Reels API error:", err)
    res.json({ success: false, error: "Failed to fetch educational reels" })
  }
})

app.get("/api/cbt", async (req, res) => {
  try {
    const { topic } = req.query

    const allQuestions = {
      programming: [
        { question: "What is a variable in programming?", options: ["Data storage", "Function", "Loop", "Condition"], answer: "Data storage" },
        { question: "Which language is known for web development?", options: ["Python", "JavaScript", "C++", "Java"], answer: "JavaScript" }
      ],
      mathematics: [
        { question: "What is 2 + 2?", options: ["3", "4", "5", "6"], answer: "4" },
        { question: "Solve: x + 5 = 10", options: ["x=3", "x=5", "x=10", "x=15"], answer: "x=5" }
      ],
      science: [
        { question: "What is H2O?", options: ["Oxygen", "Hydrogen", "Water", "Carbon dioxide"], answer: "Water" },
        { question: "Which planet is known as the Red Planet?", options: ["Earth", "Mars", "Jupiter", "Venus"], answer: "Mars" }
      ]
    }

    const questions = topic ? allQuestions[topic] || [] : []

    res.json({ success: true, questions })
  } catch (err) {
    console.error("CBT API error:", err)
    res.json({ success: false, error: "Failed to fetch test questions" })
  }
})

app.get("/api/ai-teach", async (req, res) => {
  try {
    const { course, level } = req.query

    if (!course || !level) {
      return res.json({ success: false, error: "Missing course or level" })
    }

    const prompt = `You're a tutor. Teach a ${level} student the basics of ${course} in a friendly and easy-to-understand way. Use simple language and practical examples.`

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an educational AI assistant." },
          { role: "user", content: prompt }
        ]
      })
    })

    const data = await response.json()
    const summary = data.choices?.[0]?.message?.content || 
      `Let me teach you the basics of ${course}. We'll start with fundamental concepts and build up from there. This is perfect for ${level} students!`

    res.json({ success: true, summary })
  } catch (err) {
    console.error("AI Teach error:", err)
    res.json({ success: false, error: "Failed to generate teaching content" })
  }
})

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

app.get("/materials", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "materials.html"))
})

app.get("/reels", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "reels.html"))
})

app.get("/cbt", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "cbt.html"))
})

app.get("/talk-to-nelax", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "talk-to-nelax.html"))
})

app.get("/about", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "about.html"))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 NelaX Lite running at http://localhost:${PORT}`)
  console.log(`📚 Materials: http://localhost:${PORT}/materials`)
  console.log(`🎥 Reels: http://localhost:${PORT}/reels`)
  console.log(`🧠 CBT Test: http://localhost:${PORT}/cbt`)
  console.log(`📚 Materials API: http://localhost:${PORT}/api/materials`)
  console.log(`🎥 Reels API: http://localhost:${PORT}/api/reels`)
  console.log(`🧠 CBT API: http://localhost:${PORT}/api/cbt`)
  console.log(`👨‍🏫 AI Teach API: http://localhost:${PORT}/api/ai-teach`)
  console.log(`ℹ️ About API: http://localhost:${PORT}/api/about`)
  console.log(`🎙️ Talk To NelaX API: http://localhost:${PORT}/api/talk-to-nelax`)
})