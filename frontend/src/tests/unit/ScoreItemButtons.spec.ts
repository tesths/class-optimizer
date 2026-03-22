import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ScoreItemButtons from '@/components/ScoreItemButtons.vue'

describe('ScoreItemButtons', () => {
  const plusItems = [
    { id: 1, class_id: 1, name: '积极发言', score_value: 3, score_type: 'plus', enabled: true, sort_order: 0 }
  ]

  const minusItems = [
    { id: 2, class_id: 1, name: '忘带作业', score_value: -2, score_type: 'minus', enabled: true, sort_order: 0 }
  ]

  it('emits the selected quick score item and formats the score badge', async () => {
    const wrapper = mount(ScoreItemButtons, {
      props: {
        plusItems,
        minusItems: [],
        selectedId: null
      }
    })

    expect(wrapper.get('.item-btn.plus .item-score').text()).toBe('+3')

    await wrapper.get('.item-btn.plus').trigger('click')

    expect(wrapper.emitted('select')?.[0]?.[0]).toEqual(plusItems[0])
  })

  it('keeps reminder items collapsed until the toggle is pressed', async () => {
    const wrapper = mount(ScoreItemButtons, {
      props: {
        plusItems,
        minusItems,
        selectedId: null,
        minusCollapsedByDefault: true
      }
    })

    expect(wrapper.text()).not.toContain('忘带作业')

    await wrapper.get('.minus-toggle').trigger('click')

    expect(wrapper.text()).toContain('忘带作业')
    expect(wrapper.get('.item-btn.minus .item-score').text()).toBe('-2')
  })
})
