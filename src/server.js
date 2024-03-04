import express from "express";
import { ExpressValidator } from "express-validator";
import { db, connectToDb } from "./db.js";

const app = express();
const port = 8000;
app.use(express.json());

const { body, validationResult } = new ExpressValidator(
    {
        isCustomTimestamp: value => {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            const timeRegex = /^(2[0-3]|[01]?[0-9]):([0-5]?[0-9])-(2[0-3]|[01]?[0-9]):([0-5]?[0-9])$/;
            const date = value.split("|")[0];
            const time = value.split("|")[1];
        
            if (!dateRegex.test(date)) {
                throw new TypeError("Timestamp given has an incorrect date value");
            }
        
            if (!timeRegex.test(time)) {
                throw new TypeError("Timestamp given has an incorrect time value");
            }
            
            const dateToCheck = getNewDate(value).toJSON().split("T")[0];

            if (date !== dateToCheck) {
                throw new TypeError("Date provided is not valid");
            }

            return true;
        }
    },
)

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
    try {
        const events = await db.collection("events").find({}).toArray();
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

        res.json(eventsResponse);
    } catch (error) {
        res.status(400).json({ type: error.name, error: error.message });
    }
});

app.post("/api/events", [
        body("name").exists().notEmpty().trim(),
        body("host").exists().notEmpty(),
        body("sport").exists().notEmpty().isIn(["Volleyball", "Basketball", "Badminton"]),
        body("timestamp").exists().notEmpty().isCustomTimestamp(),
        body("location").exists().notEmpty().trim(),
        body("image").exists().trim(),
        body("price").exists().notEmpty().isNumeric(),
        body("players").exists().notEmpty().isArray(),
        body("totalNumOfPlayers").exists().notEmpty().isNumeric(),
        ], async (req, res) => {
    const event = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const lastField = await db.collection("events").find().sort({_id: -1}).limit(1).toArray();
        const eventId = !lastField.length ? "0" : (parseInt(lastField[0].eventId) + 1).toString();
        const eventToInsert = {
            eventId,
            name: event.name,
            host: event.host,
            sport: event.sport,
            timestamp: event.timestamp,
            location: event.location,
            image: event.image,
            price: event.price,
            players: event.players,
            totalNumOfPlayers: event.totalNumOfPlayers,
        }

        await db.collection("events").insertOne(eventToInsert);

        res.status(201).json(eventToInsert);
    } catch (error) {
        res.status(400).json({ type: error.name, error: error.message });
    }
});

app.get("/api/events/:eventId", async (req, res) => {
    const { eventId } = req.params;
    
    try {
        const event = await db.collection("events").findOne({ eventId });

        if (!event) {
            const error = Error("Event does not exist");
            error.code = 404;
            throw error;
        }

        const eventResponse = eventResponseFactory(event);

        res.json(eventResponse);
    } catch (error) {
        const errorCode = error.code || 400;
        res.status(errorCode).json({ type: error.name, error: error.message });
    }
});

app.delete("/api/events/:eventId", async (req, res) => {
    const { eventId } = req.params;
    
    try {
        const event = await db.collection("events").findOneAndDelete({ eventId });

        if (!event) {
            const error = Error("Event does not exist");
            error.code = 404;
            throw error;
        }

        res.json(event);
    } catch (error) {
        const errorCode = error.code || 400;
        res.status(errorCode).json({ type: error.name, error: error.message });
    }
});

const requestBodyIsEmpty = (reqBody) => {
    for (const value in reqBody) {
        if (reqBody.hasOwnProperty(value)) {
            return false;
        }
    }
    return true;
}

app.put("/api/events/:eventId",[
        body("name").optional().notEmpty().trim(),
        body("sport").optional().isIn(["Volleyball", "Basketball", "Badminton"]),
        body("timestamp").optional().isCustomTimestamp(),
        body("location").optional().trim(),
        body("image").optional().trim(),
        body("price").optional().isNumeric(),
        body("totalNumOfPlayers").optional().isNumeric(),
        ], async (req, res) => {
    const { eventId } = req.params;
    const {
        name,
        sport,
        timestamp,
        location,
        image,
        price,
        totalNumOfPlayers } = req.body;
    
    try {
        const event = await db.collection("events").findOne({ eventId });
        
        if (!event) {
            const error = Error("Event does not exist");
            error.code = 404;
            throw error;
        }

        if (requestBodyIsEmpty(req.body)) {
            throw new Error("No changes were provided");
        }

        if (name) {
            await db.collection("events").updateOne({ eventId }, {
                $set: { name }
            });
        }

        if (sport) {
            await db.collection("events").updateOne({ eventId }, {
                $set: { sport }
            });
        }

        if (timestamp) {
            await db.collection("events").updateOne({ eventId }, {
                $set: { timestamp }
            });
        }

        if (location) {
            await db.collection("events").updateOne({ eventId }, {
                $set: { location }
            });
        }

        if (image) {
            await db.collection("events").updateOne({ eventId }, {
                $set: { image }
            });
        }

        if (price) {
            await db.collection("events").updateOne({ eventId }, {
                $set: { price }
            });
        }

        if (totalNumOfPlayers) {
            await db.collection("events").updateOne({ eventId }, {
                $set: { totalNumOfPlayers }
            });
        }

        res.status(200).json({ changes: req.body });
    } catch (error) {
        const errorCode = error.code || 400;
        res.status(errorCode).json({ type: error.name, error: error.message });
    }
});

connectToDb(() => {
    console.log("Successfully connected to the database.")
    app.listen(port, () => {
        console.log(`Server is listening on port ${port}.`);
    });
});