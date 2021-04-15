const { gql } = require('apollo-server');
// Schema.
// Los inputs pueden ir en querys o en resolvers, la sintaxis será la misma.
const typeDefs = gql`

  type Curso {
    titulo: String
  }
  
  type Tecnologia {
    tecnologia: String
  }

  input CursoInput {
    tecnologia: String
  }

  type Query {
    obtenerCursos(input: CursoInput!): [Curso]
    obtenerTecnologia: [Tecnologia]
  }
`;

module.exports = typeDefs;