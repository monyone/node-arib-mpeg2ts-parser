import {
  HEADER_SIZE,
  has_adaptation_field,
  adaptation_field_length,
  payload_unit_start_indicator,
} from './ts-packet'
import {
  PES_HEADER_SIZE,
  PES_packet_length,
} from './ts-pes'

const is_complete_pes = (pes: Buffer) => {
  if (PES_packet_length(pes) === 0) { return false; }
  return (HEADER_SIZE + PES_packet_length(pes) - pes.length) <= 0
}

export default class PESQueue {
  private queue: Buffer[] = [];
  private partialPES: Buffer = Buffer.from([]);

  push (packet: Buffer): void {
    const begin = HEADER_SIZE + (has_adaptation_field(packet) ? 1 + adaptation_field_length(packet): 0);

    if (this.partialPES.length === 0 && !payload_unit_start_indicator(packet)) {
      return;
    }

    if (payload_unit_start_indicator(packet)) {
      if (this.partialPES.length !== 0 && PES_packet_length(this.partialPES) === 0) {
        this.queue.push(this.partialPES);
      }

      const partial = packet.slice(begin);
      const packet_length = PES_packet_length(partial) === 0 ? Number.POSITIVE_INFINITY : PES_packet_length(partial);
      const next = begin + Math.max(0, PES_HEADER_SIZE + packet_length);
      this.partialPES = packet.slice(begin, next);
    } else {
      const packet_length = PES_packet_length(this.partialPES) === 0 ? Number.POSITIVE_INFINITY : PES_packet_length(this.partialPES)
      const next = begin + Math.max(0, PES_HEADER_SIZE + packet_length - this.partialPES.length);
      this.partialPES = Buffer.concat([this.partialPES, packet.slice(begin, next)]);
    }

    if (is_complete_pes(this.partialPES)) {
      this.queue.push(this.partialPES);
      this.partialPES = Buffer.from([]);
    }
  }

  pop (): Buffer | undefined {
    return this.queue.shift();
  }

  isEmpty (): boolean {
    return this.queue.length === 0;
  }

  clear (): void {
    this.partialPES = Buffer.from([]);
    this.queue.length = 0;
  }
}
