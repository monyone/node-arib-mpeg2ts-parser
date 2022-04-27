import {
  PACKET_SIZE,
  HEADER_SIZE,
  SYNC_BYTE,
  STUFFING_BYTE,
} from './ts-packet'

import {
  PTS,
  DTS,
  stream_id,  
  PES_HEADER_SIZE
} from './ts-pes'

export default class PESPacketizer {

  static packetize (
    pes: Buffer,
    transport_error_indicator: boolean,
    transport_priority: boolean,
    pid: number,
    transport_scrambling_control: number,
    continuity_counter: number,
    pts?: number,
    dts?: number,
  ): Buffer[] {
    const result: Buffer[] = [];

    const id = stream_id(pes);
    const has_flag = (id !== 0xBC) && (id !== 0xBE) && (id !== 0xBF) && (id !== 0xF0) && (id !== 0xF1) && (id !== 0xFF) && (id !== 0xF2) && (id !== 0xF8);
    const PES_header_data_length = has_flag ? pes[PES_HEADER_SIZE + 2] : 0;
    const begin = has_flag ? (PES_HEADER_SIZE + 3 + PES_header_data_length) : PES_HEADER_SIZE;

    if (pts == null && dts != null) { pts = dts; }
    if (pts == null) { pts = PTS(pes); }
    if (dts == null) { dts = DTS(pes); }
    if (!has_flag) { pts = undefined; dts = undefined; }

    const new_PTS = Buffer.from(pts != null ? [
      ((pts != null ? 0b000100000 : 0) | (dts != null ? 0b00010000 : 0) | (((pts / (1 << 30)) & 0x7) << 1) | 1),
      ((((pts >>> 0) & 0x3FC00000) >> 22)),
      ((((pts >>> 0) & 0x003F8000) >> 15) << 1) | 1,
      ((((pts >>> 0) & 0x00007F80) >>  7)),
      ((((pts >>> 0) & 0x0000007F) >>  0) << 1) | 1,
    ] : []);
    const new_DTS = Buffer.from(dts != null ? [
      ((dts != null ? 0b00010000 : 0) | (((dts / (1 << 30)) & 0x7) << 1) | 1),
      ((((dts >>> 0) & 0x3FC00000) >> 22)),
      ((((dts >>> 0) & 0x003F8000) >> 15) << 1) | 1,
      ((((dts >>> 0) & 0x00007F80) >>  7)),
      ((((dts >>> 0) & 0x0000007F) >>  0) << 1) | 1,
    ] : []) 
    const new_PES_header_data_length = new_PTS.length + new_DTS.length;

    pes = Buffer.concat([
      pes.slice(0, PES_HEADER_SIZE),
      Buffer.concat(has_flag ? [
        Buffer.from([(pts != null ? 0b10000000 : 0) | (dts != null ? 0b10000000 : 0), 0]),
        Buffer.from([new_PES_header_data_length]),
        new_PTS,
        new_DTS,
      ] : []),
      pes.slice(begin)
    ]);
    pes[4] = ((pes.length - PES_HEADER_SIZE) & 0xFF00) >> 8;
    pes[5] = ((pes.length - PES_HEADER_SIZE) & 0x00FF) >> 0;

    for (let i = 0; i < pes.length; i += PACKET_SIZE - HEADER_SIZE) {
      const payload = pes.slice(i, Math.min(pes.length, i + 184));
      const header = Buffer.from([
        SYNC_BYTE,
        ((transport_error_indicator ? 1 : 0) << 7) | ((begin === 0 ? 1 : 0) << 6) | ((transport_priority ? 1 : 0) << 5) | ((pid & 0x1F00) >> 8),
        (pid & 0x00FF),
        (transport_scrambling_control << 6) | ((PACKET_SIZE - HEADER_SIZE) > payload.length ? 0x30 : 0x10) | (continuity_counter & 0x0F),
      ]);
      continuity_counter = (continuity_counter + 1) & 0x0F;

      const packet = Buffer.concat([
        header,
        Buffer.from((payload.length < (PACKET_SIZE - HEADER_SIZE))
          ? [(PACKET_SIZE - HEADER_SIZE - 1) - payload.length]
          : []
        ),
        Buffer.from((payload.length < (PACKET_SIZE - HEADER_SIZE - 1))
          ? [0x00]
          : []
        ),
        ((payload.length < (PACKET_SIZE - HEADER_SIZE - 2))
          ? Buffer.alloc((PACKET_SIZE - HEADER_SIZE - 2) - payload.length, 0xFF)
          : Buffer.from([])
        ),
        payload,
      ]);
      result.push(packet);
    }

    return result;
  }
}
