<template>
  <div class="page">
    <header class="page__header">
      <h1 class="page__title">Estado del Agua</h1>
      <div class="page__controls">
        <label class="control">
          <span>Simulación (%)</span>
          <input type="range" min="0" max="100" v-model.number="simPercent" />
          <strong>{{ simPercent }}%</strong>
        </label>
      </div>
    </header>

    <section class="grid">
      <TankGauge
        title="Tanque Principal"
        :percent="simPercent"
        status="normal"
        hint="Consumo estable"
        color="blue"
      />

      <TankGauge
        title="Tanque Secundario"
        :percent="Math.max(0, simPercent - 45)"
        :status="(simPercent - 45) < 15 ? 'critical' : (simPercent - 45) < 35 ? 'warning' : 'normal'"
        hint="Comprar agua pronto"
        color="yellow"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
//import TankGauge from "~/components/TankGauge.vue";

const simPercent = ref(63);
</script>

<style scoped>
.page {
  padding: 18px;
  background: linear-gradient(180deg, #f4f8ff 0%, #ffffff 65%);
  min-height: 100vh;
}

.page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.page__title {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: #1f2a44;
}

.page__controls {
  background: #ffffff;
  border: 1px solid #e6edf8;
  border-radius: 14px;
  padding: 10px 12px;
  box-shadow: 0 10px 30px rgba(16, 24, 40, 0.05);
}

.control {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #54607a;
  font-size: 13px;
  font-weight: 700;
}

.control input[type="range"] {
  width: 220px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(280px, 1fr));
  gap: 16px;
}

@media (max-width: 900px) {
  .page__header {
    flex-direction: column;
    align-items: flex-start;
  }
  .grid {
    grid-template-columns: 1fr;
  }
  .control input[type="range"] {
    width: 180px;
  }
}
</style>
