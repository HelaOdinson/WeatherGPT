import { useState } from "react"

type Role = "user" | "ai"

interface Message {
  id: number
  role: Role
  text: string
  time: string
}

const WEATHER = {
  city: "Alappuzha",
  region: "IN · Kerala",
  temp: 31,
  feelsLike: 32,
  high: 33,
  low: 27,
  condition: "Partly Cloudy",
  conditionCode: "partly-cloudy",
  updated: "Updated just now",
  stats: [
    { label: "Rain", value: "65%" },
    { label: "Humidity", value: "78%" },
    { label: "Wind", value: "8 mph" },
    { label: "Visibility", value: "10 mi" },
  ],
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    role: "ai",
    text: "Hello! I'm WeatherGPT. Ask me about current conditions, forecasts, or anything weather-related.",
    time: "10:30 AM",
  },
  {
    id: 2,
    role: "user",
    text: "Will it rain tomorrow?",
    time: "10:31 AM",
  },
  {
    id: 3,
    role: "ai",
    text: "Rain is possible tomorrow. There's a 65% chance of light showers in the afternoon, mainly after 2 PM. Carrying an umbrella may be useful if you're heading out.",
    time: "10:31 AM",
  },
]

function WeatherEmoji({ code }: { code: string }) {
  const emojis: Record<string, string> = {
    "partly-cloudy": "⛅",
    sunny: "☀️",
    cloudy: "☁️",
    rainy: "🌧️",
    storm: "⛈️",
    snow: "❄️",
  }

  return (
    <span className="text-5xl" role="img" aria-label="weather">
      {emojis[code] || "🌤️"}
    </span>
  )
}

function AiAvatar() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-sm">
      🌤️
    </div>
  )
}

function UserAvatar() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm">
      👤
    </div>
  )
}

function Timestamp({ time }: { time: string }) {
  return (
    <span className="text-xs text-slate-500">
      {time}
    </span>
  )
}

function getCurrentTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function App() {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const sendQuestion = async (question: string) => {
    const trimmedQuestion = question.trim()

    if (!trimmedQuestion || isLoading) {
      return
    }

    setError("")

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      text: trimmedQuestion,
      time: getCurrentTime(),
    }

    setMessages((previousMessages) => [
      ...previousMessages,
      userMessage,
    ])

    setInput("")
    setIsLoading(true)

    try {
      /*
       * The frontend talks only to YOUR backend.
       *
       * Change this URL if your backend runs on another port.
       *
       * Example:
       * http://localhost:8000/api/chat
       */

      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          question: trimmedQuestion,
        }),
      })

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}`
        )
      }

      const data = await response.json()

      /*
       * We expect the backend to return something like:
       *
       * {
       *   "answer": "The weather tomorrow will be..."
       * }
       */

      if (!data.answer) {
        throw new Error("The server did not return an answer.")
      }

      const aiMessage: Message = {
        id: Date.now() + 1,
        role: "ai",
        text: data.answer,
        time: getCurrentTime(),
      }

      setMessages((previousMessages) => [
        ...previousMessages,
        aiMessage,
      ])
    } catch (err) {
      console.error("WeatherGPT request failed:", err)

      setError(
        "Unable to connect to WeatherGPT. Please make sure the backend server is running."
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = () => {
    sendQuestion(input)
  }

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const handleSuggestion = (suggestion: string) => {
    sendQuestion(suggestion)
  }

  return (
    <div className="min-h-screen bg-[#0c1219] text-slate-200">

      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0c1219]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-xl">
              🌤️
            </div>

            <div>
              <h1 className="font-semibold tracking-tight text-white">
                WeatherGPT
              </h1>

              <p className="text-xs text-slate-500">
                Conversational weather intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-emerald-300">
              Live
            </span>
          </div>

        </div>
      </header>


      {/* MAIN */}
      <main className="mx-auto max-w-5xl px-5 pb-10">

        {/* WEATHER CARD */}
        <section className="mt-6 overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-[#111c27] to-[#0d161f] p-6 shadow-2xl">

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-sm text-slate-500">
                Current weather
              </p>

              <div className="mt-1 flex items-center gap-3">
                <h2 className="text-2xl font-semibold text-white">
                  {WEATHER.city}
                </h2>

                <span className="text-sm text-slate-500">
                  {WEATHER.region}
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                {WEATHER.updated}
              </p>
            </div>

            <div className="flex items-center gap-5">
              <WeatherEmoji code={WEATHER.conditionCode} />

              <div>
                <div className="flex items-start">
                  <span className="text-6xl font-light tracking-tighter text-white">
                    {WEATHER.temp}
                  </span>

                  <span className="mt-2 text-xl text-slate-500">
                    °C
                  </span>
                </div>

                <p className="text-sm text-slate-400">
                  {WEATHER.condition}
                </p>
              </div>
            </div>

          </div>


          {/* WEATHER STATS */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/5 pt-5 sm:grid-cols-4">

            {WEATHER.stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl bg-white/[0.025] p-3"
              >
                <p className="text-xs text-slate-500">
                  {stat.label}
                </p>

                <p className="mt-1 font-mono text-sm text-slate-200">
                  {stat.value}
                </p>
              </div>
            ))}

          </div>
        </section>


        {/* CHAT */}
        <section className="mt-6 rounded-3xl border border-white/5 bg-[#0f1821]">

          <div className="chat-messages max-h-[520px] min-h-[300px] space-y-5 overflow-y-auto p-5">

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user"
                    ? "flex-row-reverse"
                    : ""
                }`}
              >

                {message.role === "ai" ? (
                  <AiAvatar />
                ) : (
                  <UserAvatar />
                )}

                <div
                  className={`max-w-[80%] ${
                    message.role === "user"
                      ? "items-end"
                      : "items-start"
                  }`}
                >

                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                      message.role === "user"
                        ? "rounded-tr-sm bg-cyan-500/15 text-cyan-50"
                        : "rounded-tl-sm bg-white/[0.04] text-slate-300"
                    }`}
                  >
                    {message.text}
                  </div>

                  <div
                    className={`mt-1 ${
                      message.role === "user"
                        ? "text-right"
                        : "text-left"
                    }`}
                  >
                    <Timestamp time={message.time} />
                  </div>

                </div>
              </div>
            ))}


            {/* LOADING */}
            {isLoading && (
              <div className="flex gap-3">
                <AiAvatar />

                <div className="rounded-2xl rounded-tl-sm bg-white/[0.04] px-4 py-3">
                  <div className="flex items-center gap-1">

                    <span className="dot-1 h-2 w-2 rounded-full bg-cyan-400" />
                    <span className="dot-2 h-2 w-2 rounded-full bg-cyan-400" />
                    <span className="dot-3 h-2 w-2 rounded-full bg-cyan-400" />

                  </div>
                </div>
              </div>
            )}

          </div>


          {/* ERROR */}
          {error && (
            <div className="mx-5 mb-4 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}


          {/* QUICK SUGGESTIONS */}
          <div className="border-t border-white/5 px-5 py-4">

            <p className="mb-3 text-xs text-slate-500">
              Try asking
            </p>

            <div className="flex flex-wrap gap-2">

              {[
                "5-day forecast",
                "Storm alerts",
                "Best time to travel",
                "UV index today",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestion(suggestion)}
                  disabled={isLoading}
                  className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-slate-400 transition hover:border-cyan-400/30 hover:bg-cyan-400/5 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}

            </div>
          </div>


          {/* INPUT */}
          <div className="border-t border-white/5 p-4">

            <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-[#0b131b] p-2">

              <textarea
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onKeyDown={handleKeyDown}
                placeholder="Ask WeatherGPT about the weather..."
                rows={1}
                disabled={isLoading}
                className="message-input max-h-32 min-h-12 flex-1 bg-transparent px-3 py-3 text-sm text-white placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              />

              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="send-button flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-lg text-[#061018] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Send message"
              >
                ➤
              </button>

            </div>

            <p className="mt-3 text-center text-[11px] text-slate-600">
              WeatherGPT uses AI · Forecasts may not always reflect actual conditions
            </p>

          </div>

        </section>

      </main>
    </div>
  )
}