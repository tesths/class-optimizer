<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ScoreItem, StudentGroup } from '@/types'
import ScoreItemButtons from './ScoreItemButtons.vue'

const props = defineProps<{
  visible: boolean
  group: StudentGroup | null
  scoreItems: ScoreItem[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', data: { score_item_id: number | null; score_delta: number; remark: string }): void
}>()

const selectedItemId = ref<number | null>(null)
const remark = ref('')

const plusItems = computed(() => props.scoreItems.filter(item => item.score_type === 'plus' && item.enabled))
const minusItems = computed(() => props.scoreItems.filter(item => item.score_type === 'minus' && item.enabled))
const hasScoreItems = computed(() => plusItems.value.length > 0 || minusItems.value.length > 0)
const selectedItem = computed(() => props.scoreItems.find(item => item.id === selectedItemId.value) || null)
const selectedScoreDelta = computed(() => {
  if (!selectedItem.value) return 0
  return selectedItem.value.score_type === 'minus'
    ? -selectedItem.value.score_value
    : selectedItem.value.score_value
})

function selectItem(item: ScoreItem) {
  selectedItemId.value = item.id
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      selectedItemId.value = null
      remark.value = ''
    }
  }
)

function handleSubmit() {
  if (!selectedItem.value) return
  emit('submit', {
    score_item_id: selectedItem.value.id,
    score_delta: selectedScoreDelta.value,
    remark: remark.value,
  })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" @click.self="emit('close')">
      <div class="dialog">
        <div class="dialog-header">
          <div>
            <h3>给小组打分</h3>
            <p class="dialog-subtitle">{{ group?.name || '未选择小组' }}</p>
          </div>
          <button class="close-btn" type="button" @click="emit('close')">✕</button>
        </div>

        <div v-if="hasScoreItems" class="dialog-body">
          <div class="group-summary">
            <span class="summary-label">当前小组积分</span>
            <strong class="summary-score">{{ group?.total_score || 0 }}</strong>
            <span v-if="selectedItem" :class="['summary-delta', selectedItem.score_type]">
              {{ selectedScoreDelta > 0 ? '+' : '' }}{{ selectedScoreDelta }}
            </span>
          </div>

          <ScoreItemButtons
            :plus-items="plusItems"
            :minus-items="minusItems"
            :selected-id="selectedItemId"
            plus-title="小组奖励项"
            plus-description="选择预设的小组加分项目。"
            minus-title="小组提醒项"
            minus-description="需要扣分时再展开提醒项。"
          :minus-collapsed-by-default="true"
          @select="selectItem"
        />

          <div class="remark-section">
            <label class="input-label">备注</label>
            <input
              v-model="remark"
              type="text"
              class="input"
              placeholder="可选备注"
            />
          </div>
        </div>

        <div v-else class="dialog-body">
          <div class="empty-state ui-empty-state ui-soft-panel" data-empty-icon="👥">
            <p class="ui-empty-title">还没有可用小组积分项目</p>
            <p class="ui-empty-copy">请先到积分项目页新增“小组”类型的评分项。</p>
          </div>
        </div>

        <div class="dialog-actions">
          <button class="btn btn-secondary" type="button" @click="emit('close')">取消</button>
          <button class="btn btn-primary" type="button" :disabled="!selectedItemId" @click="handleSubmit">
            确认评分
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  background: rgba(26, 58, 36, 0.46);
  backdrop-filter: blur(12px);
  z-index: 1000;
}

.dialog {
  width: min(720px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(255, 253, 248, 0.98), rgba(255, 255, 255, 0.98));
  box-shadow: 0 24px 80px rgba(26, 58, 36, 0.22);
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 24px 12px;
}

.dialog-header h3 {
  margin: 0;
  color: var(--forest-700);
  font-family: var(--font-display);
}

.dialog-subtitle {
  margin: 6px 0 0;
  color: var(--brown-400);
}

.close-btn {
  border: none;
  background: transparent;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--brown-500);
}

.dialog-body {
  padding-bottom: 8px;
}

.group-summary {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 0 24px 16px;
}

.summary-label {
  color: var(--brown-400);
  font-size: 0.92rem;
}

.summary-score {
  color: var(--forest-700);
  font-size: 1.5rem;
  font-family: var(--font-number);
}

.summary-delta {
  font-weight: 800;
  font-family: var(--font-number);
}

.summary-delta.plus {
  color: var(--forest-700);
}

.summary-delta.minus {
  color: var(--terra-500);
}

.remark-section {
  display: grid;
  gap: 8px;
  padding: 0 24px 24px;
}

.input-label {
  color: var(--brown-400);
  font-size: 0.9rem;
  font-weight: 700;
}

.input {
  width: 100%;
  border: 1px solid rgba(229, 221, 208, 0.96);
  border-radius: 16px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--brown-600);
  font: inherit;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 0 24px 24px;
}

@media (max-width: 768px) {
  .dialog-actions {
    flex-direction: column-reverse;
  }

  .dialog-header,
  .group-summary,
  .remark-section,
  .dialog-actions {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>
