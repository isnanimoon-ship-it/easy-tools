export type IcoSource = { size: number; png: Uint8Array };

/**
 * Builds a valid multi-size .ico container by embedding raw PNG bytes per
 * entry ("PNG-in-ICO", supported since Windows Vista) — no BMP/DIB pixel
 * encoding needed, since each source is already a fully-encoded PNG.
 */
export function buildIco(sources: IcoSource[]): Uint8Array {
  const count = sources.length;
  const headerSize = 6 + 16 * count;
  const totalSize = sources.reduce((sum, s) => sum + s.png.byteLength, headerSize);

  const buffer = new Uint8Array(totalSize);
  const view = new DataView(buffer.buffer);

  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type: 1 = icon
  view.setUint16(4, count, true);

  let dataOffset = headerSize;
  let entryOffset = 6;
  for (const source of sources) {
    const sizeByte = source.size >= 256 ? 0 : source.size; // 0 means 256px
    view.setUint8(entryOffset, sizeByte); // width
    view.setUint8(entryOffset + 1, sizeByte); // height
    view.setUint8(entryOffset + 2, 0); // color count (0 = no palette)
    view.setUint8(entryOffset + 3, 0); // reserved
    view.setUint16(entryOffset + 4, 1, true); // color planes
    view.setUint16(entryOffset + 6, 32, true); // bits per pixel
    view.setUint32(entryOffset + 8, source.png.byteLength, true); // bytes in resource
    view.setUint32(entryOffset + 12, dataOffset, true); // offset from file start

    buffer.set(source.png, dataOffset);
    dataOffset += source.png.byteLength;
    entryOffset += 16;
  }

  return buffer;
}
