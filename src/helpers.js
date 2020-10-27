module.exports = {
    parseXmlDb: (xmlData) => {
        tableNames = {};
        fieldNames = {};
        fieldRange = {};
        pkeys      = {};

        for (let i = 0; i < Object.keys(xmlData.database.table).length; i++) {
            let table = xmlData.database.table[i];
            tableNames[table.$.shortname] = table.$.name;

            for (let ii = 0; ii < table.fields[0]['field'].length; ii++) {
                let field = table.fields[0]['field'][ii];
                fieldNames[field.$.shortname] = field.$.name;

                if (field.$.type == 'DBOFIELDTYPE_INTEGER') {
                    fieldRange[table.$.name + field.$.name] = parseInt(field.$.rangelow);
                } else {
                    fieldRange[table.$.name + field.$.name] = 0;
                }

                if ('key' in field.$ && field.$.key === 'True') {
                    pkeys[table.$.name] = field.$.name;
                }
            }
        }

        return {
            tableNames,
            fieldNames,
            fieldRange,
            pkeys
        }
    },
    readNullbyteStr: (reader, length) => {
        let start = reader.position;
        let output = reader.readBytes(reader.buffer.indexOf('\x00', start) - start).toString(); // Read only from start to null byte
        reader.position = start + length;

        let badCharacters = [
            '"',
            ',',
            '\a',
            '\b',
            '\f',
            '\r',
            '\t',
        ];

        for (let i = 0; i < badCharacters.length; i++) {
            replacedOutput = output.replace(badCharacters[i], '');
        }

        return replacedOutput.replace('\n', '\\n');
    }
}
