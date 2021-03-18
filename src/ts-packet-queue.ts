import { PACKET_SIZE, SYNC_BYTE } from './ts-packet'

export default class PacketQueue {
  private queue: Buffer[] = [];
  private ascendant: Buffer = Buffer.from([]);

  push (chunk: Buffer): void {
    const processing = Buffer.concat([this.ascendant, chunk]);

    let lastSyncBytePosition = -1;
    for (let i = 0; i < processing.length; i++) {
      if (processing[i] != SYNC_BYTE) { continue; }

      lastSyncBytePosition = i;
      if (i + PACKET_SIZE <= processing.length) {
        this.queue.push(processing.slice(i, i + PACKET_SIZE));
        lastSyncBytePosition = -1;
      }
      
      i += PACKET_SIZE - 1;
    }

    if (lastSyncBytePosition >= 0) {
      this.ascendant = processing.slice(lastSyncBytePosition);
    } else {
      this.ascendant = Buffer.from([]);
    }
  }

  pop (): Buffer | undefined {
    return this.queue.shift()
  }

  isEmpty (): boolean {
    return this.queue.length == 0;
  }
}
