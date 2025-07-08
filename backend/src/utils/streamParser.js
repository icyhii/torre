import { Transform } from 'stream';

// Utility functions for parsing streaming responses will go here
export class NewlineDelimitedJsonStream extends Transform {
  constructor(options) {
    super({ ...options, readableObjectMode: true });
    this.buffer = '';
  }

  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop(); // Keep the last, possibly incomplete, line

    for (const line of lines) {
      if (line.trim()) {
        try {
          this.push(JSON.parse(line));
        } catch (e) {
          this.emit('error', new Error(`Failed to parse JSON line: ${line}`));
        }
      }
    }
    callback();
  }

  _flush(callback) {
    if (this.buffer.trim()) {
      try {
        this.push(JSON.parse(this.buffer));
      } catch (e) {
        this.emit('error', new Error(`Failed to parse final JSON buffer: ${this.buffer}`));
      }
    }
    callback();
  }
}
