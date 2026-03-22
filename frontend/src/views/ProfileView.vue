<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { updateProfile } from '@/api/auth'

const router = useRouter()
const authStore = useAuthStore()
const loadingProfile = ref(true)
const saving = ref(false)
const error = ref('')
const profile = ref({
  real_name: '',
  subject: '',
  phone: '',
  email: '',
  bio: ''
})

function syncProfileFromStore() {
  profile.value = {
    real_name: authStore.user?.teacher_profile?.real_name || '',
    subject: authStore.user?.teacher_profile?.subject || '',
    phone: authStore.user?.teacher_profile?.phone || '',
    email: authStore.user?.teacher_profile?.email || '',
    bio: authStore.user?.teacher_profile?.bio || ''
  }
}

onMounted(async () => {
  try {
    if (!authStore.user?.teacher_profile) {
      await authStore.fetchUser()
    }
    syncProfileFromStore()
  } finally {
    loadingProfile.value = false
  }
})

async function handleSave() {
  saving.value = true
  error.value = ''
  try {
    await updateProfile({
      real_name: profile.value.real_name,
      subject: profile.value.subject,
      phone: profile.value.phone || undefined,
      email: profile.value.email || undefined,
      bio: profile.value.bio || undefined
    })
    await authStore.fetchUser()
    syncProfileFromStore()
  } catch (e: any) {
    error.value = e.response?.data?.detail || '保存失败'
  } finally {
    saving.value = false
  }
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="profile-page">
    <header class="header">
      <button @click="router.push('/')" class="page-back-button">返回</button>
      <h1>个人中心</h1>
    </header>

    <main class="content">
      <div class="profile-card card">
        <div class="avatar-section">
          <div class="avatar">{{ profile.real_name?.[0] || '?' }}</div>
          <p class="username">{{ authStore.user?.username }}</p>
        </div>

        <p v-if="loadingProfile" class="profile-loading">加载资料中...</p>

        <form v-else @submit.prevent="handleSave" class="profile-form">
          <div class="form-group">
            <label for="profile-real-name">姓名</label>
            <input id="profile-real-name" v-model="profile.real_name" type="text" class="input" />
          </div>
          <div class="form-group">
            <label for="profile-subject">学科</label>
            <input id="profile-subject" v-model="profile.subject" type="text" class="input" />
          </div>
          <div class="form-group">
            <label for="profile-phone">手机</label>
            <input id="profile-phone" v-model="profile.phone" type="tel" class="input" />
          </div>
          <div class="form-group">
            <label for="profile-email">邮箱</label>
            <input id="profile-email" v-model="profile.email" type="email" class="input" />
          </div>
          <div class="form-group">
            <label for="profile-bio">个人简介</label>
            <textarea id="profile-bio" v-model="profile.bio" class="input" rows="3"></textarea>
          </div>
          <button type="submit" class="btn btn-primary">保存修改</button>
        </form>

        <div class="danger-zone">
          <button @click="handleLogout" class="btn btn-danger">退出登录</button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: var(--cream-100);
  position: relative;
}

/* Decorative background */
.profile-page::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.3;
  background:
    radial-gradient(circle at 20% 30%, var(--sage-100) 0%, transparent 40%),
    radial-gradient(circle at 80% 70%, var(--terra-100) 0%, transparent 40%);
  z-index: 0;
}

.header {
  background: white;
  padding: var(--space-lg) var(--space-xl);
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header h1 {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--forest-700);
  letter-spacing: 0.02em;
  margin: 0;
}

.content {
  padding: var(--space-xl);
  max-width: 600px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.profile-card {
  padding: var(--space-xl);
}

.avatar-section {
  text-align: center;
  margin-bottom: var(--space-xl);
}

.avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--forest-500), var(--sage-500));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-family: var(--font-accent);
  font-weight: 700;
  letter-spacing: 0.04em;
  margin: 0 auto var(--space-md);
  box-shadow: 0 4px 16px rgba(61, 122, 82, 0.3);
  transition: transform var(--duration-normal) var(--ease-spring);
}

.profile-card:hover .avatar {
  transform: scale(1.05);
}

.username {
  font-family: var(--font-number);
  color: var(--brown-400);
  font-size: 14px;
  letter-spacing: 0.03em;
  margin: 0;
}

.profile-loading {
  margin: 0 0 var(--space-lg);
  color: var(--brown-400);
  text-align: center;
}

.form-group {
  margin-bottom: var(--space-lg);
}

.form-group label {
  display: block;
  margin-bottom: var(--space-sm);
  font-family: var(--font-accent);
  font-weight: 600;
  font-size: 14px;
  color: var(--forest-700);
  letter-spacing: 0.04em;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.danger-zone {
  margin-top: var(--space-xl);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--cream-200);
}

.danger-zone .btn {
  width: 100%;
  transition: all var(--duration-fast) var(--ease-spring);
}

.danger-zone .btn:hover {
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .content {
    padding: var(--space-md);
  }

  .profile-card {
    padding: var(--space-lg);
  }
}
</style>
