const express = require('express');
const axios = require('axios');
const router = express.Router();
const NodeCache = require('node-cache');
require('dotenv').config();

const weatherCache = new NodeCache({ stdTTL: 1800 }); // 30 minutes

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_URL = 'https://api.openweathermap.org/data/2.5/forecast';

function isValidCoord(val) {
  return typeof val === 'string' && /^-?\\d+(\\.\\d+)?$/.test(val);
}

router.get('/weather', async (req, res) => {
  let { lat, lon, active_crop } = req.query;
  if (!isValidCoord(lat) || !isValidCoord(lon)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }
  lat = parseFloat(lat);
  lon = parseFloat(lon);

  const cacheKey = `${lat},${lon},${active_crop}`;
  const cached = weatherCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    // Fetch weather data
    const { data } = await axios.get(OPENWEATHER_URL, {
      params: {
        lat,
        lon,
        units: 'metric',
        appid: OPENWEATHER_API_KEY,
      },
    });

    // Aggregate 3-day forecast
    const now = new Date();
    const forecast = {};
    data.list.forEach((item) => {
      const date = new Date(item.dt * 1000);
      const day = date.toLocaleDateString('en-US', {
        weekday: 'short',
        timeZone: 'Africa/Nairobi',
      });
      if (!forecast[day]) forecast[day] = [];
      forecast[day].push(item);
    });
    const days = Object.keys(forecast).slice(0, 3);
    const daily = days.map((day) => {
      const items = forecast[day];
      const temps = items.map((i) => i.main.temp);
      const weather = items[0].weather[0];
      return {
        day,
        high: Math.max(...temps),
        low: Math.min(...temps),
        icon: weather.icon,
        condition: weather.description,
        humidity: items[0].main.humidity,
        wind: items[0].wind.speed,
        uv: null, // OpenWeatherMap free tier does not provide UV, can be omitted or set to null
      };
    });

    // Current weather (from first item)
    const current = {
      temp: data.list[0].main.temp,
      condition: data.list[0].weather[0].description,
      icon: data.list[0].weather[0].icon,
      humidity: data.list[0].main.humidity,
      wind: data.list[0].wind.speed,
      uv: null, // Not available in free tier
    };

    // AI farming tips (call your AI endpoint)
    const aiRes = await axios.post(
      'https://your-ai-endpoint.com/generate-tips',
      {
        forecast: daily,
        crop: active_crop,
      }
    );
    const tips = aiRes.data.tips; // Should be a 3-element array

    // Merge tips
    daily.forEach((d, i) => (d.tip = tips[i]));

    const result = { current, forecast: daily };
    weatherCache.set(cacheKey, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Weather unavailable' });
  }
});

module.exports = router;
