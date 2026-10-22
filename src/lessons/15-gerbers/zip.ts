/* A minimal "stored" (uncompressed) ZIP writer: enough to pack a handful of text files. */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(data: Uint8Array) {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function dosDateTime(d: Date) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2)
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  return { time, date }
}

export function makeZip(files: { name: string; text: string }[], when = new Date()): Uint8Array {
  const enc = new TextEncoder()
  const { time, date } = dosDateTime(when)
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const f of files) {
    const name = enc.encode(f.name)
    const data = enc.encode(f.text)
    const crc = crc32(data)
    const lh = new DataView(new ArrayBuffer(30))
    lh.setUint32(0, 0x04034b50, true) // local file header signature
    lh.setUint16(4, 10, true) // version needed (1.0)
    lh.setUint16(6, 0x0800, true) // flags: UTF-8 names
    lh.setUint16(8, 0, true) // method: stored
    lh.setUint16(10, time, true)
    lh.setUint16(12, date, true)
    lh.setUint32(14, crc, true)
    lh.setUint32(18, data.length, true) // compressed size
    lh.setUint32(22, data.length, true) // uncompressed size
    lh.setUint16(26, name.length, true)
    lh.setUint16(28, 0, true) // extra length
    const local = concat([new Uint8Array(lh.buffer), name, data])
    locals.push(local)

    const ch = new DataView(new ArrayBuffer(46))
    ch.setUint32(0, 0x02014b50, true) // central directory signature
    ch.setUint16(4, 20, true) // version made by
    ch.setUint16(6, 10, true) // version needed
    ch.setUint16(8, 0x0800, true)
    ch.setUint16(10, 0, true)
    ch.setUint16(12, time, true)
    ch.setUint16(14, date, true)
    ch.setUint32(16, crc, true)
    ch.setUint32(20, data.length, true)
    ch.setUint32(24, data.length, true)
    ch.setUint16(28, name.length, true)
    ch.setUint16(30, 0, true) // extra
    ch.setUint16(32, 0, true) // comment
    ch.setUint16(34, 0, true) // disk number
    ch.setUint16(36, 0, true) // internal attrs
    ch.setUint32(38, 0, true) // external attrs
    ch.setUint32(42, offset, true) // local header offset
    centrals.push(concat([new Uint8Array(ch.buffer), name]))
    offset += local.length
  }
  const cd = concat(centrals)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(4, 0, true)
  end.setUint16(6, 0, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, cd.length, true)
  end.setUint32(16, offset, true)
  end.setUint16(20, 0, true)
  return concat([...locals, cd, new Uint8Array(end.buffer)])
}

function concat(parts: Uint8Array[]) {
  const n = parts.reduce((s, p) => s + p.length, 0)
  const out = new Uint8Array(n)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}
