<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { downloadImportTemplate, previewImport, executeImport, type ImportPreviewItem } from '@/api/import'

const route = useRoute()
const router = useRouter()
const classId = Number(route.params.classId)

const step = ref<'upload' | 'preview' | 'result'>('upload')
const file = ref<File | null>(null)
const previewData = ref<ImportPreviewItem[]>([])
const validCount = ref(0)
const errorCount = ref(0)
const importing = ref(false)
const result = ref<{ success: number; failed: number; errors?: string } | null>(null)
const error = ref('')

async function handleDownloadTemplate() {
  try {
    const response = await downloadImportTemplate(classId)
    const blob = new Blob([response as any], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'student_import_template.xlsx'
    a.click()
    window.URL.revokeObjectURL(url)
  } catch {
    error.value = '下载模板失败'
  }
}

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    file.value = target.files[0]
  }
}

async function handlePreview() {
  if (!file.value) {
    error.value = '请选择文件'
    return
  }
  importing.value = true
  error.value = ''
  try {
    const response = await previewImport(classId, file.value)
    previewData.value = response.items
    validCount.value = response.valid_count
    errorCount.value = response.error_count
    step.value = 'preview'
  } catch (e: any) {
    error.value = e.response?.data?.detail || '预览失败'
  } finally {
    importing.value = false
  }
}

async function handleImport() {
  if (!file.value) return
  importing.value = true
  error.value = ''
  try {
    const response = await executeImport(classId, file.value)
    result.value = {
      success: response.success_rows,
      failed: response.failed_rows,
      errors: response.error_report
    }
    step.value = 'result'
  } catch (e: any) {
    error.value = e.response?.data?.detail || '导入失败'
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <div class="import-page">
    <header class="header">
      <div class="header-left">
        <button @click="router.back()" class="page-back-button">返回</button>
        <h1>导入学生</h1>
      </div>
    </header>

    <main class="content">
      <!-- Step 1: Upload -->
      <div v-if="step === 'upload'" class="card">
        <span class="ui-eyebrow step-kicker">导入准备</span>
        <h2>步骤1: 下载模板并填写</h2>
        <button @click="handleDownloadTemplate" class="btn btn-primary">
          下载 Excel 模板
        </button>

        <h2 class="step-heading secondary-heading">步骤2: 上传文件</h2>
        <div class="form-group">
          <input type="file" accept=".xlsx,.xls" @change="handleFileChange" class="input" />
        </div>
        <p v-if="file" class="file-name ui-caption">已选择: {{ file.name }}</p>
        <p v-if="error" class="error">{{ error }}</p>
        <button @click="handlePreview" class="btn btn-primary" :disabled="!file || importing">
          {{ importing ? '预览中...' : '预览' }}
        </button>
      </div>

      <!-- Step 2: Preview -->
      <div v-else-if="step === 'preview'" class="card">
        <span class="ui-eyebrow step-kicker">数据预检</span>
        <h2>预览导入数据</h2>
        <div class="stats-row">
          <span class="stat success">有效: {{ validCount }}</span>
          <span class="stat error">错误: {{ errorCount }}</span>
        </div>

        <div class="preview-table-container">
          <table class="data-table ui-data-table">
            <thead>
              <tr>
                <th>行号</th>
                <th>姓名</th>
                <th>学号</th>
                <th>性别</th>
                <th>座号</th>
                <th>小组</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in previewData" :key="item.row" :class="{ 'error-row': item.status === 'error' }">
                <td>{{ item.row }}</td>
                <td>{{ item.name }}</td>
                <td>{{ item.student_no }}</td>
                <td>{{ item.gender || '-' }}</td>
                <td>{{ item.seat_no || '-' }}</td>
                <td>{{ item.group_name || '-' }}</td>
                <td>
                  <span v-if="item.status === 'ok'" class="badge success">有效</span>
                  <span v-else class="badge error">{{ item.error }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="error" class="error">{{ error }}</p>
        <div class="form-actions">
          <button @click="step = 'upload'" class="btn">上一步</button>
          <button @click="handleImport" class="btn btn-primary" :disabled="importing || validCount === 0">
            {{ importing ? '导入中...' : '确认导入' }}
          </button>
        </div>
      </div>

      <!-- Step 3: Result -->
      <div v-else-if="step === 'result'" class="card">
        <span class="ui-eyebrow step-kicker">导入结果</span>
        <h2>导入完成</h2>
        <div class="result-stats">
          <p class="stat success">成功: {{ result?.success }}</p>
          <p class="stat error">失败: {{ result?.failed }}</p>
        </div>
        <div v-if="result?.errors" class="error-report">
          <h3>错误报告</h3>
          <pre>{{ result.errors }}</pre>
        </div>
        <button @click="router.back()" class="btn btn-primary">完成</button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.import-page {
  min-height: 100vh;
  background: var(--cream-100);
  position: relative;
}

/* Decorative background */
.import-page::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.3;
  background:
    radial-gradient(circle at 10% 20%, var(--sage-100) 0%, transparent 40%),
    radial-gradient(circle at 90% 80%, var(--terra-100) 0%, transparent 40%);
  z-index: 0;
}

.header {
  background: white;
  padding: var(--space-lg) var(--space-xl);
  display: flex;
  align-items: center;
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
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
  max-width: 1000px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.card {
  background: white;
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  box-shadow: var(--shadow-sm);
  animation: fadeInUp 0.3s var(--ease-out);
}

.step-kicker {
  margin-bottom: var(--space-sm);
}

.card h2 {
  margin-bottom: var(--space-lg);
  font-family: var(--font-display);
  color: var(--forest-700);
  font-size: 1.1rem;
  letter-spacing: 0.02em;
}

.step-heading.secondary-heading {
  margin-top: var(--space-lg);
}

.stats-row {
  display: flex;
  gap: var(--space-xl);
  margin-bottom: var(--space-lg);
  padding: var(--space-md);
  background: var(--cream-100);
  border-radius: var(--radius-md);
}

.stat {
  font-size: 1rem;
  font-weight: 600;
  font-family: var(--font-number);
  font-variant-numeric: tabular-nums lining-nums;
}

.stat.success {
  color: var(--forest-500);
}

.stat.error {
  color: var(--danger);
}

.preview-table-container {
  max-height: 400px;
  overflow-y: auto;
  margin: var(--space-md) 0;
  border: 1px solid var(--cream-200);
  border-radius: var(--radius-md);
}

.data-table th {
  position: sticky;
  top: 0;
}

.error-row {
  background: rgba(194, 84, 80, 0.05);
}

.badge {
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
}

.badge.success {
  background: var(--forest-100);
  color: var(--forest-700);
}

.badge.error {
  background: rgba(194, 84, 80, 0.1);
  color: var(--danger);
}

.file-name {
  color: var(--brown-400);
  margin: var(--space-sm) 0;
  font-size: 14px;
}

.form-actions {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-lg);
}

.form-actions .btn {
  flex: 1;
  transition: all var(--duration-fast) var(--ease-spring);
}

.form-actions .btn:hover {
  transform: translateY(-2px);
}

.result-stats {
  margin: var(--space-xl) 0;
  display: flex;
  gap: var(--space-xl);
}

.result-stats p {
  font-size: 1.5rem;
  font-family: var(--font-number);
  font-weight: 800;
  font-variant-numeric: tabular-nums lining-nums;
  margin: 0;
}

.error-report {
  background: rgba(194, 84, 80, 0.05);
  border: 1px solid rgba(194, 84, 80, 0.2);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  margin: var(--space-md) 0;
}

.error-report h3 {
  color: var(--danger);
  margin-bottom: var(--space-sm);
  font-size: 14px;
  font-family: var(--font-display);
  letter-spacing: 0.02em;
}

.error-report pre {
  white-space: pre-wrap;
  font-size: 13px;
  color: var(--brown-600);
  font-family: var(--font-body);
}

@media (max-width: 768px) {
  .content {
    padding: var(--space-md);
  }

  .card {
    padding: var(--space-lg);
  }

  .stats-row {
    flex-direction: column;
    gap: var(--space-sm);
  }
}
</style>
