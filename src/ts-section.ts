export const BASIC_HEADER_SIZE = 3;
export const EXTENDED_HEADER_SIZE = 8;
export const CRC_SIZE = 4;

export const table_id = (section: Buffer) => {
  return section[0];
}

export const section_length = (section: Buffer) => {
  return ((section[1] & 0x0F) << 8) | section[2];
}

export const table_id_extension = (section: Buffer) => {
  return (section[3] << 8) | section[4];
}

export const version_number = (section: Buffer) => {
  return (section[5] & 0x3E) >> 1;
}

export const current_next_indicator = (section: Buffer) => {
  return (section[5] & 0x01) != 0;
}

export const section_number = (section: Buffer) => {
  return section[6];
}

export const last_section_number = (section: Buffer) => {
  return section[7];
}

export const CRC32 = (section: Buffer) => {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < section.length; i++) {
    const byte = section[i];
    for (let index = 7; index >= 0; index--) {
      const bit = (byte & (1 << index)) >> index;
      const c = (crc & 0x80000000) != 0 ? 1 : 0;
      crc <<= 1;
      if (c ^ bit) { crc ^= 0x04c11db7; }
      crc &= 0xFFFFFFFF;
    }
  }
  return crc;
}
