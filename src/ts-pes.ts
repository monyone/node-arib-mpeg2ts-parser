export const PES_HEADER_SIZE = 6;

export const packet_start_code_prefix = (pes: Buffer) => {
  return (pes[0] << 16) | (pes[1] << 8) | pes[0]
}

export const stream_id = (pes: Buffer) => {
  return pes[3]
}

export const PES_packet_length = (pes: Buffer) => {
  return (pes[4] << 8) | pes[5]
}
