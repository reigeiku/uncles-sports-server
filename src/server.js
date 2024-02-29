import express from "express";
import events from "./tempEvent.js";

const app = express();
const port = 8000;
app.use(express.json());

const getNewDate = (timestamp) => {
    const date = timestamp.split("|")[0].split("-");
    const time = timestamp.split("|")[1].split("-")[0].split(":");

    return new Date(date[0], date[1] - 1, date[2], time[0], time[1]);
}

const eventResponseFactory = (event) => {
    const date = getNewDate(event.timestamp).toDateString();
    const time = event.timestamp.split("|")[1];

    return {
        eventId: event.eventId,
        name: event.name,
        host: event.host,
        sport: event.sport,
        date,
        time,
        location: event.location,
        image: event.image,
        price: event.price,
        players: event.players,
        totalNumOfPlayers: event.totalNumOfPlayers,
    }
}

app.get("/api/events", async (req, res) => {
    events.sort((a, b) => {
        const timestampA = getNewDate(a.timestamp);
        const timestampB = getNewDate(b.timestamp);

        return timestampA - timestampB;
    });

    const eventsResponse = [];
    
    for (const i in events) {
        const event = events[i];
        eventsResponse.push(eventResponseFactory(event));
    }

    res.send(eventsResponse);
});


app.get("/api/events/:eventId", async (req, res) => {
    const { eventId } = req.params;
    const event = events.find(event => eventId === event.eventId);
    const eventResponse = eventResponseFactory(event);

    res.json(eventResponse);
});

app.get("/api/events/:eventId", async (req, res) => {
    const { eventId } = req.params;
    const event = events.find(event => eventId === event.eventId);
    const eventResponse = eventResponseFactory(event);

    res.json(eventResponse);
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}.`);
});