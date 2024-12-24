// main.js (Punto de entrada)
import { createApp } from 'vue';
import App from './App.vue';
import './style.css'; // Aquí podrías agregar estilos globales

const app = createApp(App);
app.mount('#app');

// App.vue
<template>
  <div id="app">
    <header>
      <h1>Airbnb</h1>
      <h2>Reservar habitacion</h2>
    </header>
    <div class="room-grid">
      <div v-for="room in rooms" :key="room._id" :class="{ available: !room.isBooked, reserved: room.isBooked }" class="room-card">
        <p>{{ room.name }} - ${{ room.price }}</p>
        <p v-if="room.isBooked">Reservado por: {{ room.guest }}</p>
        <button  @click="selectRoom(room)">Seleccionar</button>
        <button v-if="room.isBooked" @click="cancelReservation(room)" class="cancel-button">Eliminar Reserva</button>
      </div>
    </div>
    <div v-if="selectedRoom" class="reservation-form">
      <h2>Reservar {{ selectedRoom.name }}</h2>
      <form @submit.prevent="confirmReservation">
        <label for="name">Nombre de la persona:</label>
        <input type="text" id="name" v-model="name" required />
        <button type="submit">Pagar</button>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      rooms: [],
      selectedRoom: null,
      name: '',
    };
  },
  async mounted() {
    await this.fetchRooms();
  },
  methods: {
    async fetchRooms() {
      try {
        const response = await fetch('http://localhost:3000/rooms');
        if (response.ok) {
          this.rooms = await response.json();
        } else {
          console.error('Error al cargar habitaciones:', response.statusText);
        }
      } catch (error) {
        console.error('Error de conexión al cargar habitaciones:', error);
      }
    },
    selectRoom(room) {
      this.selectedRoom = room;
    },
    async confirmReservation() {
      if (!this.name || !this.selectedRoom) return;

      try {
        const response = await fetch(`http://localhost:3000/rooms/${this.selectedRoom._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: this.name,
          }),
        });

        if (response.ok) {
          const updatedRoom = await response.json();
          this.selectedRoom.isBooked = updatedRoom.room.isBooked;
          this.selectedRoom.guest = updatedRoom.room.guest;
          this.selectedRoom = null;
          this.name = '';
          alert('Reserva confirmada');
          await this.fetchRooms(); // Actualiza el listado
        } else {
          alert('Error al reservar');
        }
      } catch (error) {
        console.error('Error al conectar con el servidor:', error);
      }
    },
    async cancelReservation(room) {
      try {
        const response = await fetch(`http://localhost:3000/rooms/${room._id}/cancel`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          alert('Reserva eliminada');
          await this.fetchRooms(); // Actualiza el listado
        } else {
          alert('Error al eliminar la reserva');
        }
      } catch (error) {
        console.error('Error al conectar con el servidor:', error);
      }
    },
  },
};
</script>

<style>
/* General Styles */
body {
  font-family: Arial, sans-serif;
  background-color: #ffffff;
  color: #000000;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
}

#app {
  text-align: center;
  padding: 20px;
  width: 100%;
  max-width: 1200px;
  border-radius: 8px;
  background-color: #f8f9fa;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
}

header {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: sticky;
  top: 0;
  background-color: #f8f9fa;
  z-index: 10;
}

h1 {
  font-size: 2rem;
  margin-bottom: 10px;
}

.room-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  max-width: 1200px; /* Limitar el ancho máximo */
  margin: 0 auto; /* Centrar la cuadrícula */
}

.room-card {
  padding: 10px;
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background-color: #e9ecef;
  text-align: left;
}

.available {
  border: 2px solid #28a745;
}

.reserved {
  border: 2px solid #dc3545;
}

button {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  background-color: #007bff;
  color: white;
}

button:hover {
  background-color: #0056b3;
}

button:disabled {
  cursor: not-allowed;
  background-color: #6c757d;
  color: #ffffff;
}

.cancel-button {
  margin-top: 5px;
  background-color: #dc3545;
}

.cancel-button:hover {
  background-color: #b02a37;
}

.reservation-form {
  margin-top: 2rem;
  text-align: left;
}

label {
  display: block;
  margin-bottom: 0.5rem;
}

input {
  padding: 8px;
  width: calc(100% - 16px);
  margin-bottom: 1rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
}

button[type="submit"] {
  width: 100%;
}

/* Media Queries para ajustar el diseño en pantallas grandes */
@media (min-width: 1024px) {
  .room-grid {
    grid-template-columns: repeat(3, 1fr); /* Limitar a 3 columnas */
  }
}
</style>
