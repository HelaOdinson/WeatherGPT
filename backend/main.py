import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
import httpx
from pydantic import BaseModel

app = FastAPI()

# Enable CORS so your React/Vite frontend (port 5173) can communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini Client using your LLM_API_KEY (or GEMINI_API_KEY) from .env
api_key = os.environ.get("LLM_API_KEY") or os.environ.get("GEMINI_API_KEY")
ai_client = genai.Client(api_key=api_key)

# Grounding System Instructions to eliminate hallucinations
WEATHER_SYSTEM_INSTRUCTION = """
You are WeatherGPT, a helpful and conversational AI weather assistant.
Your sole job is to interpret and explain the provided factual weather data to answer the user's question.

CRITICAL PROJECT RULES:
1. Grounding: Answer using ONLY the supplied weather data JSON.
2. No Hallucination: Never invent, assume, or guess weather conditions, forecasts, or numerical readings.
3. Missing Information: If the provided weather data does not contain the information required to answer the question, explicitly state that the data is not available.
4. Natural Tone: Respond in a clear, friendly, and natural conversational tone.
""".strip()


# --- Pydantic Data Models ---
class ForecastDay(BaseModel):
    date: str
    temperature_max: float
    temperature_min: float
    condition: str
    rain_probability: int


class WeatherResponse(BaseModel):
    location: str
    temperature: float
    condition: str
    wind_speed: float
    rain_probability: int
    forecast: list[ForecastDay]


class AIQueryRequest(BaseModel):
    question: str
    location: str = "Alappuzha"


# --- Helper Function for WMO Weather Codes ---
def get_weather_condition(weather_code: int) -> str:
    weather_conditions = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        71: "Slight snow",
        73: "Moderate snow",
        75: "Heavy snow",
        80: "Slight rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",
        95: "Thunderstorm",
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail",
    }
    return weather_conditions.get(weather_code, "Unknown")


# --- Routes ---
@app.get("/")
def home():
    return {"message": "WeatherGPT backend is running"}


@app.get("/weather", response_model=WeatherResponse)
def get_weather(location: str = "Alappuzha"):
    # Step 1: Convert location name to coordinates
    geocoding_url = "https://geocoding-api.open-meteo.com/v1/search"
    geocoding_params = {
        "name": location,
        "count": 1,
        "language": "en",
        "format": "json",
    }

    try:
        geocoding_response = httpx.get(
            geocoding_url, params=geocoding_params, timeout=10
        )
        geocoding_response.raise_for_status()
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Location service unavailable")
    except httpx.HTTPStatusError:
        raise HTTPException(
            status_code=502, detail="Location service returned an error"
        )

    geocoding_data = geocoding_response.json()
    if not geocoding_data.get("results"):
        raise HTTPException(status_code=404, detail="Location not found")

    place = geocoding_data["results"][0]
    latitude = place["latitude"]
    longitude = place["longitude"]
    place_name = place["name"]

    # Step 2: Get weather using the coordinates
    weather_url = "https://api.open-meteo.com/v1/forecast"
    weather_params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,weather_code,wind_speed_10m,precipitation_probability",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        "timezone": "auto",
    }

    try:
        weather_response = httpx.get(
            weather_url, params=weather_params, timeout=10
        )
        weather_response.raise_for_status()
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Weather service unavailable")
    except httpx.HTTPStatusError:
        raise HTTPException(
            status_code=502, detail="Weather service returned an error"
        )

    # Process weather response
    try:
        weather_data = weather_response.json()
        current = weather_data["current"]
        daily = weather_data["daily"]

        temperature = current["temperature_2m"]
        weather_code = current["weather_code"]
        wind_speed = current["wind_speed_10m"]
        rain_probability = current["precipitation_probability"]

        daily_dates = daily["time"]
        daily_weather_codes = daily["weather_code"]
        daily_max_temperatures = daily["temperature_2m_max"]
        daily_min_temperatures = daily["temperature_2m_min"]
        daily_rain_probabilities = daily["precipitation_probability_max"]
    except (ValueError, KeyError, TypeError):
        raise HTTPException(status_code=502, detail="Invalid weather data received")

    forecast = []
    for i in range(len(daily_dates)):
        forecast.append({
            "date": daily_dates[i],
            "temperature_max": daily_max_temperatures[i],
            "temperature_min": daily_min_temperatures[i],
            "condition": get_weather_condition(daily_weather_codes[i]),
            "rain_probability": daily_rain_probabilities[i],
        })

    # Step 3: Return clean validated data
    return {
        "location": place_name,
        "temperature": temperature,
        "condition": get_weather_condition(weather_code),
        "wind_speed": wind_speed,
        "rain_probability": rain_probability,
        "forecast": forecast,
    }


@app.post("/ai-weather")
def get_ai_weather(req: AIQueryRequest):
    # 1. Fetch live weather data for the requested location
    weather_data = get_weather(location=req.location)

    # 2. Construct grounded prompt with user question and verified weather JSON
    prompt = f"""
User Question: "{req.question}"

Supplied Weather Data:
{weather_data}
""".strip()

    # 3. Call Gemini model
    try:
        response = ai_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=WEATHER_SYSTEM_INSTRUCTION,
                temperature=0.2,
            ),
        )
        return {
            "response": response.text,
            "weather_data": weather_data,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"AI service error: {str(e)}"
        )