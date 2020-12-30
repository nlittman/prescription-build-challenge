require('dotenv').config();

const express = require('express');
const path = require('path');
const twilio = require('twilio');
const bodyParser = require('body-parser');
var client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const ngrok = '{insert ngrok tunnel here}'

var app = express();

app.set('views', path. join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded());
app.use(bodyParser.urlencoded({ extended: true }));

// This would ideally be stored in some DB rather than locally
var patientOptInList = new Map();

app.get('/', (req, res, next) => {
    res.render('index');
})

app.post('/call-patient', (req, res) => {
    let patientPhoneNumber = `+1${req.body.number}`;
    console.log(req.body);
    client.calls.create({
        to: patientPhoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        url: 'https://handler.twilio.com/twiml/EHcde222cbd450e5688921285b687ea564',
        statusCallback: `${ngrok}/triggerSMS`,
        statusCallbackEvent: 'completed'
    })
    if (!patientOptInList.has(patientPhoneNumber)) patientOptInList.set(patientPhoneNumber, {firstName: req.body.firstName, lastName: req.body.lastName});
})

app.post('/triggerSMS', (req, res) => {
    let patient = patientOptInList.get(req.body.To);
    client.messages.create({
        to: req.body.To,
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        body: `Hello, ${patient.firstName} ${patient.lastName}, your prescription is ready to be picked up at Kings Landing Pharmacy. Reply STOP to opt out of future messages.`,
        statusCallback: `${ngrok}/unsubscribe`,
        statusCallbackEvent: 'failed'
    })
})

app.post('/unsubscribe', (req, res) => {
    if (req.body.ErrorCode == '21610') {
        console.log(`User OPT OUT detected. Deleting ${JSON.stringify(patientOptInList.get(req.body.To))} from database.`)
        patientOptInList.delete(req.body.To);
    }
})

app.listen(process.env.PORT, () => {
    console.log(`Server running at: http://localhost:${process.env.PORT}`)
})