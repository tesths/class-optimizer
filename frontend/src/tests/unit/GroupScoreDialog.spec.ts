import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import GroupScoreDialog from '@/components/GroupScoreDialog.vue'

describe('GroupScoreDialog', () => {
  const mockGroup = {
    id: 1,
    class_id: 1,
    name: '第一组',
    total_score: 12,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }

  const mockScoreItems = [
    { id: 11, class_id: 1, name: '小组协作', target_type: 'group', score_value: 3, score_type: 'plus', enabled: true, sort_order: 0 },
    { id: 12, class_id: 1, name: '讨论走神', target_type: 'group', score_value: 1, score_type: 'minus', enabled: true, sort_order: 1 }
  ]

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('emits the selected group score item payload', async () => {
    const wrapper = mount(GroupScoreDialog, {
      attachTo: document.body,
      props: { visible: true, group: mockGroup, scoreItems: mockScoreItems }
    })
    await nextTick()

    ;(document.body.querySelector('.item-btn.plus') as HTMLButtonElement).click()
    await nextTick()
    ;(document.body.querySelector('button.btn.btn-primary') as HTMLButtonElement).click()
    await nextTick()

    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({
      score_item_id: 11,
      score_delta: 3,
      remark: ''
    })
  })

  it('renders an empty state when no group score items exist', async () => {
    mount(GroupScoreDialog, {
      attachTo: document.body,
      props: { visible: true, group: mockGroup, scoreItems: [] }
    })
    await nextTick()

    expect(document.body.textContent).toContain('还没有可用小组积分项目')
    expect((document.body.querySelector('button.btn.btn-primary') as HTMLButtonElement).disabled).toBe(true)
  })
})
