# 🌦️ SkyRoute – Smart Weather-Aware Route Tracker

SkyRoute is a modern, real-time **weather-aware route tracking web app** built with **React** and **Tailwind CSS**. It helps users plan safe and comfortable travel by showing **live weather conditions at key points along a route** from origin to destination.

It is optimized for both performance and user experience using modern **Web APIs**.

---

## 🚀 Features

- 📍 **Geolocation**: Detects your current location automatically  
- 🗺️ **Route Tracking**: Plots your travel route using OpenRouteService API  
- 🌤️ **Weather Insights**: Fetches real-time weather data from OpenWeatherMap for locations along the route  
- ⚡ **Network Adaptive**: Detects network speed and adjusts data loading (text-only/lightweight on slow connections)  
- 💤 **Lazy Loading**: Weather cards and eco-tips are lazy-loaded using Intersection Observer API  
- 🎨 **Responsive UI**: Mobile-first, fast, and elegant interface built with Tailwind CSS

---

## 🔧 Tech Stack

- **Frontend**: React (with Hooks), Tailwind CSS  
- **Routing API**: [OpenRouteService](https://openrouteservice.org/)  
- **Weather API**: [OpenWeatherMap](https://openweathermap.org/api)  
- **Map Rendering**: Leaflet.js (OpenStreetMap)  
- **Geolocation API** – Get user’s live coordinates  
- **Network Information API** – Detect and adapt to network quality  
- **Intersection Observer API** – Lazy load UI content

---

## 🖥️ Demo

> 🔗live demo  https://sky-route-app.vercel.app/

![SkyRoute Screenshot](./public/screenshot.png)



