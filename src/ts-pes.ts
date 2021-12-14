export const PES_HEADER_SIZE = 6;

export const packet_start_code_prefix = (pes: Buffer) => {
  return (pes[0] << 16) | (pes[1] << 8) | pes[2]
}

export const stream_id = (pes: Buffer) => {
  return pes[3]
}

export const PES_packet_length = (pes: Buffer) => {
  return (pes[4] << 8) | pes[5]
}

export const has_flags = (pes: Buffer) => {
  const id = stream_id(pes);
  return (id !== 0xBC) && (id !== 0xBE) && (id !== 0xBF) && (id !== 0xF0) && (id !== 0xF1) && (id !== 0xFF) && (id !== 0xF2) && (id !== 0xF8);
}

export const has_PTS = (pes: Buffer) => {
  if (!has_flags(pes)) { return false }
  return (pes[PES_HEADER_SIZE + 1] & 0x80) !== 0;
}

export const has_DTS = (pes: Buffer) => {
  if (!has_flags(pes)) { return false; }
  return (pes[PES_HEADER_SIZE + 1] & 0x40) !== 0;
}

export const PTS = (pes: Buffer) => {
  if (!has_PTS(pes)) { return undefined; }

  let value = 0;
  value *= (1 << 3); value += ((pes[PES_HEADER_SIZE + 3 + 0] & 0x0E) >> 1);
  value *= (1 << 8); value += ((pes[PES_HEADER_SIZE + 3 + 1] & 0xFF) >> 0);
  value *= (1 << 7); value += ((pes[PES_HEADER_SIZE + 3 + 2] & 0xFE) >> 1);
  value *= (1 << 8); value += ((pes[PES_HEADER_SIZE + 3 + 3] & 0xFF) >> 0);
  value *= (1 << 7); value += ((pes[PES_HEADER_SIZE + 3 + 4] & 0xFE) >> 1);

  return value;
}

export const DTS = (pes: Buffer) => {
  if (!has_DTS(pes)) { return undefined; }

  const offset = has_PTS(pes) ? 5 : 0;
  let value = 0;
  value *= (1 << 3); value += ((pes[PES_HEADER_SIZE + 3 + offset + 0] & 0x0E) >> 1);
  value *= (1 << 8); value += ((pes[PES_HEADER_SIZE + 3 + offset + 1] & 0xFF) >> 0);
  value *= (1 << 7); value += ((pes[PES_HEADER_SIZE + 3 + offset + 2] & 0xFE) >> 1);
  value *= (1 << 8); value += ((pes[PES_HEADER_SIZE + 3 + offset + 3] & 0xFF) >> 0);
  value *= (1 << 7); value += ((pes[PES_HEADER_SIZE + 3 + offset + 4] & 0xFE) >> 1);

  return value;
}
