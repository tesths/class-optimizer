<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getClasses } from '@/api/classes'
import type { Class } from '@/types'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const classes = ref<Class[]>([])
const loading = ref(false)

onMounted(async () => {
  await authStore.fetchUser()
  await fetchClasses()
})

// Refresh class list when navigating back to the home page
watch(() => route.path, async (newPath, oldPath) => {
  if (newPath === '/' && oldPath !== newPath) {
    await fetchClasses()
  }
})

async function fetchClasses() {
  loading.value = true
  try {
    classes.value = await getClasses()
  } finally {
    loading.value = false
  }
}

function goToClass(cls: Class) {
  router.push(`/class/${cls.id}`)
}

function getThemeIcon(theme: string) {
  return theme === 'farm' ? '🌻' : '🌲'
}

function getThemeLabel(theme: string) {
  return theme === 'farm' ? '开心农场' : '成长树林'
}
</script>

<template>
  <div class="page-container">
    <!-- Background pattern -->
    <div class="bg-pattern"></div>

    <!-- Header -->
    <header class="page-header">
      <div class="header-content">
        <div class="header-left">
          <div class="logo-mark">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="#E8F0EA"/>
              <path d="M20 10C20 10 14 14 14 19C14 24 20 28 20 28C20 28 26 24 26 19C26 14 20 10 20 10Z" fill="#3D7A52"/>
              <path d="M20 28V32" stroke="#3D7A52" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="header-title-group">
            <h1 class="page-title">我的班级</h1>
            <p class="header-subtitle ui-caption">欢迎，{{ authStore.user?.teacher_profile?.real_name || '老师' }}</p>
          </div>
        </div>

        <div class="header-actions">
          <router-link to="/profile" class="btn btn-secondary">
            <span>👤</span> 个人中心
          </router-link>
          <button @click="authStore.logout(); router.push('/login')" class="btn btn-ghost">
            退出
          </button>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="page-content">
      <!-- Actions bar -->
      <div class="content-header">
        <div class="actions-left ui-section-stack">
          <span class="ui-eyebrow">班级总览</span>
          <div class="title-row">
            <h2 class="section-title ui-section-title">全部班级</h2>
            <span class="class-count ui-pill-meta">{{ classes.length }} 个班级</span>
          </div>
        </div>
        <button class="btn btn-primary" @click="router.push('/class/new')">
          <span class="btn-icon">+</span>
          新建班级
        </button>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="loading-state">
        <div class="loading-intro ui-section-stack">
          <span class="ui-eyebrow">班级加载中</span>
          <p class="ui-section-copy">正在把班级卡片整理到桌面上。</p>
        </div>
        <div class="skeleton-grid">
          <div v-for="i in 3" :key="i" class="skeleton-card">
            <div class="skeleton skeleton-icon"></div>
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text short"></div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="classes.length === 0" class="empty-state">
        <div class="empty-illustration">
          <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="100" cy="140" rx="80" ry="15" fill="#E8F0EA"/>
            <path d="M100 130V80" stroke="#3D7A52" stroke-width="3" stroke-linecap="round"/>
            <path d="M80 100C80 100 70 110 60 105C50 100 60 85 80 100Z" fill="#7D9A6F" opacity="0.6"/>
            <path d="M120 100C120 100 130 110 140 105C150 100 140 85 120 100Z" fill="#7D9A6F" opacity="0.6"/>
            <ellipse cx="100" cy="70" rx="35" ry="25" fill="#A8C4A2" opacity="0.5"/>
            <circle cx="85" cy="65" r="5" fill="#C17A4E" opacity="0.4"/>
            <circle cx="110" cy="60" r="4" fill="#C17A4E" opacity="0.3"/>
            <path d="M60 140V145M100 135V145M140 140V145" stroke="#C17A4E" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <h3 class="empty-title">还没有班级</h3>
        <p class="empty-text">点击上方按钮创建您的第一个班级，开启成长记录之旅</p>
        <button class="btn btn-primary" @click="router.push('/class/new')">
          创建第一个班级
        </button>
      </div>

      <!-- Class grid -->
      <div v-else class="class-grid stagger-children">
        <div
          v-for="cls in classes"
          :key="cls.id"
          class="class-card card"
          @click="goToClass(cls)"
        >
          <!-- Theme indicator -->
          <div class="card-accent" :class="cls.visual_theme"></div>

          <!-- Card content -->
          <div class="card-main">
            <div class="theme-badge" :class="cls.visual_theme">
              <span class="theme-icon">{{ getThemeIcon(cls.visual_theme) }}</span>
              <span class="theme-label">{{ getThemeLabel(cls.visual_theme) }}</span>
            </div>

            <h3 class="class-name">{{ cls.name }}</h3>

            <div class="class-meta">
              <div class="meta-item">
                <span class="meta-icon">📚</span>
                <span>{{ cls.grade }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-icon">📅</span>
                <span>{{ cls.school_year }}</span>
              </div>
            </div>

            <div class="class-stats">
              <div class="stat-item">
                <span class="stat-value">{{ cls.student_count || 0 }}</span>
                <span class="stat-label">学生</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span class="stat-value">{{ cls.teacher_count || 0 }}</span>
                <span class="stat-label">教师</span>
              </div>
            </div>
          </div>

          <!-- Card footer -->
          <div class="card-footer">
            <button class="btn btn-primary btn-sm">进入班级</button>
            <button @click.stop="router.push(`/class/${cls.id}/edit`)" class="btn btn-secondary btn-sm">
              编辑
            </button>
          </div>

          <!-- Hover decoration -->
          <div class="card-decoration">
            <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="10" r="8" fill="#A8C4A2" opacity="0.3"/>
              <circle cx="55" cy="25" r="5" fill="#C17A4E" opacity="0.2"/>
            </svg>
          </div>
        </div>
      </div>
    </main>

    <!-- Decorative footer -->
    <div class="page-footer-decoration">
      <svg viewBox="0 0 1200 60" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <path d="M0 30C200 60 400 0 600 30C800 60 1000 0 1200 30V60H0V30Z" fill="#E8F0EA"/>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  min-height: 100vh;
  background: var(--cream-100);
  position: relative;
}

.page-header {
  background: white;
  border-bottom: 1px solid var(--cream-200);
  padding: var(--space-lg) var(--space-xl);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: var(--shadow-sm);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.logo-mark {
  width: 44px;
  height: 44px;
}

.logo-mark svg {
  width: 100%;
  height: 100%;
}

.header-title-group {
  display: flex;
  flex-direction: column;
}

.page-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--forest-700);
  margin: 0;
  line-height: 1.2;
  letter-spacing: 0.02em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

/* Main content */
.page-content {
  padding: var(--space-xl);
  max-width: 1400px;
  margin: 0 auto;
}

.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-xl);
}

.actions-left {
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.btn-icon {
  font-size: 18px;
  font-weight: 600;
  line-height: 1;
}

/* Loading state */
.loading-state {
  padding: var(--space-xl) 0;
}

.loading-intro {
  margin-bottom: var(--space-lg);
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-lg);
}

.skeleton-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.skeleton-icon {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-md);
}

.skeleton-title {
  width: 70%;
  height: 24px;
}

.skeleton-text {
  width: 100%;
  height: 16px;
}

.skeleton-text.short {
  width: 50%;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: var(--space-3xl) var(--space-xl);
  animation: fadeInUp 0.6s var(--ease-out);
}

.empty-illustration {
  width: 200px;
  height: 160px;
  margin: 0 auto var(--space-xl);
}

.empty-illustration svg {
  width: 100%;
  height: 100%;
}

.empty-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  color: var(--forest-700);
  margin-bottom: var(--space-sm);
}

.empty-text {
  color: var(--brown-400);
  margin-bottom: var(--space-xl);
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

/* Class grid */
.class-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-lg);
}

.class-card {
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  transition: all var(--duration-normal) var(--ease-out);
  animation: fadeInUp 0.5s var(--ease-out) both;
}

.class-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.card-accent {
  height: 6px;
}

.card-accent.farm {
  background: linear-gradient(90deg, var(--forest-500), var(--sage-500));
}

.card-accent.tree {
  background: linear-gradient(90deg, var(--forest-700), var(--forest-500));
}

.card-main {
  padding: var(--space-lg);
}

.theme-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  font-family: var(--font-accent);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  margin-bottom: var(--space-md);
}

.theme-badge.farm {
  background: var(--forest-100);
  color: var(--forest-700);
}

.theme-badge.tree {
  background: var(--sage-100);
  color: var(--sage-500);
}

.theme-icon {
  font-size: 14px;
}

.class-name {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--forest-700);
  letter-spacing: 0.015em;
  margin-bottom: var(--space-md);
}

.class-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--brown-400);
}

.meta-icon {
  font-size: 14px;
}

.class-stats {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-md);
  background: var(--cream-100);
  border-radius: var(--radius-md);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.stat-value {
  font-family: var(--font-number);
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--forest-700);
  line-height: 1;
  font-variant-numeric: tabular-nums lining-nums;
}

.stat-label {
  font-family: var(--font-accent);
  font-size: 12px;
  color: var(--brown-400);
  margin-top: 4px;
  letter-spacing: 0.04em;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: var(--cream-300);
}

.card-footer {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg);
  border-top: 1px solid var(--cream-200);
  background: var(--cream-50);
}

.card-footer .btn {
  flex: 1;
}

.card-decoration {
  position: absolute;
  top: 0;
  right: 0;
  width: 60px;
  height: 60px;
  opacity: 0;
  transition: opacity var(--duration-normal) var(--ease-out);
}

.class-card:hover .card-decoration {
  opacity: 1;
}

/* Footer decoration */
.page-footer-decoration {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  pointer-events: none;
}

.page-footer-decoration svg {
  width: 100%;
  height: 100%;
}

/* Responsive */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: var(--space-md);
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .content-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-md);
  }

  .class-grid {
    grid-template-columns: 1fr;
  }
}
</style>
