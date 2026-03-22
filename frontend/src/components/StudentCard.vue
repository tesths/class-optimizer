<script setup lang="ts">
import type { Student } from '@/types'
import GrowthVisual from './GrowthVisual.vue'
import GrowthProgressBar from './GrowthProgressBar.vue'

defineProps<{
  student: Student
  theme: 'farm' | 'tree'
}>()

const emit = defineEmits<{
  (e: 'score', student: Student): void
  (e: 'edit', student: Student): void
  (e: 'view', student: Student): void
}>()

function getAvatarColor(name: string): string {
  const colors = [
    '#3D7A52', '#7D9A6F', '#C17A4E', '#8B6F4E',
    '#5D8A6B', '#9AAB8E', '#D4916A', '#A68B6B'
  ]
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}
</script>

<template>
  <div class="student-card card">
    <!-- Top accent line -->
    <div class="card-accent" :class="theme"></div>

    <!-- Header section -->
    <div class="card-header">
      <div
        class="student-avatar"
        :style="{ backgroundColor: getAvatarColor(student.name) }"
      >
        {{ student.name[0] }}
      </div>

      <div class="student-basic">
        <h3 class="student-name">{{ student.name }}</h3>
        <p class="student-no">学号 {{ student.student_no }}</p>
      </div>

      <GrowthVisual
        :stage="student.growth_stage || 'seed'"
        :theme="theme"
        size="small"
        :animated="true"
      />
    </div>

    <!-- Growth progress section -->
    <div class="growth-section">
      <GrowthProgressBar
        :score="student.total_score || 0"
        :theme="theme"
        size="small"
      />
    </div>

    <!-- Info section -->
    <div class="student-info">
      <div class="info-row">
        <div class="info-item">
          <span class="info-icon">👥</span>
          <span class="info-label">小组</span>
        </div>
        <span class="info-value">{{ student.group_name || '未分组' }}</span>
      </div>
      <div class="info-divider"></div>
      <div class="info-row">
        <div class="info-item">
          <span class="info-icon">⭐</span>
          <span class="info-label">积分</span>
        </div>
        <span class="info-value score">{{ student.total_score || 0 }}</span>
      </div>
    </div>

    <!-- Actions section -->
    <div class="card-actions">
      <button @click="emit('score', student)" class="btn btn-primary btn-sm">
        评分
      </button>
      <button @click="emit('edit', student)" class="btn btn-secondary btn-sm">
        编辑
      </button>
      <button @click="emit('view', student)" class="btn btn-ghost btn-sm">
        详情
      </button>
    </div>

    <!-- Decorative corner -->
    <div class="corner-decor">
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="10" r="6" fill="#A8C4A2" opacity="0.4"/>
        <circle cx="35" cy="20" r="3" fill="#C17A4E" opacity="0.3"/>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.student-card {
  padding: 0;
  overflow: hidden;
  position: relative;
  transition: all var(--duration-normal) var(--ease-out);
}

.student-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

/* Top accent */
.card-accent {
  height: 4px;
  transition: height var(--duration-normal) var(--ease-out);
}

.student-card:hover .card-accent {
  height: 5px;
}

.card-accent.farm {
  background: linear-gradient(90deg, var(--forest-500), var(--sage-500));
}

.card-accent.tree {
  background: linear-gradient(90deg, var(--forest-700), var(--forest-500));
}

/* Header */
.card-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  padding-bottom: var(--space-md);
}

.student-avatar {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-family: var(--font-accent);
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform var(--duration-normal) var(--ease-spring),
              box-shadow var(--duration-normal) var(--ease-out);
  position: relative;
  overflow: hidden;
}

.student-avatar::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%);
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.student-card:hover .student-avatar {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.student-card:hover .student-avatar::after {
  opacity: 1;
}

.student-basic {
  flex: 1;
  min-width: 0;
}

.student-name {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--forest-700);
  margin: 0;
  line-height: 1.2;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color var(--duration-fast) var(--ease-out);
}

.student-card:hover .student-name {
  color: var(--forest-500);
}

.student-no {
  font-family: var(--font-number);
  font-size: 12px;
  color: var(--brown-400);
  margin: 4px 0 0;
  font-variant-numeric: tabular-nums lining-nums;
}

/* Growth section */
.growth-section {
  padding: 0 var(--space-lg);
  margin-bottom: var(--space-md);
}

/* Info section */
.student-info {
  display: flex;
  align-items: center;
  padding: var(--space-md) var(--space-lg);
  background: var(--cream-100);
  margin: 0 var(--space-md);
  border-radius: var(--radius-md);
  transition: background var(--duration-normal) var(--ease-out);
}

.student-card:hover .student-info {
  background: var(--cream-200);
}

.info-row {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.info-icon {
  font-size: 14px;
  transition: transform var(--duration-normal) var(--ease-spring);
}

.student-card:hover .info-icon {
  transform: scale(1.1);
}

.info-label {
  font-size: 13px;
  color: var(--brown-400);
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--forest-700);
  transition: color var(--duration-fast) var(--ease-out);
}

.info-value.score {
  font-family: var(--font-number);
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--forest-500);
  font-variant-numeric: tabular-nums lining-nums;
}

.student-card:hover .info-value.score {
  color: var(--forest-700);
}

.info-divider {
  width: 1px;
  height: 24px;
  background: var(--cream-300);
  margin: 0 var(--space-md);
  transition: background var(--duration-fast) var(--ease-out);
}

.student-card:hover .info-divider {
  background: var(--cream-300);
}

/* Actions */
.card-actions {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-lg);
  padding-top: var(--space-md);
  opacity: 0.9;
  transition: opacity var(--duration-normal) var(--ease-out);
}

.student-card:hover .card-actions {
  opacity: 1;
}

.card-actions .btn {
  flex: 1;
  transition: all var(--duration-fast) var(--ease-out);
}

.card-actions .btn:hover {
  transform: translateY(-1px);
}

/* Corner decoration */
.corner-decor {
  position: absolute;
  top: 0;
  right: 0;
  width: 40px;
  height: 40px;
  opacity: 0;
  transform: translate(10px, -10px) scale(0.8);
  transition: opacity var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-spring);
}

.student-card:hover .corner-decor {
  opacity: 1;
  transform: translate(0, 0) scale(1);
}

/* Shine effect on card */
.student-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent 40%,
    rgba(255, 255, 255, 0.1) 50%,
    transparent 60%
  );
  transform: translateX(-100%);
  transition: transform 0.8s var(--ease-out);
  pointer-events: none;
  z-index: 1;
}

.student-card:hover::before {
  transform: translateX(100%);
}
</style>
