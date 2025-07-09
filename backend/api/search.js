import { searchPeopleAndBuildTeam } from '../src/services/torreService.js';

export default async function handler(req, res) {
  // Allow requests from your frontend domain
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.setHeader('Access-Control-Allow-Origin', frontendUrl);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  // Set SSE headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event, data) => {
    // Check if the response is still writable before sending
    if (!res.writableEnded) {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    const { skills, size } = req.query;
    if (!skills) {
      throw new Error("Skills parameter is required.");
    }
    await searchPeopleAndBuildTeam({ skills: skills.split(','), teamSize: parseInt(size, 10) }, sendEvent);
  } catch (error) {
    console.error('Search failed:', error);
    if (!res.writableEnded) {
      sendEvent('error', { message: error.message });
    }
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }

  // Ensure the connection is closed when the client disconnects
  req.on('close', () => {
    if (!res.writableEnded) {
      res.end();
    }
  });
}
