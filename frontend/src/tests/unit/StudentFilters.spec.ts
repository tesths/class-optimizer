import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import StudentFilters from '@/components/StudentFilters.vue'

describe('StudentFilters', () => {
  it('emits search updates and renders helper copy', async () => {
    const onSearchUpdate = vi.fn()
    const wrapper = mount(StudentFilters, {
      props: {
        search: '',
        groupId: null,
        groups: [],
        'onUpdate:search': onSearchUpdate
      }
    })

    expect(wrapper.text()).toContain('课堂筛选台')
    expect(wrapper.text()).toContain('按姓名或小组快速找到要关注的同学。')

    await wrapper.get('#student-search').setValue('张小明')

    expect(onSearchUpdate).toHaveBeenLastCalledWith('张小明')
  })

  it('emits selected group id changes', async () => {
    const onGroupUpdate = vi.fn()
    const wrapper = mount(StudentFilters, {
      props: {
        search: '',
        groupId: null,
        groups: [
          { id: 1, class_id: 1, name: '向日葵组', created_at: '2024-01-01', updated_at: '2024-01-01' },
          { id: 2, class_id: 1, name: '小松树组', created_at: '2024-01-01', updated_at: '2024-01-01' }
        ],
        'onUpdate:groupId': onGroupUpdate
      }
    })

    await wrapper.get('#student-group-filter').setValue('2')

    expect(onGroupUpdate).toHaveBeenLastCalledWith(2)
  })
})
