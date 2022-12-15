import { Client } from '@googlemaps/google-maps-services-js'
import fs from 'fs'
import { MongoClient } from 'mongodb';

const googleClient = new Client({})

var mongoUri = 'mongodb+srv://tim:PASSWORD@cluster0.cpcdlxi.mongodb.net/test';

const mongoClient = await MongoClient.connect(mongoUri)
const toiletsDatabase = await mongoClient.db('toilet-finder')
const toiletsCollection = await toiletsDatabase.collection('toilets')

let currentFetchIndex = 0;
const maxFetchCount = 5000;
const locations = []

const requestToilets = async (pageToken) => {
    googleClient.textSearch({
        params: {
            query: 'Toilet',
            key: 'GOOGLE_MAPS_KEY',
            outputFormat: 'json',
            pagetoken: pageToken,
        },
        timeout: 1000 // milliseconds
    }).then(result => {
        locations.push(result.data.results.flat())

        if(currentFetchIndex < maxFetchCount) {
            if(result.data.next_page_token) {
                console.log('fetching next page, and wait 3 seconds to wait for the next page token to become valid');
                setTimeout(() => {
                    console.log('fetching next page');
                    requestToilets(result.data.next_page_token)
                }, 3000)
                currentFetchIndex = currentFetchIndex + 1
            } else onDone('No more pages')
        } else {
            onDone('Max fetch count reached')
        }
    }).catch(e => {
        console.log('google error', e.response.data)
    })
}

const onDone = (reason) => {
    console.log('locations length', locations.length);

    toiletsCollection.insertMany(locations.flat()).then(result => {
        console.log('inserted', result.insertedCount);
    }).catch(e => {
        console.log(e);
    }).finally(() => {
        console.log('Stop reason was ', reason);
        mongoClient.close()
    })
}

console.log('Requesting toilets');
requestToilets(null)