const express = require('express');
const dotenv = require('dotenv').config()
const cors = require('cors');
const mongoose = require('mongoose');
const port = process.env.PORT;
const authRoute = require('./routers/auth');
const app = express();

app.use(cors())
app.use(express.json());

mongoose.set('strictQuery', false)
mongoose.connect(
    process.env.MONGO_URL,
    { useNewUrlParser: true, useUnifiedTopology: true },
    (err) => {
        if (!err) {
            console.log("Database Connected");
        } else {
            console.log("Database Not Connected", err);
        }
    }
);

app.use("/api", authRoute)

app.get('/', (req, res) => {
    res.send('server connected succeussfully')
});
app.listen(port, () => {
    console.log(`server running on port:${port}`)
});