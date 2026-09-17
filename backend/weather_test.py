import httpx

url = "https://api.open-meteo.com/v1/forecast"

params = {
    "latitude": 9.4981,
    "longitude": 76.3388,
    "current": "temperature_2m,weather_code,wind_speed_10m",
}

response = httpx.get(url, params=params)

print(response.status_code)
print(response.json())