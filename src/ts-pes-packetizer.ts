import {
  PACKET_SIZE,
  HEADER_SIZE,
  SYNC_BYTE,
  STUFFING_BYTE,
} from './ts-packet'

import {
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

    const has_pts = has_flag && pes[PES_HEADER_SIZE + 1] & 0x80;
    const has_dts = has_flag && pes[PES_HEADER_SIZE + 1] & 0x40; 
    const PES_header_data_length = has_flag ? pes[PES_HEADER_SIZE + 2] : 0;
    const begin = has_flag ? (PES_HEADER_SIZE + 3 + PES_header_data_length) : PES_HEADER_SIZE;

    let original_pts = Buffer.from(has_pts ? pes.slice(PES_HEADER_SIZE + 3, PES_HEADER_SIZE + 8) : []);
    let original_dts = Buffer.from(
      has_pts && has_dts ? pes.slice(PES_HEADER_SIZE + 8, PES_HEADER_SIZE + 13)
      : has_dts ? pes.slice(PES_HEADER_SIZE + 3, PES_HEADER_SIZE + 8)
      : []
    );

    const new_PES_flag = Buffer.from(
     has_flag ? 
     [
      0x80,
      0x00,
     ] :
     []
    );
    const new_PES_header_data_length = has_pts && has_dts ? 10 : has_pts || has_dts ? 5 : 0;
    let new_PTS = Buffer.from([]);
    let new_DTS = Buffer.from([]);

    if (dts == null && pts != null) {
      dts = pts;
    }

    if (dts != null && has_dts) {
      if (pts == null) { pts = dts; }
      new_DTS = Buffer.from([
        ((0x0001 << 4) | (((dts / (1 << 30)) & 0x7) << 1) | 1),
        ((((dts >>> 0) & 0x3FC00000) >> 22)),
        ((((dts >>> 0) & 0x003F8000) >> 15) << 1) | 1,
        ((((dts >>> 0) & 0x00007F80) >>  7)),
        ((((dts >>> 0) & 0x0000007F) >>  0) << 1) | 1,
      ]);
    } else if (has_dts) {
      new_DTS = original_dts;
    }

    if (pts != null && has_pts) {
      if (dts != null && has_dts) {
        new_PTS = Buffer.from([
          ((0x0011 << 4) | (((pts / (1 << 30)) & 0x7) << 1) | 1),
          ((((pts >>> 0) & 0x3FC00000) >> 22)),
          ((((pts >>> 0) & 0x003F8000) >> 15) << 1) | 1,
          ((((pts >>> 0) & 0x00007F80) >>  7)),
          ((((pts >>> 0) & 0x0000007F) >>  0) << 1) | 1,
        ]);
      } else {
        new_PTS = Buffer.from([
          ((0x0010 << 4) | (((pts / (1 << 30)) & 0x7) << 1) | 1),
          ((((pts >>> 0) & 0x3FC00000) >> 22)),
          ((((pts >>> 0) & 0x003F8000) >> 15) << 1) | 1,
          ((((pts >>> 0) & 0x00007F80) >>  7)),
          ((((pts >>> 0) & 0x0000007F) >>  0) << 1) | 1,
        ]);
      }
    } else {
      new_PTS = original_dts;
    }

    pes = Buffer.concat([
      pes.slice(0, PES_HEADER_SIZE),
      new_PES_flag,
      has_flag ? Buffer.from([new_PES_header_data_length]) : Buffer.from([]),
      new_PTS,
      new_DTS,
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
        (transport_scrambling_control << 6) | (1 << 4) | (continuity_counter & 0x0F),
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
