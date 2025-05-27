// src/api/events.ts
import type { Event } from '../types/events.d';


const API_BASE_URL = 'http://127.0.0.1:8000'; // Replace with your FastAPI URL

export const fetchEvents = async (): Promise<Event[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/events`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: Event[] = await response.json();
    // Optional: Basic data transformation if needed, e.g., parsing dates
    return data.map(event => ({
        ...event,
        // Example: If your date is 'YYYY-MM-DD', you might parse it to a Date object later
        // date: new Date(event.date)
    }));
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return []; // Return empty array on error
  }
};