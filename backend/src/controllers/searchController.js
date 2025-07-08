import { searchPeopleAndBuildTeam } from '../services/torreService.js';

export const streamSearch = async (req, res) => {
  // 1. Set SSE headers to establish a persistent connection
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
      throw new Error("Skills parameter is required.");
    }

    await searchPeopleAndBuildTeam({ skills: skills.split(','), teamSize: parseInt(size, 10) }, sendEvent);

  } catch (error) {
    console.error('Stream search failed:', error);
    sendEvent('error', { message: error.message });
  } finally {
    res.end(); // End the connection when the process is complete or fails
  }

  // Handle client disconnect
  req.on('close', () => {
    console.log('Client disconnected.');
    res.end();
  });
};
