<script setup lang="ts">
import { ref, watch } from 'vue'
import type { StudentGroup } from '@/types'

defineProps<{
  groups?: StudentGroup[]
}>()

const searchQuery = defineModel<string>('search', { default: '' })
const groupFilter = defineModel<number | null>('groupId', { default: null })

const localSearch = ref(searchQuery.value)
const localGroupId = ref<number | null>(groupFilter.value)

watch(localSearch, (val) => { searchQuery.value = val })
watch(localGroupId, (val) => { groupFilter.value = val })
</script>

<template>
  <div class="filters ui-soft-panel">
    <div class="filters-copy">
      <span class="ui-eyebrow">课堂筛选台</span>
      <p class="ui-caption">按姓名或小组快速找到要关注的同学。</p>
    </div>

    <div class="filters-controls">
      <label class="sr-only" for="student-search">搜索学生姓名或学号</label>
      <div class="input-wrapper search-field">
        <input
          id="student-search"
          v-model="localSearch"
          type="text"
          class="input search-input"
          placeholder="搜索学生姓名或学号"
          aria-label="搜索学生姓名或学号"
        />
        <span class="input-icon" aria-hidden="true">⌕</span>
      </div>

      <label class="sr-only" for="student-group-filter">按小组筛选学生</label>
      <select
        id="student-group-filter"
        v-model="localGroupId"
        class="input select-input"
        aria-label="按小组筛选学生"
      >
        <option :value="null">全部小组</option>
        <option v-for="group in groups" :key="group.id" :value="group.id">
          {{ group.name }}
        </option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.filters {
  position: relative;
  z-index: 1;
  margin: var(--space-lg) var(--space-xl) 0;
  padding: var(--space-md) var(--space-lg);
  display: grid;
  gap: var(--space-md);
  transition: box-shadow var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
}

.filters:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.filters::after {
  content: '';
  position: absolute;
  inset: 0 auto auto 24px;
  width: 120px;
  height: 3px;
  border-radius: var(--radius-full);
  background: linear-gradient(90deg, var(--sage-300), var(--forest-500), transparent);
}

.filters-copy {
  display: grid;
  gap: 4px;
}

.filters-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px;
  gap: var(--space-md);
  align-items: center;
}

.search-input {
  padding-left: 46px;
}

.search-field .input-icon {
  font-family: var(--font-accent);
  font-size: 0.95rem;
  color: var(--forest-500);
}

.select-input {
  width: 100%;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238B7060' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 40px;
  transition: all var(--duration-fast) var(--ease-out);
}

.select-input:hover {
  border-color: var(--sage-300);
  background-color: var(--cream-50);
}

.select-input:focus {
  outline: none;
  border-color: var(--forest-500);
  box-shadow: 0 0 0 4px rgba(61, 122, 82, 0.1);
}

@media (max-width: 768px) {
  .filters {
    margin: var(--space-md) var(--space-lg) 0;
  }

  .filters-controls {
    grid-template-columns: 1fr;
  }
}
</style>
