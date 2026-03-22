<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  username: '',
  password: '',
  confirm_password: '',
  real_name: '',
  subject: ''
})
const loading = ref(false)
const error = ref('')

async function handleRegister() {
  if (form.value.password !== form.value.confirm_password) {
    error.value = '两次密码不一致'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await authStore.registerAction({
      username: form.value.username,
      password: form.value.password,
      confirm_password: form.value.confirm_password,
      real_name: form.value.real_name,
      subject: form.value.subject
    })
    router.push('/login')
  } catch (e: any) {
    error.value = e.response?.data?.detail || '注册失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-page">
    <!-- Decorative background -->
    <div class="bg-decoration">
      <div class="pattern-dots"></div>
      <div class="floating-element fe-1">✨</div>
      <div class="floating-element fe-2">🌸</div>
    </div>

    <div class="register-container">
      <div class="form-card">
        <!-- Header with botanical accent -->
        <div class="card-header-section ui-form-header">
          <div class="header-accent">
            <svg viewBox="0 0 60 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 10C10 10 10 5 20 5C30 5 30 15 40 15C50 15 50 5 60 5" stroke="#3D7A52" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <span class="ui-eyebrow">教师注册</span>
          <h1 class="form-title ui-section-title is-hero">创建账号</h1>
          <p class="form-subtitle ui-section-copy">开启您的教学管理之旅</p>
        </div>

        <form @submit.prevent="handleRegister" class="register-form">
          <div class="form-row">
            <div class="form-group">
              <label class="input-label">用户名</label>
              <input
                v-model="form.username"
                name="username"
                type="text"
                class="input"
                placeholder="设置用户名"
                autocomplete="username"
                required
              />
            </div>
            <div class="form-group">
              <label class="input-label">姓名</label>
              <input
                v-model="form.real_name"
                name="real_name"
                type="text"
                class="input"
                placeholder="您的真实姓名"
                autocomplete="name"
                required
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="input-label">密码</label>
              <input
                v-model="form.password"
                name="password"
                type="password"
                class="input"
                placeholder="设置密码"
                autocomplete="new-password"
                required
              />
            </div>
            <div class="form-group">
              <label class="input-label">确认密码</label>
              <input
                v-model="form.confirm_password"
                name="confirm_password"
                type="password"
                class="input"
                placeholder="再次输入密码"
                autocomplete="new-password"
                required
              />
            </div>
          </div>

          <div class="form-group full-width">
            <label class="input-label">学科</label>
            <input
              v-model="form.subject"
              name="subject"
              type="text"
              class="input"
              placeholder="如：语文、数学、英语"
              autocomplete="organization-title"
              required
            />
          </div>

          <p v-show="error" class="error-message ui-feedback-message is-error" role="alert">{{ error }}</p>

          <button type="submit" class="btn btn-primary btn-lg w-full" :disabled="loading">
            <span v-if="loading" class="ui-loading-spinner" aria-hidden="true"></span>
            <span>{{ loading ? '注册中...' : '立即注册' }}</span>
          </button>
        </form>

        <div class="form-footer ui-auth-footer">
          <p>已有账号？<router-link to="/login" class="link ui-inline-link">返回登录</router-link></p>
        </div>

        <!-- Decorative botanical elements -->
        <div class="botanical-corner top-right">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 0C100 0 80 20 60 20C40 20 40 0 40 0" stroke="#A8C4A2" stroke-width="1.5" fill="none"/>
            <path d="M100 0C100 0 80 40 60 40C40 40 40 0 40 0" stroke="#A8C4A2" stroke-width="1.5" fill="none" opacity="0.6"/>
            <circle cx="70" cy="15" r="4" fill="#C17A4E" opacity="0.4"/>
            <circle cx="85" cy="25" r="3" fill="#C17A4E" opacity="0.3"/>
          </svg>
        </div>
      </div>

      <!-- Side decoration -->
      <div class="side-decoration">
        <div class="decoration-content">
          <div class="decoration-icon">🌱</div>
          <h3>记录每一步成长</h3>
          <p>帮助学生养成良好习惯，培育积极向上的班级氛围</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, var(--cream-100) 0%, var(--sage-100) 50%, var(--cream-100) 100%);
  position: relative;
  padding: 40px 20px;
}

/* Background decoration */
.bg-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.pattern-dots {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(var(--sage-300) 1px, transparent 1px);
  background-size: 30px 30px;
  opacity: 0.15;
}

.floating-element {
  position: absolute;
  font-size: 32px;
  opacity: 0.2;
  animation: float 5s ease-in-out infinite;
}

.fe-1 { top: 15%; right: 10%; animation-delay: 0s; }
.fe-2 { bottom: 20%; left: 8%; animation-delay: -2.5s; }

/* Main container */
.register-container {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  width: 100%;
  max-width: 1000px;
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  animation: fadeInScale 0.6s var(--ease-out);
}

/* Form card */
.form-card {
  padding: 50px;
  position: relative;
}

.card-header-section {
  margin-bottom: 36px;
}

.header-accent {
  width: 60px;
  height: 20px;
  margin: 0 auto 20px;
}

.header-accent svg {
  width: 100%;
  height: 100%;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.input-label {
  margin-bottom: 8px;
}

/* Botanical corner decoration */
.botanical-corner {
  position: absolute;
  width: 100px;
  height: 100px;
  pointer-events: none;
}

.botanical-corner.top-right {
  top: 0;
  right: 0;
}

.botanical-corner svg {
  width: 100%;
  height: 100%;
}

/* Side decoration */
.side-decoration {
  background: linear-gradient(135deg, var(--forest-700) 0%, var(--forest-500) 100%);
  padding: 50px 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.side-decoration::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 30% 70%, rgba(255,255,255,0.1) 0%, transparent 50%),
    radial-gradient(circle at 70% 30%, rgba(255,255,255,0.08) 0%, transparent 40%);
}

.decoration-content {
  position: relative;
  z-index: 1;
  text-align: center;
  color: white;
}

.decoration-icon {
  font-size: 64px;
  margin-bottom: 24px;
  animation: gentlePulse 3s ease-in-out infinite;
}

.decoration-content h3 {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  margin-bottom: 12px;
  color: white;
}

.decoration-content p {
  font-size: 0.95rem;
  opacity: 0.85;
  margin: 0;
  line-height: 1.6;
}

/* Responsive */
@media (max-width: 850px) {
  .register-container {
    grid-template-columns: 1fr;
    max-width: 500px;
  }

  .side-decoration {
    display: none;
  }

  .form-card {
    padding: 40px 30px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
