from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx

app = FastAPI()


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


def get_weather_condition(weather_code):
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
        99: "Thunderstorm with heavy hail"
    }

    return weather_conditions.get(weather_code, "Unknown")


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
        "format": "json"
    }

    # Request location coordinates
    try:
        geocoding_response = httpx.get(
            geocoding_url,
            params=geocoding_params,
            timeout=10
        )

        geocoding_response.raise_for_status()

    except httpx.RequestError:
        raise HTTPException(
            status_code=502,
            detail="Location service unavailable"
        )

    except httpx.HTTPStatusError:
        raise HTTPException(
            status_code=502,
            detail="Location service returned an error"
        )

    geocoding_data = geocoding_response.json()

    # Check whether the location was found
    if not geocoding_data.get("results"):
        raise HTTPException(
            status_code=404,
            detail="Location not found"
        )

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
        "timezone": "auto"
    }

    # Request weather data
    try:
        weather_response = httpx.get(
            weather_url,
            params=weather_params,
            timeout=10
        )

        weather_response.raise_for_status()

    except httpx.RequestError:
        raise HTTPException(
            status_code=502,
            detail="Weather service unavailable"
        )

    except httpx.HTTPStatusError:
        raise HTTPException(
            status_code=502,
            detail="Weather service returned an error"
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
        raise HTTPException(
            status_code=502,
            detail="Invalid weather data received"
        )

    # Convert daily arrays into forecast objects
    forecast = []

    for i in range(len(daily_dates)):
        forecast.append({
            "date": daily_dates[i],
            "temperature_max": daily_max_temperatures[i],
            "temperature_min": daily_min_temperatures[i],
            "condition": get_weather_condition(daily_weather_codes[i]),
            "rain_probability": daily_rain_probabilities[i]
        })

    # Step 3: Return clean validated data
    return {
        "location": place_name,
        "temperature": temperature,
        "condition": get_weather_condition(weather_code),
        "wind_speed": wind_speed,
        "rain_probability": rain_probability,
        "forecast": forecast
    }