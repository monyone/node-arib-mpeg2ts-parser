import {
  PACKET_SIZE,
  HEADER_SIZE,
  STUFFING_BYTE,
  has_adaptation_field,
  adaptation_field_length,
  payload_unit_start_indicator,
  pointer_field,
} from './ts-packet'
import {
  PES_HEADER_SIZE,
  PES_packet_length,
} from './ts-pes'

const is_complete_pes = (pes: Buffer) => {
  return (HEADER_SIZE + PES_packet_length(pes) - pes.length) <= 0
}

export default class SectionQueue {
  private queue: Buffer[] = [];
  private partialPES: Buffer = Buffer.from([]);

  push (packet: Buffer): void {
    const begin = HEADER_SIZE + (has_adaptation_field(packet) ? 1 + adaptation_field_length(packet): 0);

    if (this.partialPES.length == 0 && !payload_unit_start_indicator(packet)) {
      return;
    }

    if (payload_unit_start_indicator(packet)) {
      const next = begin + Math.max(0, PES_HEADER_SIZE + PES_packet_length(packet.slice(begin)));
      this.partialPES = packet.slice(begin, next);
    } else {
      const next = begin + Math.max(0, PES_HEADER_SIZE + PES_packet_length(this.partialPES) - this.partialPES.length);
      this.partialPES = Buffer.concat([this.partialPES, packet.slice(begin, next)]);
    }

    if (is_complete_pes(this.partialPES)) {
      this.queue.push(this.partialPES);
      this.partialPES = Buffer.from([]);
    }
  }

  pop (): Buffer | undefined {
    return this.queue.shift()
  }

  isEmpty (): boolean { 
    return this.queue.length == 0;
  }
}
