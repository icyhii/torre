import { searchPeopleAndBuildTeam } from '../src/services/torreService.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { skills, size } = req.query;
    if (!skills) {
      throw new Error('Skills parameter is required.');
    }
    await searchPeopleAndBuildTeam({ skills: skills.split(','), teamSize: parseInt(size, 10) }, sendEvent);
  } catch (error) {
    sendEvent('error', { message: error.message });
  } finally {
    res.end();
  }

  req.on('close', () => {
    res.end();
  });
}
