import {
  PACKET_SIZE,
  HEADER_SIZE,
  SYNC_BYTE,
  STUFFING_BYTE,
} from './ts-packet'

export default class SectionPacketizer {

  static packetize (
    section: Buffer,
    transport_error_indicator: boolean,
    transport_priority: boolean,
    pid: number,
    transport_scrambling_control: number,
    continuity_counter: number,
  ): Buffer[] {
    const result: Buffer[] = [];

    let begin = 0;
    while (begin < section.length) {
      const header = Buffer.from([
        SYNC_BYTE,
        ((transport_error_indicator ? 1 : 0) << 7) | ((begin === 0 ? 1 : 0) << 6) | ((transport_priority ? 1 : 0) << 5) | ((pid & 0x1F00) >> 8),
        (pid & 0x0F),
        (transport_scrambling_control << 6) | (1 << 4) | (continuity_counter & 0x0F),
      ]);
      continuity_counter = (continuity_counter + 1) & 0x0F;

      const next = Math.min(section.length, begin + ((PACKET_SIZE - HEADER_SIZE) - (begin === 0 ? 1 : 0)));
      let payload = section.slice(begin, next);
      if (begin === 0) { payload = Buffer.concat([Buffer.alloc(1), payload]); }
      const fillStuffingSize = Math.max(0, PACKET_SIZE - (HEADER_SIZE + payload.length))
      payload = Buffer.concat([payload, Buffer.alloc(fillStuffingSize, STUFFING_BYTE)]);

      const packet = Buffer.concat([header, payload]);
      result.push(packet)

      begin = next;
    }

    return result;
  }
}
