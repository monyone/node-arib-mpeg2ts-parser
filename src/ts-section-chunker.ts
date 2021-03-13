import { Transform, TransformCallback } from 'stream'
import SectionQueue from './ts-section-queue'

export default class SectionChunker extends Transform {
  private sectionQueue: SectionQueue = new SectionQueue();

  _transform (packet: Buffer, encoding: string, callback: TransformCallback): void {
    this.sectionQueue.push(packet);
    
    while (!this.sectionQueue.isEmpty()) {
      this.push(this.sectionQueue.pop());
    }

    callback();
  }

  _flush (callback: TransformCallback): void {
    while (!this.sectionQueue.isEmpty()) {
      this.push(this.sectionQueue.pop());
    }

    callback();
  }
}
