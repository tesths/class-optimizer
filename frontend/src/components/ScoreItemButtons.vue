<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ScoreItem } from '@/types'

const props = withDefaults(defineProps<{
  plusItems: ScoreItem[]
  minusItems: ScoreItem[]
  selectedId: number | null
  plusTitle?: string
  plusDescription?: string
  minusTitle?: string
  minusDescription?: string
  minusCollapsedByDefault?: boolean
}>(), {
  plusTitle: '加分项目',
  plusDescription: '优先把值得鼓励的表现点亮出来。',
  minusTitle: '减分项目',
  minusDescription: '只在需要提醒时再展开。',
  minusCollapsedByDefault: false
})

const emit = defineEmits<{
  (e: 'select', item: ScoreItem): void
}>()

const showMinusItems = ref(!props.minusCollapsedByDefault)

watch(
  () => props.minusCollapsedByDefault,
  (value) => {
    showMinusItems.value = !value
  }
)

function selectItem(item: ScoreItem) {
  emit('select', item)
}

function formatScore(item: ScoreItem) {
  return `${item.score_type === 'plus' ? '+' : '-'}${Math.abs(item.score_value)}`
}
</script>

<template>
  <div class="quick-items">
    <section class="item-section primary ui-soft-panel">
      <div class="section-copy">
        <span class="ui-eyebrow section-kicker">鼓励优先</span>
        <h4>{{ plusTitle }}</h4>
        <p class="ui-caption">{{ plusDescription }}</p>
      </div>
      <div class="item-buttons">
        <button
          v-for="item in plusItems"
          :key="item.id"
          :class="['item-btn', 'plus', { selected: selectedId === item.id }]"
          :aria-pressed="selectedId === item.id"
          @click="selectItem(item)"
        >
          <span class="item-name">{{ item.name }}</span>
          <span class="item-gap" aria-hidden="true"> </span>
          <span class="item-score ui-number">{{ formatScore(item) }}</span>
        </button>
      </div>
    </section>

    <section v-if="minusItems.length" class="item-section caution ui-soft-panel">
      <div class="section-top">
        <div class="section-copy">
          <span class="ui-eyebrow section-kicker">提醒备用</span>
          <h4>{{ minusTitle }}</h4>
          <p class="ui-caption">{{ minusDescription }}</p>
        </div>
        <button class="minus-toggle" type="button" @click="showMinusItems = !showMinusItems">
          {{ showMinusItems ? '收起提醒项' : '展开提醒项' }}
        </button>
      </div>

      <div v-if="showMinusItems" class="item-buttons">
        <button
          v-for="item in minusItems"
          :key="item.id"
          :class="['item-btn', 'minus', { selected: selectedId === item.id }]"
          :aria-pressed="selectedId === item.id"
          @click="selectItem(item)"
        >
          <span class="item-name">{{ item.name }}</span>
          <span class="item-gap" aria-hidden="true"> </span>
          <span class="item-score ui-number">{{ formatScore(item) }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.quick-items {
  display: grid;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
  padding: 0 var(--space-lg);
}

.item-section {
  position: relative;
  overflow: hidden;
  padding: 16px;
}

.item-section.primary {
  background: linear-gradient(180deg, rgba(232, 240, 234, 0.72), rgba(255, 255, 255, 0.95));
}

.item-section.caution {
  background: linear-gradient(180deg, rgba(245, 232, 222, 0.56), rgba(255, 255, 255, 0.95));
}

.item-section::after {
  content: '';
  position: absolute;
  inset: 0 auto auto 18px;
  width: 110px;
  height: 3px;
  border-radius: var(--radius-full);
  opacity: 0.88;
}

.item-section.primary::after {
  background: linear-gradient(90deg, rgba(107, 157, 122, 0.4), var(--forest-500), transparent);
}

.item-section.caution::after {
  background: linear-gradient(90deg, rgba(212, 145, 106, 0.4), var(--terra-500), transparent);
}

.section-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.section-copy {
  display: grid;
  gap: 4px;
}

.section-kicker {
  margin-bottom: 2px;
}

.section-copy h4 {
  margin: 0;
  font-size: 1.05rem;
  font-family: var(--font-display);
  color: var(--forest-700);
}

.section-copy p {
  margin-top: 0;
}

.item-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.item-btn,
.minus-toggle {
  transition: all var(--duration-fast) var(--ease-out);
}

.item-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  border: 2px solid var(--cream-300);
  border-radius: var(--radius-full);
  background: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: var(--brown-600);
  position: relative;
  overflow: hidden;
}

.item-name {
  font-weight: 700;
  letter-spacing: 0.01em;
}

.item-score {
  padding: 4px 9px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.8);
  font-size: 0.82rem;
  line-height: 1;
}

.item-btn:hover,
.minus-toggle:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.item-btn.plus {
  border-color: rgba(107, 157, 122, 0.55);
  color: var(--forest-700);
}

.item-btn.plus:hover {
  background: rgba(232, 240, 234, 0.75);
}

.item-btn.plus.selected {
  border-color: var(--forest-500);
  background: linear-gradient(135deg, var(--forest-500), var(--forest-700));
  color: white;
}

.item-btn.plus.selected .item-score {
  background: rgba(255, 255, 255, 0.18);
}

.item-btn.minus {
  border-color: rgba(193, 122, 78, 0.42);
  color: var(--terra-500);
}

.item-btn.minus:hover {
  background: rgba(245, 232, 222, 0.75);
}

.item-btn.minus.selected {
  border-color: var(--terra-400);
  background: linear-gradient(135deg, var(--terra-400), var(--terra-500));
  color: white;
}

.item-btn.minus.selected .item-score {
  background: rgba(255, 255, 255, 0.18);
}

.minus-toggle {
  border: none;
  border-radius: var(--radius-full);
  padding: 8px 12px;
  background: rgba(193, 122, 78, 0.14);
  color: var(--terra-500);
  cursor: pointer;
  font-family: var(--font-accent);
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

@media (max-width: 768px) {
  .quick-items {
    padding: 0 var(--space-md);
  }

  .section-top {
    flex-direction: column;
  }
}
</style>
