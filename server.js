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

app.use(express.static(path.join(__dirname, "public")))

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

if (!OPENROUTER_API_KEY) {
  console.error("Missing OPENROUTER_API_KEY in .env")
  process.exit(1)
}

const getSystemPrompt = (mode, userQuestion) => {
  const chattyKeywords = ["hi", "hello", "hey", "how are you", "good morning", "good evening"]
  const solutionTriggers = ["?", "solve", "calculate", "explain", "why", "how", "find", "prove"]

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
- Do not use steps or Final Answer.`
  } else {
    return `You are NelaX Lite, an AI study assistant specializing in math and science.`
  }
}

app.post("/execute", async (req, res) => {
  try {
    const { command, args } = req.body
    if (command !== "ask_question") {
      return res.json({ success: false, error: "Unknown command" })
    }

    const userQuestion = args.message
    const mode = args.mode
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
    const answer = data.choices?.[0]?.message?.content || 
      "Sorry, I couldn't generate a response."

    res.json({ success: true, response: answer })
  } catch (err) {
    console.error("OpenRouter error:", err)
    res.json({ success: false, error: "Failed to fetch response" })
  }
})

app.get("/api/materials", async (req, res) => {
  try {
    const { topic, level, department, goal = "general" } = req.query

    if (!topic || !level || !department) {
      return res.json({
        success: false,
        error: "Missing one or more parameters: topic, level, department"
      })
    }

    const prompt = `You're an educational AI helping a ${level} student in ${department}.`

    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You're a helpful tutor." },
          { role: "user", content: prompt }
        ]
      })
    })

    const aiData = await aiResponse.json()
    const explanation = aiData.choices?.[0]?.message?.content ||
      `Let me help you learn ${topic}. 📚 Here are materials to study further:`

    const materials = {
      pdfs: [
        {
          title: `${topic} Fundamentals Guide`,
          link: `https://openlibrary.org/search?q=${encodeURIComponent(topic + " fundamentals")}`
        },
        {
          title: `${department} ${topic} Textbook`,
          link: `https://openlibrary.org/search?q=${encodeURIComponent(department + " " + topic)}`
        }
      ],
      books: [
        {
          title: `Introduction to ${topic}`,
          author: "Expert Author",
          link: `https://openlibrary.org/search?q=${encodeURIComponent("Introduction to " + topic)}`
        },
        {
          title: `${topic} for ${level} Students`,
          author: "Education Press",
          link: `https://openlibrary.org/search?q=${encodeURIComponent(topic + " textbook for " + level + " students")}`
        }
      ],
      videos: [
        {
          title: `${topic} Crash Course`,
          video_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topic + " crash course")}`
        },
        {
          title: `${department} ${topic} Tutorial`,
          video_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(department + " " + topic + " tutorial")}`
        }
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
  console.log(`NelaX Lite running at http://localhost:${PORT}`)
})
  
// ------------------------------------------------------
//             🚀 KEEP ALIVE PING (Render Fix)
// ------------------------------------------------------

setInterval(() => {
  fetch("https://YOUR-APP.onrender.com")
    .then(() => console.log("Ping sent"))
    .catch(err => console.log("Ping failed", err))
}, 60 * 1000)
