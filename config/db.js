const mongoose = require('mongoose');
require('dotenv').config({ path: 'variables.env' });

const conectarDB = async () => {
  try {
    // Se connecta a la base de datos.
    await mongoose.connect('mongodb://localhost/CRMGraphQL', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true
    });

    console.log('Base de datos conectada');
  } catch (error) {
    console.log('Hubo un error');
    console.error(error);
    process.exit(1);// Detener la app si hay un error
  }
}

module.exports = conectarDB;