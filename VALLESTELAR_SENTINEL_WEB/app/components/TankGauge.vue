<template>
  <div class="tank-card">
    <div class="tank-card__header">
      <h3 class="tank-card__title">{{ title }}</h3>
    </div>

    <div class="tank-card__body">
      <div class="tank-card__svg">
        <svg viewBox="0 0 200 240" role="img" :aria-label="`Nivel ${pct}%`" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#d1e3f8" />
              <stop offset="20%" stop-color="#f0f7ff" />
              <stop offset="80%" stop-color="#f0f7ff" />
              <stop offset="100%" stop-color="#b8d4f0" />
            </linearGradient>

            <clipPath :id="jarShapeId">
              <path d="M60 40 L140 40 Q170 40 170 70 L170 210 Q170 215 165 215 L35 215 Q30 215 30 210 L30 70 Q30 40 60 40 Z" />
            </clipPath>
          </defs>

          <rect x="65" y="10" width="70" height="25" rx="5" fill="#93b1d9" />
          <rect x="65" y="30" width="70" height="10" fill="#7a9bc7" />

          <path 
            d="M60 40 L140 40 Q170 40 170 70 L170 210 Q170 215 165 215 L35 215 Q30 215 30 210 L30 70 Q30 40 60 40 Z" 
            fill="url(#glassGrad)" 
            stroke="#a5c4e8" 
            stroke-width="2"
          />

          <g :clip-path="`url(#${jarShapeId})`">
            <rect 
              :y="waterY" 
              x="0" 
              width="200" 
              :height="waterH + 100" 
              :fill="waterColor" 
              class="water-rect"
            />
            
            <rect :y="waterY" x="30" width="140" height="3" fill="rgba(255,255,255,0.2)" class="water-rect" />

            <g class="bubbles-container">
              <circle v-for="n in 10" :key="n" 
                :cx="20 + (Math.random() * 160)" 
                cy="220" 
                :r="1.5 + Math.random() * 2.5" 
                fill="white" 
                fill-opacity="0.6"
                class="bubble"
                :style="{
                  animationDelay: `${Math.random() * 4}s`,
                  left: `${Math.random() * 100}%`
                }"
              />
            </g>
          </g>

          <rect x="30" y="215" width="140" height="12" rx="4" fill="#6084b3" />
        </svg>
      </div>

      <div class="tank-card__metrics">
        <div class="tank-card__big">{{ pct.toFixed(0) }}%</div>
        <div class="tank-card__sub">
          <span class="tank-card__badge" :class="badgeClass">{{ statusLabel }}</span>
        </div>
        <div class="tank-card__progress">
          <div class="tank-card__progress-bar">
            <div class="tank-card__progress-fill" :style="{ width: pct + '%', background: waterColor }"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(defineProps<{
  title: string;
  percent: number;
  status?: "normal" | "warning" | "critical";
}>(), {
  status: "normal",
});

const jarShapeId = `jarShape-${Math.random().toString(16).slice(2)}`;
const pct = computed(() => Math.min(100, Math.max(0, props.percent)));

const jarTop = 40;
const jarBottom = 215;
const totalHeight = jarBottom - jarTop;

const waterH = computed(() => (pct.value / 100) * totalHeight);
const waterY = computed(() => jarBottom - waterH.value);

const waterColor = computed(() => {
  if (props.status === "critical") return "#d9534f";
  if (props.status === "warning") return "#f0ad4e";
  return "#1a66b8"; 
});

const statusLabel = computed(() => {
  if (props.status === "critical") return "Muy bajo";
  if (props.status === "warning") return "Aviso";
  return "Normal";
});

const badgeClass = computed(() => `badge--${props.status}`);
</script>

<style scoped>
.tank-card {
  background: #ffffff;
  border-radius: 18px;
  padding: 24px;
  max-width: 450px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
}

.tank-card__body {
  display: flex;
  align-items: center;
  gap: 30px;
}

.tank-card__svg {
  width: 130px;
  height: 180px;
}

.tank-card__title {
  font-size: 1.1rem;
  color: #444;
  margin-bottom: 15px;
}

.tank-card__big {
  font-size: 3.5rem;
  font-weight: 800;
  color: #1a2a3a;
  line-height: 1;
}

/* Animación del agua */
.water-rect {
  transition: y 0.8s cubic-bezier(0.4, 0, 0.2, 1), height 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Efecto de Burbujas */
.bubble {
  animation: rise 4s infinite ease-in;
}

@keyframes rise {
  0% {
    transform: translateY(0);
    opacity: 0;
  }
  10% {
    opacity: 0.6;
  }
  90% {
    opacity: 0.6;
  }
  100% {
    transform: translateY(-160px);
    opacity: 0;
  }
}

.tank-card__progress-bar {
  width: 100%;
  height: 10px;
  background: #f0f4f8;
  border-radius: 10px;
  margin-top: 15px;
  overflow: hidden;
}

.tank-card__progress-fill {
  height: 100%;
  transition: width 0.8s ease;
}

.badge--normal { color: #27ae60; font-weight: bold; }
.badge--warning { color: #f39c12; font-weight: bold; }
.badge--critical { color: #e74c3c; font-weight: bold; }
</style>