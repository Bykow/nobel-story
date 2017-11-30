const request = require('request-promise');
const csvWriter = require('csv-write-stream');
const fs = require('fs');
const countries = require('i18n-iso-countries');


const writer = csvWriter({ headers: ['year', 'country', 'city', 'category', 'firstname', 'surname', 'gender'] });

/**
function openDatabaseConnection(context) {
  // what do I need ? connection options (addr, credentials)
  // what do I promise ? connection to MongoDB server
  console.log('Connecting to db..');
  return MongoClient.connect(context.dbUrl)
    .then((db) => {
      console.log('DB connection opened');
      context.db = db;
      return context;
    });
}
 */

function fetchNobelPrizes(context) {
  // what do I need ? REST API info, url, etc
  // what do I promise ? Array JSON of prizes
  console.log('Fetching Nobel Prizes via RestAPI..');
  return request(context.apiOptions)
    .then((result) => {
      console.log('Nobel Prizes fetched.');
      context.laureates = result.laureates;
      return context;
    });
}


function createCSV(context) {
  console.log('Creating CSV');
  return new Promise((resolve) => {
    writer.pipe(fs.createWriteStream('out.csv'));
    for (const i in context.laureates) {
      if (context.laureates[i].born === '0000-00-00') {
        console.log(`Skiping n°${i}`);
        continue;
      }

      const firstname = context.laureates[i].firstname;
      const surname = context.laureates[i].surname;
      const gender = context.laureates[i].gender;

      for (const j in context.laureates[i].prizes) {
        const year = context.laureates[i].prizes[j].year;
        const category = context.laureates[i].prizes[j].category;
        let country;
        if (context.laureates[i].prizes[j].affiliations[0].country === 'USA') {
          country = context.laureates[i].prizes[j].affiliations[0].country;
        } else {
          country = countries.getAlpha3Code(context.laureates[i].prizes[j].affiliations[0].country, 'en');
        }
        const city = context.laureates[i].prizes[j].affiliations[0].city;

        writer.write([year, country, city, category, firstname, surname, gender]);
      }
    }
    writer.end();
    writer.on('finish', () => { resolve(); });
  });
}

/**
function saveNobelPrizes(context) {
  // what do I need ? Array of nobel Prizes, connection to MongoDB server
  // what do I promise ? confirmation of saving in DB
  console.log('Saving Nobel Prizes in DB..');
  const collection = context.db.collection('laureates');
  return collection.insertMany(context.laureates)
    .then((results) => {
      console.log('Nobel Prizes saved.');
      return context;
    });
}
 */

/**
function closeDatabaseConnection(context) {
  // what do I need ? connection to DB
  // what do I promise ? confirmation closed connection
  console.log('Closing connection to DB..');
  return context.db.close()
    .then(() => {
      console.log('Connection closed.');
      return context;
    });
}
 */


function fetchAndSaveNobels() {
  // return promise that everything is done
  const context = {};
  context.apiOptions = {
    uri: 'http://api.nobelprize.org/v1/laureate.json',
    json: true,
  };

  return fetchNobelPrizes(context)
    .then(createCSV);
}


fetchAndSaveNobels()
  .then((result) => {
    console.log('We are done');
  })
  .catch((err) => {
    console.log('An Error occured');
    console.log(err);
  });
