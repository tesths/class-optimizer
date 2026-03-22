<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ScoreItem, Student } from '@/types'
import {
  calculateGrowthStage,
  getGrowthGoalLabel,
  getGrowthLabel,
  getPointsToNextStage
} from '@/utils/growth'
import { getGardenThemeMeta } from '@/utils/garden'
import GrowthVisual from './GrowthVisual.vue'
import GrowthProgressBar from './GrowthProgressBar.vue'
import ScoreItemButtons from './ScoreItemButtons.vue'

const props = defineProps<{
  visible: boolean
  student: Student | null
  scoreItems: ScoreItem[]
  theme?: 'farm' | 'tree'
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', data: { score_item_id: number | null; score_delta: number; remark: string }): void
}>()

const selectedItemId = ref<number | null>(null)
const remark = ref('')

const currentTheme = computed(() => props.theme || 'farm')
const themeMeta = computed(() => getGardenThemeMeta(currentTheme.value))
const plusItems = computed(() => props.scoreItems.filter(item => item.score_type === 'plus' && item.enabled))
const minusItems = computed(() => props.scoreItems.filter(item => item.score_type === 'minus' && item.enabled))
const selectedItem = computed(() => props.scoreItems.find(item => item.id === selectedItemId.value) || null)
const selectedScoreDelta = computed(() => {
  if (!selectedItem.value) return 0
  return selectedItem.value.score_type === 'minus'
    ? -selectedItem.value.score_value
    : selectedItem.value.score_value
})
const hasScoreItems = computed(() => plusItems.value.length > 0 || minusItems.value.length > 0)

const previewScore = computed(() => (props.student?.total_score || 0) + selectedScoreDelta.value)
const previewGrowthStage = computed(() => calculateGrowthStage(currentTheme.value, previewScore.value))
const currentGrowthStage = computed(() => props.student?.growth_stage || 'seed')
const currentGrowthLabel = computed(() => getGrowthLabel(currentGrowthStage.value, currentTheme.value))
const previewGrowthLabel = computed(() => getGrowthLabel(previewGrowthStage.value, currentTheme.value))
const hasStageChange = computed(() => previewGrowthStage.value !== currentGrowthStage.value)
const isPositiveChange = computed(() => selectedScoreDelta.value > 0)

const currentGoalCopy = computed(() => {
  const currentScore = props.student?.total_score || 0
  const pointsToNext = getPointsToNextStage(currentTheme.value, currentScore)
  const nextLabel = getGrowthGoalLabel(currentTheme.value, currentScore)

  if (!pointsToNext) {
    return currentTheme.value === 'farm' ? '这片小菜园已经丰收啦。' : '这棵小树已经长成大树啦。'
  }

  return `再得 ${pointsToNext} 分就能${nextLabel}`
})

const previewMessage = computed(() => {
  if (!hasScoreItems.value) {
    return '请先在积分项目里配置可用的学生评分项。'
  }

  if (selectedScoreDelta.value === 0) {
    return currentGoalCopy.value
  }

  if (hasStageChange.value) {
    return `即将升级到 ${previewGrowthLabel.value}！`
  }

  if (isPositiveChange.value) {
    const pointsToNext = getPointsToNextStage(currentTheme.value, previewScore.value)
    if (!pointsToNext) {
      return currentTheme.value === 'farm' ? '这次会让花园进入丰收状态。' : '这次会让小树长成大树。'
    }

    return `还差 ${pointsToNext} 分就能${getGrowthGoalLabel(currentTheme.value, previewScore.value)}`
  }

  return '这次会让成长速度慢一点，后面再补回来。'
})

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      selectedItemId.value = null
      remark.value = ''
    }
  }
)

function selectQuickItem(item: ScoreItem) {
  selectedItemId.value = item.id
}

function handleSubmit() {
  if (!selectedItem.value) return
  emit('submit', {
    score_item_id: selectedItemId.value,
    score_delta: selectedScoreDelta.value,
    remark: remark.value
  })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" @click.self="emit('close')">
      <div class="dialog" :class="currentTheme">
        <div class="dialog-header">
          <div class="header-content">
            <div class="student-avatar" :class="currentTheme">
              {{ student?.name?.[0] }}
            </div>
            <div class="header-text">
              <h3>给 {{ student?.name }} 评分</h3>
              <p class="header-subtitle">{{ student?.group_name || '还没有加入小组' }}</p>
            </div>
          </div>
          <div class="header-actions">
            <span class="theme-pill ui-eyebrow">{{ themeMeta.actionVerb }}</span>
            <button class="close-btn" type="button" @click="emit('close')">✕</button>
          </div>
        </div>

        <section class="story-card" :class="currentTheme">
          <div class="story-main">
            <div class="status-card" :class="currentTheme">
              <div class="status-left">
                <GrowthVisual
                  :stage="currentGrowthStage"
                  :theme="currentTheme"
                  size="medium"
                  :animated="true"
                />
                <div class="status-info">
                  <div class="current-score">
                    <span class="score-label">当前积分</span>
                    <span class="score-value">{{ student?.total_score || 0 }}</span>
                  </div>
                  <div class="current-stage">
                    <span class="stage-label">成长阶段</span>
                    <span class="stage-name">{{ currentGrowthLabel }}</span>
                  </div>
                  <p class="goal-note">{{ currentGoalCopy }}</p>
                </div>
              </div>

              <div v-if="selectedScoreDelta !== 0" class="preview-section">
                <div class="preview-arrow">→</div>
                <div
                  class="preview-card"
                  :class="{
                    'stage-up': hasStageChange && isPositiveChange,
                    'stage-down': hasStageChange && !isPositiveChange,
                    positive: isPositiveChange,
                    negative: !isPositiveChange
                  }"
                >
                  <GrowthVisual
                    :stage="previewGrowthStage"
                    :theme="currentTheme"
                    size="small"
                    :animated="hasStageChange"
                  />
                  <div class="preview-info">
                    <span class="preview-score" :class="{ positive: isPositiveChange, negative: !isPositiveChange }">
                      {{ isPositiveChange ? '+' : '' }}{{ selectedScoreDelta }}
                    </span>
                    <span class="preview-stage-change">
                      {{ previewMessage }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="progress-section">
              <GrowthProgressBar
                :score="previewScore"
                :theme="currentTheme"
                size="medium"
              />
            </div>
          </div>

          <aside class="story-side">
            <div class="motivation-card ui-note-card">
              <strong class="ui-note-title">成长提示</strong>
              <p class="ui-note-copy">{{ previewMessage }}</p>
            </div>
            <div class="motivation-card ui-note-card accent">
              <strong class="ui-note-title">{{ currentTheme === 'farm' ? '今天的园地任务' : '今天的成长任务' }}</strong>
              <p class="ui-note-copy">{{ currentTheme === 'farm' ? '优先点亮值得表扬的表现，再处理提醒项。' : '先给学生浇灌成长，再做需要提醒的调整。' }}</p>
            </div>
          </aside>
        </section>

        <ScoreItemButtons
          v-if="hasScoreItems"
          :plus-items="plusItems"
          :minus-items="minusItems"
          :selected-id="selectedItemId"
          plus-title="奖励卡片"
          plus-description="先点亮值得鼓励的好表现。"
          minus-title="提醒项"
          minus-description="需要时再展开扣分提醒，避免第一眼就看到惩罚。"
          :minus-collapsed-by-default="true"
          @select="selectQuickItem"
        />
        <div v-else class="empty-items ui-empty-state ui-soft-panel" data-empty-icon="⭐">
          <p class="ui-empty-title">还没有可用积分项目</p>
          <p class="ui-empty-copy">请先到班级详情的积分项目页添加学生评分项。</p>
        </div>

        <div class="custom-input-section">
          <div v-if="selectedItem" class="selected-item-pill" :class="selectedItem.score_type">
            已选择：{{ selectedItem.name }}（{{ selectedItem.score_type === 'plus' ? '+' : '-' }}{{ selectedItem.score_value }}）
          </div>
          <div class="input-group">
            <label class="input-label">备注</label>
            <input
              v-model="remark"
              type="text"
              class="input"
              placeholder="可选备注"
            />
          </div>
        </div>

        <div class="dialog-actions">
          <button class="btn btn-secondary" type="button" @click="emit('close')">取消</button>
          <button
            class="btn btn-primary"
            type="button"
            @click="handleSubmit"
            :disabled="!selectedItemId"
          >
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
  width: min(760px, 100%);
  max-height: 92vh;
  overflow-y: auto;
  border-radius: 32px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 247, 242, 0.98));
  box-shadow: 0 30px 70px rgba(26, 58, 36, 0.24);
}

.dialog.tree {
  background: linear-gradient(180deg, rgba(247, 252, 249, 0.98), rgba(239, 247, 242, 0.98));
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 24px 12px;
}

.header-content,
.status-left,
.header-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-actions {
  align-items: flex-start;
}

.student-avatar {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  color: white;
  font-size: 1.35rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--forest-500), var(--forest-700));
  box-shadow: var(--shadow-md);
}

.student-avatar.tree {
  background: linear-gradient(135deg, #3d7a52, #2d5a3d);
}

.header-text h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.45rem;
  letter-spacing: 0.02em;
}

.header-subtitle {
  margin: 6px 0 0;
  color: var(--brown-400);
}

.theme-pill {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: var(--radius-full);
  background: rgba(61, 122, 82, 0.1);
  color: var(--forest-700);
}

.close-btn {
  border: none;
  background: rgba(107, 83, 68, 0.08);
  color: var(--brown-600);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
}

.story-card {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) 220px;
  gap: 16px;
  padding: 12px 24px 0;
}

.story-main {
  min-width: 0;
}

.status-card {
  padding: 20px;
  border-radius: 28px;
  background: linear-gradient(135deg, rgba(255, 244, 214, 0.76), rgba(255, 255, 255, 0.98));
  border: 1px solid rgba(255, 226, 146, 0.54);
}

.status-card.tree {
  background: linear-gradient(135deg, rgba(228, 243, 231, 0.88), rgba(255, 255, 255, 0.98));
  border-color: rgba(168, 196, 162, 0.58);
}

.status-left {
  align-items: flex-start;
}

.status-info {
  flex: 1;
  min-width: 0;
}

.current-score,
.current-stage {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.score-label,
.stage-label {
  color: var(--brown-400);
  font-family: var(--font-accent);
  font-size: 0.9rem;
  letter-spacing: 0.03em;
}

.score-value,
.stage-name {
  color: var(--forest-700);
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.score-value {
  font-family: var(--font-number);
  font-variant-numeric: tabular-nums lining-nums;
}

.goal-note {
  margin: 10px 0 0;
  color: var(--brown-400);
  font-size: 0.92rem;
}

.preview-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
}

.preview-arrow {
  font-size: 1.25rem;
  color: var(--forest-700);
  font-weight: 700;
}

.preview-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(229, 221, 208, 0.88);
}

.preview-card.positive {
  background: rgba(232, 240, 234, 0.92);
}

.preview-card.negative {
  background: rgba(245, 232, 222, 0.92);
}

.preview-card.stage-up {
  box-shadow: 0 16px 30px rgba(61, 122, 82, 0.14);
}

.preview-card.stage-down {
  box-shadow: 0 16px 30px rgba(193, 122, 78, 0.14);
}

.preview-info {
  display: grid;
  gap: 6px;
}

.preview-score {
  font-family: var(--font-number);
  font-size: 1rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums lining-nums;
}

.preview-score.positive {
  color: var(--forest-700);
}

.preview-score.negative {
  color: var(--terra-500);
}

.preview-stage-change {
  color: var(--brown-400);
  font-size: 0.9rem;
}

.progress-section {
  margin-top: 14px;
}

.story-side {
  display: grid;
  gap: 12px;
  align-content: start;
}

.custom-input-section {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  padding: 0 24px 24px;
}

.selected-item-pill {
  border-radius: 18px;
  padding: 12px 16px;
  font-size: 0.94rem;
  font-weight: 700;
}

.selected-item-pill.plus {
  background: rgba(232, 240, 234, 0.9);
  color: var(--forest-700);
}

.selected-item-pill.minus {
  background: rgba(245, 232, 222, 0.9);
  color: var(--terra-500);
}

.input-group {
  display: grid;
  gap: 8px;
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

.input:focus {
  outline: 2px solid rgba(61, 122, 82, 0.18);
  border-color: rgba(61, 122, 82, 0.4);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 0 24px 24px;
}

@media (max-width: 768px) {
  .dialog {
    border-radius: 24px;
  }

  .dialog-header,
  .story-card,
  .custom-input-section,
  .dialog-actions {
    padding-left: 16px;
    padding-right: 16px;
  }

  .story-card,
  .custom-input-section {
    grid-template-columns: 1fr;
  }

  .preview-section,
  .header-content,
  .header-actions {
    align-items: flex-start;
  }

  .dialog-header {
    flex-direction: column;
  }

  .dialog-actions {
    flex-direction: column-reverse;
  }

  .dialog-actions .btn {
    width: 100%;
  }
}
</style>
