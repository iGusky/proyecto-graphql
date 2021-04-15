const { ApolloServer } = require('apollo-server');
const typeDefs = require('./db/schema');
const resolvers = require('./db/resolvers')

// 1.- Crear servidor
const server = new ApolloServer({
  typeDefs, 
  resolvers,
  context: () => {
    const miContext = "Hola"
    return {miContext}
  }
});

//2.- Iniciar Servidor
server.listen()
  .then( ({url}) => {
    console.log("Servidor listo en la url" + url)
  })
  