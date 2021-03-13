import { Transform, TransformCallback } from 'stream'
import { PACKET_SIZE, SYNC_BYTE } from './ts-packet'

export default class PacketChunker extends Transform {
  private ascendant: Buffer = Buffer.from([]);

  _transform (chunk: Buffer, encoding: string, callback: TransformCallback): void {
    const processing = Buffer.concat([this.ascendant, chunk]);

    let lastSyncBytePosition = -1;
    for (let i = 0; i < processing.length; i++) {
      if (processing[i] != SYNC_BYTE) { console.log('drop'); continue; }

      lastSyncBytePosition = i;
      if (i + PACKET_SIZE <= processing.length) {
        this.push(processing.slice(i, i + PACKET_SIZE));
        lastSyncBytePosition = -1;
      }
      
      i += PACKET_SIZE - 1;
    }

    if (lastSyncBytePosition >= 0) {
      this.ascendant = processing.slice(lastSyncBytePosition);
    } else {
      this.ascendant = Buffer.from([]);
    }
    
    callback();
  }

  _flush (callback: TransformCallback): void {
    callback();
  }
}
