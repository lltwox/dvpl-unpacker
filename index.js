var fs = require('fs-extra'),
    path = require('path'),
    lz4 = require('lz4');

/**
 * Compressor types defined in DAVA
 *
 */
const COMPRESSOR_TYPE = {
  NONE: 0,
  LZ4: 1,
  LZ4HC: 2,
  RFC1951: 3,
};

/**
 * Read given .dvpl file into a stream
 *
 * @param {String} filePath
 * @return {Object}
 */
module.exports.unpack = async function(filePath) {
  let absFilePath = path.join(__dirname, filePath);

  let stats = await fs.stat(absFilePath);
  let file = await fs.open(absFilePath, 'r');

  let footerBuf = Buffer.alloc(20);
  await fs.read(
    file, footerBuf, 0, footerBuf.length, stats.size - footerBuf.length
  );
  let footer = {
    sizeUncompressed: footerBuf.readUInt32LE(0),
    sizeCompressed: footerBuf.readUInt32LE(4),
    crcCompressed: footerBuf.readUInt32LE(8),
    type: footerBuf.readUInt32LE(12),
    marker: [
      String.fromCharCode(footerBuf.readInt8(16)),
      String.fromCharCode(footerBuf.readInt8(17)),
      String.fromCharCode(footerBuf.readInt8(18)),
      String.fromCharCode(footerBuf.readInt8(19))
    ].join('')
  };

  if (footer.marker != 'DVPL') throw new Error(
    `Unknown marker: ${footer.marker}`
  );
  if (footer.type != COMPRESSOR_TYPE.LZ4HC) throw new Error(
    `Unsupported compressor type: ${footer.type}`
  );

  let input = Buffer.alloc(footer.sizeCompressed);
  await fs.read(file, input, 0, footer.sizeCompressed, 0);

  let output = Buffer.alloc(footer.sizeUncompressed);
  lz4.decodeBlock(input, output);

  return output;
};
