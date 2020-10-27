const fs = require('fs').promises;
const xml2js = require('xml2js');
const { BufferReader } = require('@node-lightning/bufio');
const parser = require('./src/parser')(fs, xml2js, BufferReader); 

module.exports = (binaryData, fifaVersion) => parser.parseSave(binaryData, fifaVersion);
