[![Build Status](https://github.com/sammygriffiths/fifa-career-save-parser/workflows/build/badge.svg)](https://github.com/sammygriffiths/fifa-career-save-parser/actions)

# FIFA Career Mode Save Parser
A package for parsing PC career mode save files from FIFA 17 onwards.

## Installing
`npm install --save fifa-career-save-parser`

## Usage
This package takes a [Buffer](https://nodejs.org/api/buffer.html) containing FIFA career mode save file data along with the FIFA version number and parses the binary databases within before returning a promise containing the parsed data as an array. 

For example:
```js
const fs = require('fs').promises;
const fifaParser = require('fifa-career-save-parser');

fs.readFile('careerfile21').then(binaryData => {
    return fifaParser(binaryData, '21');
}).then(fifaDatabases => {
    console.log(fifaDatabases);
    /** 
    [
        {
            career_calendar: [ [Object] ],
            career_managerinfo: [ [Object] ],
            career_managerpref: [ [Object] ],
            career_users: [ [Object] ],
            career_competitionprogress: [
                [Object], [Object],
                [Object], [Object],
                [Object], [Object],
                [Object], [Object],
                [Object], [Object],
                [Object]
            ]... etc. 
        }
    ]
    **/
});
```

As you can see above, the returned data takes the form of an array of the databases as objects, which in turn contain each table within the database, which have inside all the records and fields. e.g:
```js
[
    { //database
        table: [
            { //record
                field: value
            }
        ]
    }
]
```

## Credits
This package is heavily inspired by the great work done by [xAranaktu](https://github.com/xAranaktu) on his [FIFA Tracker](https://github.com/xAranaktu/FIFA-Tracker) app.


## License
ISC © [Sammy Griffiths](http://www.sammygriffiths.co.uk)