const Usuario = require('../models/Usuarios');
const Producto = require('../models/Productos');
const Cliente = require('../models/Clientes');
const Pedido = require('../models/Pedidos');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Clientes = require('../models/Clientes');

const crearToken = ( usuario, palabraSecreta, expiresIn ) => {
  //* DATOS REQUERIDOS:
  //*  Información que se almacenaŕa
  //*  Palabra secreta
  //*  Tiempo de expiracion
  const { id, email, nombre, apellido } = usuario;
  return jwt.sign( { id, email, nombre, apellido }, palabraSecreta, { expiresIn } )
}

// Resolver
const resolvers = {
  Query: {
    obtenerUsuario: async (_, {}, ctx ) => {
     return ctx.usuario;
    },
    obtenerProductos: async () => {
      try {
        const productos = await Producto.find({});
        return productos;
      } catch (error) {
        console.error(error)
      }
    },
    obtenerProducto: async (_,{ id }) => {
      const producto = await Producto.findById(id);
      if(!producto) {
        throw new Error('Producto no encontrado');
      }
      return producto;
    },
    obtenerClientes: async () => {
      try {
        const clientes = await Clientes.find({});
        return clientes;
      } catch (error) {
        console.error(error)
      }
    },
    obtenerClientesVendedor: async (_,{}, ctx) => {
       try {
        const clientes = await Clientes.find({vendedor: ctx.usuario.id.toString()});
        return clientes;
      } catch (error) {
        console.error(error)
      }
    },
    obtenerCliente: async (_,{id},ctx) => {
      // Ver si existe
      const cliente = await Cliente.findById(id);
      if( !cliente ){
        throw new  Error("Cliente no encontrado");
      }
      // Ver si el que lo creó puede verlo
      if( cliente.vendedor.toString() !== ctx.usuario.id.toString()){
        throw new Error("Tus credenciales no son correctas");
      }
      // mostrar cliente
      return cliente;
    },
    obtenerPedidos: async () => {
      try {
        const pedidos = await Pedido.find({});
        return pedidos;
      } catch (error) {
        console.error(error)
      }
    },
    obtenerPedidosVendedor: async (_, {}, ctx) =>{
      try {
        const pedidos = await Pedido.find({vendedor: ctx.usuario.id});
        return pedidos;
      } catch (error) {
        console.error(error)
      }
    },
    obtenerPedido: async (_,{id}, ctx) => {
      // Existe el pedido?
      const pedido = await Pedido.findById(id);
      if(!pedido) throw new Error("Pedido no encontrado")

      // El creador es correcto?
      if(pedido.vendedor.toString() !== ctx.usuario.id.toString()) throw new Error("Acción no permitida")

      return pedido

    },
    obtenerPedidoEstado: async (_, {estado}, ctx) => {
      const pedidos = await Pedido.find({ vendedor: ctx.usuario.id.toString(), estado});
      return pedidos;
    },
    mejoresClientes: async () => {
      const clientes = await Pedido.aggregate([
        { $match: { estado: "COMPLETADO"} },
        { $group : {
          _id: "$cliente", 
          total: { $sum: '$total'}
        } },
        {
          $lookup: {
            from: 'clientes',
            localField: '_id',
            foreignField: '_id',
            as: "cliente"
          }
        },
        {
          $sort: { total: -1}
        }
      ]);

      return clientes;
    },
    mejoresVendedores: async () => {
      const vendedores = Pedido.aggregate([
        { $match: { estado: "COMPLETADO" }},
        { $group: {
            _id: "$vendedor",
            total: { $sum: '$total' }
        }},
        {
          $lookup: {
            from: 'usuarios',
            localField: '_id',
            foreignField: '_id',
            as: 'vendedor'
          },
        },
        { $limit: 3 },
        { $sort: { total: -1} }
      ]);
      return vendedores;
    },
    buscarProducto: async (_,{texto}) => {
      const productos = await Producto.find({ $text: { $search: texto }});
      return productos;
    }
  },
  Mutation: {

    nuevoUsuario: async (_, { input }) => {

      const { email, password } = input;
      // Revisar si el usuario ya está registrado
      const existeUsuario = await Usuario.findOne({ email });
      console.log( existeUsuario );
      if( existeUsuario ) {
        throw new Error('El usuario ya está registrado');

      }
      // Hashear password
      const salt = await bcryptjs.genSalt(10);
      input.password = await bcryptjs.hash( password, salt);

      // Guardarlo en la base de datos
      try {
        const usuario = new Usuario(input);
        usuario.save();
        return usuario;

      } catch (error) {
        console.error(error)
      }
    },
    autenticarUsuario: async (_, {input}) => {
      const { email, password } = input;

      // validar usuario que exista
      const existeUsuario = await Usuario.findOne({email});
      if( !existeUsuario ){
        throw new Error('El usuario no existe')
      }

      // Revisar que el password sea correcto
      const passwordCorrecto = await bcryptjs.compare( password, existeUsuario.password );
      if( !passwordCorrecto ){
        throw new Error('El password es incorrecto');
      }

      // Crear token
      return {
        token: crearToken( existeUsuario, 'PALABRASECRETA', '24h' )
      }
    },
    nuevoProducto: async (_, {input}) => {
      try {
        const producto = new Producto(input);
        const resultado = await producto.save();
        return resultado;
      } catch (error) {
        console.error(error);
      }
    },
    actualizarProducto: async (_, {id, input}) => {
      // Verificar que exista
      let producto = await Producto.findById(id);
      if(!producto) {
        throw new Error('Producto no encontrado');
      }

      // Actualizar producto
      producto = await Producto.findOneAndUpdate({ _id: id }, input, { new: true } ); // new: true hacer quenos retorne el nuevo objeto con la nueva información.

      return producto;
    },
    eliminarProducto: async(_, {id}) => {
      // Verificar que exista
      let producto = await Producto.findById(id);
      if(!producto) {
        throw new Error('Producto no encontrado');
      }
      // Elimina
      await Producto.findOneAndDelete({ _id: id });
      return "Producto Eliminado"
    },
    nuevoCliente: async(_, {input}, ctx) => {
      console.log(ctx)
      // Verificar si el cliente ya está registrado
      // console.log(input)
      const { email } = input
      const cliente = await Cliente.findOne({email});
      if( cliente ){
        throw new Error('Correo electrónico ya está en uso');
      } 
      const nuevoCliente = new Cliente(input);

      // Asignar vendedor
      nuevoCliente.vendedor = ctx.usuario.id

      // Registrar cliente
      try {
        const resultado = await nuevoCliente.save();
        return resultado;
      } catch (error) {
        console.error(errr)
      }
    },
    actualizarCliente: async(_,{id, input}, ctx) => {
      // Verificar que exista
      let cliente = await Cliente.findById(id);
      if( !cliente ){
        throw new Error('El cliente no existe');
      }
      // Verificar el vendedor
      if( cliente.vendedor.toString() !== ctx.usuario.id.toString()){
        throw new Error("Tus credenciales no son correctas");
      }
      // Guardar Cliente
      cliente = await Cliente.findOneAndUpdate({_id: id}, input, {new:true});
      return cliente;
    },
    eliminarCliente: async(_,{id},ctx) => {
      // Verificar que exista
      let cliente = await Cliente.findById(id);
      if( !cliente ){
        throw new Error('El cliente no existe');
      }
      // Verificar el vendedor
      if( cliente.vendedor.toString() !== ctx.usuario.id.toString()){
        throw new Error("Tus credenciales no son correctas");
      }
      // Eliminar cliente
      await Cliente.findOneAndDelete({_id: id});
      return "Cliente eliminado"
    },
    nuevoPedido: async(_,{input},ctx) => {
      // Verificar que exista el cliente
      const cliente = await Cliente.findById(input.cliente);
      if( !cliente ){
        throw new Error('El cliente no existe');
      }
      // Verificar si el cliente es del vendedor
      if( cliente.vendedor.toString() !== ctx.usuario.id.toString()){
        throw new Error("Tus credenciales no son correctas");
      }
      // Revisar stock disponible
      for await( const articulo of input.pedido ) {
        const { id } = articulo;
        const producto = await Producto.findById(id);
        if( articulo.cantidad > producto.existencia ){
          throw new Error(`El articulo ${producto.nombre} excede la cantidad disponible`);
        } else {
          // restar cantidad disponible
          producto.existencia = producto.existencia - articulo.cantidad
          await producto.save();
        }
      };
      // Crear pedido
      const nuevoPedido = new Pedido(input);
      // Asignar vendedor
      nuevoPedido.vendedor = ctx.id;
      // Guardarlo en la BD
      const resultado = await nuevoPedido.save();
      return resultado
    },
    actualizarPedido: async(_,{id, input}, ctx) => {
      // Existe el pedido?
      const existePedido = await Pedido.findById(id);
      if(!existePedido) throw new Error("Pedido no encontrado")

      // Cliente existe?
      const existeCliente = await Cliente.findById(input.cliente);
      if(!existeCliente) {throw new Error("Cliente no encontrado")}

      // El creador es correcto?
      if(existeCliente.vendedor.toString() !== ctx.usuario.id.toString()) {throw new Error("Acción no permitida")}

      // Revisar stock disponible
      if( input.pedido ){
        for await( const articulo of input.pedido ) {
          const { id } = articulo;
          const producto = await Producto.findById(id);
          if( articulo.cantidad > producto.existencia ){
            throw new Error(`El articulo ${producto.nombre} excede la cantidad disponible`);
          } else {
            // restar cantidad disponible
            producto.existencia = producto.existencia - articulo.cantidad
            await producto.save();
          }
        };
      }
      // Guardar
      const resultado = await Pedido.findOneAndUpdate({_id: id}, input,{new: true});
      return resultado;
    },
    eliminarPedido: async (_,{id}, ctx) => {
      // Verificar que exista el pedido
      const pedido = await Pedido.findById(id);
      if( !pedido ){
        throw new Error('El pedido no existe');
      }
      // Verificar si el cliente es del vendedor
      if( pedido.vendedor.toString() !== ctx.usuario.id.toString()){
        throw new Error("Tus credenciales no son correctas");
      }
      // eliminar de la bd
      await Pedido.findOneAndDelete({_id:id});
      return ("Pedido eliminado correctamente")
    }
  }
}

module.exports = resolvers;