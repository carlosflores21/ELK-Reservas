const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const Room = require('./models/Room');
const { Client } = require('@elastic/elasticsearch'); // Importa Elasticsearch

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Configuración del cliente de Elasticsearch
const esClient = new Client({
  node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
  auth: {
    username: process.env.ELASTIC_USERNAME || 'elastic',
    password: process.env.ELASTIC_PASSWORD || 'password',
  },
});

// Test de conexión a Elasticsearch
esClient.ping({}, (error) => {
  if (error) {
    console.error('Elasticsearch no está conectado:', error);
  } else {
    console.log('Conectado a Elasticsearch');
  }
});

// Configuración del puerto
const PORT = process.env.PORT || 3000;

// Conexión a MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado a la base de datos'))
  .catch((error) => console.error('Error al conectar a MongoDB:', error));

// Ruta básica
app.get('/', (req, res) => {
  res.send('Hola Airbnb');
});

// Ruta para crear una habitación
app.get('/rooms', async (req, res) => {
  try {
    const rooms = await Room.find();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener las habitaciones' });
  }
});

// Ruta para crear una nueva habitación
app.post('/rooms', async (req, res) => {
  const { name, price } = req.body;

  try {
    const newRoom = new Room({
      name,
      price,
      isBooked: false, // Por defecto, la habitación está disponible
    });

    await newRoom.save();

    // Log en Elasticsearch
    await esClient.index({
      index: 'room-logs',
      body: {
        action: 'create',
        roomId: newRoom._id,
        name: newRoom.name,
        price: newRoom.price,
        timestamp: new Date(),
      },
    });

    res.status(201).json({ message: 'Habitación creada', room: newRoom });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear la habitación' });
  }
});

// Ruta para reservar una habitación
app.put('/rooms/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    // Busca la habitación por ID
    const room = await Room.findById(id);

    if (!room) {
      return res.status(404).json({ message: 'Habitación no encontrada' });
    }

    // Validación para verificar si ya está reservada
    if (room.guest !== 'None') {
      const errorMessage = `Conflicto: La habitación ya está reservada por ${room.guest}`;
      
      // Log en Elasticsearch para el conflicto
      await esClient.index({
        index: 'room-logs',
        body: {
          action: 'conflict',
          roomId: room._id,
          attemptedGuest: name,
          currentGuest: room.guest,
          timestamp: new Date(),
        },
      });

      console.error(errorMessage); // Log en consola
      return res.status(409).json({ message: errorMessage }); // Status 409: Conflict
    }

    // Actualiza el nombre del huésped y marca la habitación como reservada
    room.guest = name;
    room.isBooked = true;

    await room.save();

    // Log en Elasticsearch para la reserva
    await esClient.index({
      index: 'room-logs',
      body: {
        action: 'reserve',
        roomId: room._id,
        guest: name,
        timestamp: new Date(),
      },
    });

    res.json({ message: `Habitación reservada por ${name}`, room });
  } catch (error) {
    console.error('Error al actualizar la habitación:', error.message);
    res.status(500).json({ message: 'Error al actualizar la habitación' });
  }
});


// Ruta para eliminar una reserva
app.put('/rooms/:id/cancel', async (req, res) => {
  const { id } = req.params;

  try {
    // Busca la habitación por ID
    const room = await Room.findById(id);

    if (!room) {
      return res.status(404).json({ message: 'Habitación no encontrada' });
    }

    // Elimina el nombre del huésped y marca la habitación como no reservada
    room.guest = 'None';
    room.isBooked = false;

    await room.save();

    // Log en Elasticsearch
    await esClient.index({
      index: 'room-logs',
      body: {
        action: 'cancel',
        roomId: room._id,
        timestamp: new Date(),
      },
    });

    res.json({ message: 'Reserva eliminada', room });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la reserva' });
  }
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
