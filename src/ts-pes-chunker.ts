import { Transform, TransformCallback } from 'stream'
import PESQueue from './ts-pes-queue'

export default class SectionChunker extends Transform {
  private pesQueue: PESQueue = new PESQueue();

  _transform (packet: Buffer, encoding: string, callback: TransformCallback): void {
    this.pesQueue.push(packet);
    
    while (!this.pesQueue.isEmpty()) {
      this.push(this.pesQueue.pop());
    }

    callback();
  }

  _flush (callback: TransformCallback): void {
    while (!this.pesQueue.isEmpty()) {
      this.push(this.pesQueue.pop());
    }

    callback();
  }
}
