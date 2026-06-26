const mongoose = require('mongoose'); //l'object document mapper di mongoDB


const connectDB = async () => { //arrow function asincrona
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connesso: ${conn.connection.host}`);
  } catch (err) {
    console.error(`Errore connessione MongoDB: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
