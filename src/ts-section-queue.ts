import { Transform, TransformCallback } from 'stream'
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
  BASIC_HEADER_SIZE,
  section_length,
} from './ts-section'

const is_complete_section = (section: Buffer) => {
  return (BASIC_HEADER_SIZE + section_length(section) - section.length) <= 0;
}

export default class SectionQueue {
  private queue: Buffer[] = [];
  private partialSection: Buffer = Buffer.from([]);

  push (packet: Buffer): void {
    let begin = HEADER_SIZE + (has_adaptation_field(packet) ? 1 + adaptation_field_length(packet): 0)
    if (payload_unit_start_indicator(packet)) { begin += 1; }

    if (this.partialSection.length == 0) {
      if (payload_unit_start_indicator(packet)) {
        begin += pointer_field(packet);
      } else {
        return;
      } 
    }

    if (payload_unit_start_indicator(packet)) {
      while (begin < PACKET_SIZE) {
        if (packet[begin] === STUFFING_BYTE) { break; }
  
        if (this.partialSection.length == 0) {
          const next = begin + Math.max(0, BASIC_HEADER_SIZE + section_length(packet.slice(begin)))
          this.partialSection = Buffer.concat([this.partialSection, packet.slice(begin, next)]);
          begin = next;
        } else {
          const next = begin + Math.max(0, BASIC_HEADER_SIZE + section_length(this.partialSection) - this.partialSection.length)
          this.partialSection = Buffer.concat([this.partialSection, packet.slice(begin, next)]);
          begin = next;
        }
 
        if (is_complete_section(this.partialSection)) {
          this.queue.push(this.partialSection);
          this.partialSection = Buffer.from([]);
        }
      }
    } else {
      const next = begin + Math.max(0, BASIC_HEADER_SIZE + section_length(this.partialSection) - this.partialSection.length);
      this.partialSection = Buffer.concat([this.partialSection, packet.slice(begin, next)]);
      if (is_complete_section(this.partialSection)) {
        this.queue.push(this.partialSection);
        this.partialSection = Buffer.from([]);
      }
    }
  }

  pop (): Buffer | undefined {
    return this.queue.shift()
  }

  isEmpty (): boolean { 
    return this.queue.length === 0;
  }

  clear (): void {
    this.partialSection = Buffer.from([]);
    this.queue.length = 0;
  }
}
