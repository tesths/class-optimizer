<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

onMounted(() => {
  const classId = String(route.params.classId || '')
  const groupId = String(route.params.groupId || '')
  void router.replace({
    name: 'ClassGarden',
    params: { classId },
    query: {
      tab: 'groups',
      ...(groupId ? { highlightGroup: groupId } : {})
    }
  })
})
</script>

<template>
  <div class="group-garden-bridge">
    <p>正在跳转到小组列表...</p>
  </div>
</template>

<style scoped>
.group-garden-bridge {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  color: var(--brown-600);
  background: linear-gradient(180deg, #eef8ee 0%, #f8f5eb 100%);
}
</style>
