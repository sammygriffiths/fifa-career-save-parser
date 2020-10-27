const helpers = require('./helpers');

module.exports = (fs, xml2js, BufferReader) => {
    const databaseHeader = '\x44\x42\x00\x08\x00\x00\x00\x00';
    
    const parser = {
        unpackDbs: async (binaryData) => {
            let offset = binaryData.indexOf(databaseHeader);
    
            let reader = new BufferReader(binaryData);
    
            // Signature not found
            if (offset < 0) {
                return false
            }
    
            // Back to the start
            reader.position = 0;
    
            // Databases
            let DBs = [];
            let dbSize, endOfData;
            while (offset >= 0) {
                reader.position = offset + databaseHeader.length;
                dbSize = reader.readUInt32LE();
    
                reader.position = offset;
                endOfData = offset + dbSize;
    
                DBs.push(reader.readBytes(dbSize));
    
                offset = binaryData.indexOf(databaseHeader, endOfData);
            }
    
            return DBs;
        },
    
        readDb: async (binaryData, fifaVersion) => {
            let xmlFile = await fs.readFile(`xml/${fifaVersion}/fifa_ng_db-meta.xml`);
            let xmlData = await xml2js.parseStringPromise(xmlFile);
            let parsedXmlData = helpers.parseXmlDb(xmlData);
    
            let offset = binaryData.indexOf(databaseHeader);
    
            let reader = new BufferReader(binaryData);
    
            reader.readBytes(offset);
            reader.readBytes(databaseHeader.length);
    
            let dbSize = reader.readUInt32LE();
    
            if (dbSize != reader.buffer.length) {
                throw new Error('Invalid database size');
            }
    
            reader.readBytes(4); //Skip
    
            let tableCount = reader.readUInt32LE();
    
            reader.readBytes(4); //Skip
        
            let tableNames = [];
            let tableOffsets = [];
    
            for (let i = 0; i < tableCount; i++) {
                tableNames.push(reader.readBytes(4).toString());
                tableOffsets.push(reader.readUInt32LE());
            }
    
            reader.readBytes(4); //Skip
        
            let tablesStartOffset = reader.position;
    
            let allShortNames = [];
            let extractedData = {};
            let tableName, recordSize, validRecordsCount, fieldsCount, fieldType;
            let tmpFieldTypes, tmpBitOffsets, tmpShortNames, tmpBitDepth, strFieldIndex, sortedBitOffsets;
            let keys, fieldTypes, bitOffsets, shortNames, bitDepth;
    
            for (let i = 0; i < tableCount; i++) {
                tableName = parsedXmlData.tableNames[tableNames[i]];
    
                if (typeof tableName == 'undefined') {
                    continue;
                }
    
                reader.position = tablesStartOffset;
    
                reader.readBytes(tableOffsets[i]); //Skip
                reader.readBytes(4); //Skip
                recordSize = reader.readUInt32LE();
                reader.readBytes(10); //Skip
                validRecordsCount = reader.readUInt16LE();
                reader.readBytes(4); //Skip
                fieldsCount = reader.readUInt8();
                reader.readBytes(11); //Skip
        
                if (validRecordsCount <= 0) {
                    continue;
                }
    
                // Temporary (not sorted)
                tmpFieldTypes = []
                tmpBitOffsets = []
                tmpShortNames = []
                tmpBitDepth = []
                strFieldIndex = []
    
                for (let ii = 0; ii < fieldsCount; ii++) {
                    fieldType = reader.readUInt32LE();
    
                    tmpFieldTypes.push(fieldType);
                    tmpBitOffsets.push(reader.readUInt32LE());
                    tmpShortNames.push(reader.readBytes(4).toString());
                    tmpBitDepth.push(reader.readUInt32LE());
    
                    // String
                    if (fieldType == 0) {
                        strFieldIndex.push(ii);
                    }
                }
    
                sortedBitOffsets = Object.keys(tmpBitOffsets).sort((a, b) => {
                    return tmpBitOffsets[a] - tmpBitOffsets[b];
                });
    
                keys = [];
    
                fieldTypes = [];
                bitOffsets = [];
                shortNames = [];
                bitDepth = [];
    
                for (let ii = 0; ii < fieldsCount; ii++) {
                    let offset = sortedBitOffsets[ii];
                    fieldTypes.push(tmpFieldTypes[offset]);
                    bitOffsets.push(tmpBitOffsets[offset]);
                    shortNames.push(tmpShortNames[offset]);
                    bitDepth.push(tmpBitDepth[offset]);
    
                    let header = parsedXmlData.fieldNames[shortNames[ii]];
                    if (typeof header != 'undefined') {
                        keys.push(header);
                    }
                    allShortNames.push(shortNames);
                }
    
                let newContent = [];
    
                for (let ii = 0; ii < validRecordsCount; ii++) {
                    let record = {};
                    let tmpByte = 0;
                    let currentBitPos = 0;
                    let currentPosition = reader.position;
    
                    for (let iii = 0; iii < fieldsCount; iii++) {
                        let fieldType = fieldTypes[iii];
                        let value = '';
    
                        switch (fieldType) {
                            case 0: // string
                                tmpByte = 0;
                                currentBitPos = 0;
    
                                reader.position = currentPosition + (bitOffsets[iii] >> 3);
                                value = helpers.readNullbyteStr(reader, bitDepth[iii] >> 3);
                                break;
                            case 3: // int
                                let val = 0;
                                let startBit = 0;
    
                                let depth = bitDepth[iii];
    
                                if (currentBitPos != 0) {
                                    startBit = 8 - currentBitPos;
                                    val = tmpByte >> currentBitPos;
                                }
    
                                while (startBit < depth) {
                                    tmpByte = reader.readUInt8();
                                    val += tmpByte << startBit;
                                    startBit += 8;
                                }
    
                                // Remember bit position for next iteration
                                currentBitPos = (depth + 8 - startBit & 7);
                                val &= (1 << depth) - 1;
    
                                // Add rangeLow to the value
                                rangeLowKey = parsedXmlData.tableNames[tableNames[i]] + parsedXmlData.fieldNames[shortNames[iii]];
                                value = val + parsedXmlData.fieldRange[rangeLowKey];
                                break;
                            case 4: // float
                                reader.position = currentPosition + (bitOffsets[iii] >> 3);
                                value = reader.readUInt32LE();
                                break;
                            default:
                                break;
                        }
                        record[keys[Object.keys(record).length]] = value;
                    }
                    reader.position = currentPosition + recordSize;
                    newContent.push(record);
                }
                extractedData[tableName] = newContent;
            }
            return extractedData;
        },
    
        parseSave: (binaryData, fifaVersion) => {
            return parser.unpackDbs(binaryData).then(dbs => {
                return Promise.all(dbs.map(db => {
                    return parser.readDb(db, fifaVersion);
                }))
            });
        }
    }

    return parser;
};
