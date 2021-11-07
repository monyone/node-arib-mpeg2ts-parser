export const PACKET_SIZE = 188;
export const HEADER_SIZE = 4;
export const SYNC_BYTE = 0x47;
export const STUFFING_BYTE = 0xFF;

export const transport_error_indicator = (packet: Buffer) => {
  return (packet[1] & 0x80) != 0;
}

export const payload_unit_start_indicator = (packet: Buffer) => {
  return (packet[1] & 0x40) != 0;
}

export const transport_priority = (packet: Buffer) => {
  return (packet[1] & 0x20) != 0;
}

export const pid = (packet: Buffer) => {
  return ((packet[1] & 0x1F) << 8) | packet[2];
}

export const transport_scrambling_control = (packet: Buffer) => {
  return (packet[3] & 0xC0) >> 6;
}

export const has_adaptation_field = (packet: Buffer) => {
  return (packet[3] & 0x20) != 0;
}

export const has_payload = (packet: Buffer) => {
  return (packet[3] & 0x10) != 0;
}

export const continuity_counter = (packet: Buffer) => {
  return packet[3] & 0x0F;
}


export const adaptation_field_length = (packet: Buffer) => {
  return has_adaptation_field(packet) ? packet[4] : 0;
}

export const pointer_field = (packet: Buffer) => {
  return packet[HEADER_SIZE + (has_adaptation_field(packet) ? 1 + adaptation_field_length(packet) : 0)];
}

export const has_pcr = (packet: Buffer) => {
  return has_adaptation_field(packet) && adaptation_field_length(packet) !== 0 && (packet[HEADER_SIZE + 1] & 0x10) != 0;
}

export const pcr = (packet: Buffer) => {
  if (!has_pcr(packet)) { return Number.NaN; }

  let pcr_base = 0;
  pcr_base = (pcr_base * (1 << 8)) + ((packet[HEADER_SIZE + 1 + 1] & 0xFF) >> 0);
  pcr_base = (pcr_base * (1 << 8)) + ((packet[HEADER_SIZE + 1 + 2] & 0xFF) >> 0);
  pcr_base = (pcr_base * (1 << 8)) + ((packet[HEADER_SIZE + 1 + 3] & 0xFF) >> 0);
  pcr_base = (pcr_base * (1 << 8)) + ((packet[HEADER_SIZE + 1 + 4] & 0xFF) >> 0);
  pcr_base = (pcr_base * (1 << 1)) + ((packet[HEADER_SIZE + 1 + 5] & 0x80) >> 7);

  return pcr_base;
}
