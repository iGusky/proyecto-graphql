const { ApolloServer } = require('apollo-server');
const typeDefs = require('./db/schema');
const resolvers = require('./db/resolvers');
const conectarDB = require('./config/db');
const jwt = require('jsonwebtoken');
// 3. Conectar a la db
conectarDB();

// 1.- Crear servidor
const server = new ApolloServer({
  typeDefs, 
  resolvers,
  context: ({req}) => {
    // console.log(req.headers['authorization']);
    // console.log(req.headers)
    const token = req.headers['authorization'] || '';
    if( token ) {
      try {
        const usuario = jwt.verify(token.replace('Bearer ',''), 'PALABRASECRETA');
        console.log(usuario)
        return {usuario}
      } catch (error) {
        console.error(error)
      }
    }
  }
});

//2.- Iniciar Servidor
server.listen()
  .then( ({url}) => {
    console.log("Servidor listo en la url" + url)
  })
  