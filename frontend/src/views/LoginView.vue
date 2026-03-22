<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({ username: '', password: '' })
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    await authStore.loginAction(form.value)
    router.push('/')
  } catch (e: any) {
    error.value = e.response?.data?.detail || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <!-- Decorative background elements -->
    <div class="bg-decoration">
      <div class="leaf leaf-1">🌿</div>
      <div class="leaf leaf-2">🍃</div>
      <div class="leaf leaf-3">🌱</div>
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
    </div>

    <div class="login-container">
      <!-- Left side - Branding -->
      <div class="branding-side">
        <div class="branding-content">
          <div class="logo-icon">
            <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="40" cy="40" r="38" fill="#E8F0EA" stroke="#3D7A52" stroke-width="2"/>
              <path d="M40 20C40 20 28 28 28 38C28 48 40 55 40 55C40 55 52 48 52 38C52 28 40 20 40 20Z" fill="#3D7A52"/>
              <path d="M40 55V65" stroke="#3D7A52" stroke-width="3" stroke-linecap="round"/>
              <path d="M35 62H45" stroke="#3D7A52" stroke-width="3" stroke-linecap="round"/>
              <circle cx="40" cy="36" r="4" fill="#FAF7F2"/>
            </svg>
          </div>
          <h1 class="branding-title">班级优化<br/>积分系统</h1>
          <p class="branding-subtitle">记录成长，培育未来</p>

          <div class="feature-list">
            <div class="feature-item">
              <span class="feature-icon">📊</span>
              <span>科学的评分体系</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🌱</span>
              <span>直观的成长可视化</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📈</span>
              <span>详尽的统计分析</span>
            </div>
          </div>
        </div>

        <!-- Decorative botanical illustration -->
        <div class="botanical-decoration">
          <svg viewBox="0 0 200 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 300V180" stroke="#3D7A52" stroke-width="2" stroke-linecap="round"/>
            <ellipse cx="100" cy="170" rx="60" ry="40" fill="#E8F0EA"/>
            <ellipse cx="100" cy="165" rx="50" ry="32" fill="#A8C4A2" opacity="0.5"/>
            <path d="M60 180C60 180 40 200 30 190C20 180 40 160 60 180Z" fill="#7D9A6F" opacity="0.6"/>
            <path d="M140 180C140 180 160 200 170 190C180 180 160 160 140 180Z" fill="#7D9A6F" opacity="0.6"/>
            <circle cx="80" cy="140" r="8" fill="#C17A4E" opacity="0.4"/>
            <circle cx="120" cy="130" r="6" fill="#C17A4E" opacity="0.3"/>
            <circle cx="100" cy="120" r="10" fill="#C17A4E" opacity="0.5"/>
          </svg>
        </div>
      </div>

      <!-- Right side - Login form -->
      <div class="form-side">
        <div class="form-card">
          <div class="form-header ui-form-header">
            <span class="ui-eyebrow">教师入口</span>
            <h2 class="ui-section-title is-hero">欢迎回来</h2>
            <p class="ui-section-copy">登录您的教师账号</p>
          </div>

          <form @submit.prevent="handleLogin" class="login-form">
            <div class="form-group">
              <label class="input-label">用户名</label>
              <input
                v-model="form.username"
                name="username"
                type="text"
                class="input"
                placeholder="请输入用户名"
                autocomplete="username"
                required
              />
            </div>

            <div class="form-group">
              <label class="input-label">密码</label>
              <input
                v-model="form.password"
                name="password"
                type="password"
                class="input"
                placeholder="请输入密码"
                autocomplete="current-password"
                required
              />
            </div>

            <p v-show="error" class="error-message ui-feedback-message is-error" role="alert">{{ error }}</p>

            <button type="submit" class="btn btn-primary btn-lg w-full" :disabled="loading">
              <span v-if="loading" class="ui-loading-spinner" aria-hidden="true"></span>
              <span>{{ loading ? '登录中...' : '登 录' }}</span>
            </button>
          </form>

          <div class="form-footer ui-auth-footer">
            <p>还没有账号？<router-link to="/register" class="link ui-inline-link">立即注册</router-link></p>
          </div>

          <!-- Decorative corner -->
          <div class="corner-decoration top-left"></div>
          <div class="corner-decoration bottom-right"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--cream-100) 0%, var(--forest-100) 100%);
  position: relative;
  overflow: hidden;
}

/* Decorative background */
.bg-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.leaf {
  position: absolute;
  font-size: 48px;
  opacity: 0.15;
  animation: float 6s ease-in-out infinite;
}

.leaf-1 { top: 10%; left: 5%; animation-delay: 0s; }
.leaf-2 { top: 60%; left: 8%; animation-delay: -2s; font-size: 36px; }
.leaf-3 { top: 30%; right: 10%; animation-delay: -4s; }

.circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.1;
}

.circle-1 {
  width: 400px;
  height: 400px;
  background: var(--forest-500);
  top: -200px;
  right: -100px;
}

.circle-2 {
  width: 300px;
  height: 300px;
  background: var(--terra-400);
  bottom: -150px;
  left: -100px;
}

/* Main container */
.login-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 100%;
  max-width: 1100px;
  min-height: 680px;
  margin: 20px;
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  animation: fadeInScale 0.6s var(--ease-out);
}

/* Branding side */
.branding-side {
  background: linear-gradient(135deg, var(--forest-700) 0%, var(--forest-500) 100%);
  padding: 60px 50px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}

.branding-side::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 40%);
}

.branding-content {
  position: relative;
  z-index: 1;
}

.logo-icon {
  width: 80px;
  height: 80px;
  margin-bottom: 32px;
  animation: fadeInUp 0.6s var(--ease-out);
}

.logo-icon svg {
  width: 100%;
  height: 100%;
}

.branding-title {
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  line-height: 1.2;
  letter-spacing: 0.03em;
  margin-bottom: 12px;
  animation: fadeInUp 0.6s var(--ease-out) 0.1s both;
}

.branding-subtitle {
  font-family: var(--font-accent);
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 0.06em;
  margin-bottom: 48px;
  animation: fadeInUp 0.6s var(--ease-out) 0.2s both;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
  animation: fadeInUp 0.6s var(--ease-out) 0.3s both;
}

.feature-icon {
  font-size: 1.2rem;
}

.botanical-decoration {
  position: relative;
  z-index: 1;
  opacity: 0.3;
  align-self: flex-end;
  margin-top: auto;
}

.botanical-decoration svg {
  width: 200px;
  height: auto;
}

/* Form side */
.form-side {
  padding: 60px 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.form-card {
  width: 100%;
  max-width: 380px;
  position: relative;
}

.form-header {
  margin-bottom: 40px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.input-label {
  margin-bottom: 8px;
}

.btn-primary {
  position: relative;
}

/* Corner decorations */
.corner-decoration {
  position: absolute;
  width: 60px;
  height: 60px;
  pointer-events: none;
}

.corner-decoration.top-left {
  top: -10px;
  left: -10px;
  border-top: 3px solid var(--sage-300);
  border-left: 3px solid var(--sage-300);
  border-radius: var(--radius-md) 0 0 0;
}

.corner-decoration.bottom-right {
  bottom: -10px;
  right: -10px;
  border-bottom: 3px solid var(--sage-300);
  border-right: 3px solid var(--sage-300);
  border-radius: 0 0 var(--radius-md) 0;
}

/* Responsive */
@media (max-width: 900px) {
  .login-container {
    grid-template-columns: 1fr;
    max-width: 480px;
  }

  .branding-side {
    padding: 40px 30px;
    min-height: auto;
  }

  .botanical-decoration {
    display: none;
  }

  .branding-title {
    font-size: 2rem;
  }

  .form-side {
    padding: 40px 30px;
  }
}
</style>
