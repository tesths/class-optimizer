import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import GrowthProgressBar from '@/components/GrowthProgressBar.vue'

describe('GrowthProgressBar', () => {
  it.each([
    { score: 10, theme: 'farm' as const, label: '嫩芽', width: '0%' },
    { score: 30, theme: 'farm' as const, label: '幼苗', width: '0%' },
    { score: 75, theme: 'farm' as const, label: '开花', width: '38%' },
    { score: 150, theme: 'farm' as const, label: '丰收', width: '100%' },
    { score: 250, theme: 'farm' as const, label: '丰收', width: '100%' },
    { score: 12, theme: 'tree' as const, label: '萌芽', width: '10%' },
    { score: 40, theme: 'tree' as const, label: '树苗', width: '33%' },
    { score: 90, theme: 'tree' as const, label: '小树', width: '75%' },
    { score: 180, theme: 'tree' as const, label: '大树', width: '100%' },
    { score: 300, theme: 'tree' as const, label: '大树', width: '100%' }
  ])('calculates $theme stage for score $score', ({ score, theme, label, width }) => {
    const wrapper = mount(GrowthProgressBar, {
      props: { score, theme }
    })

    expect(wrapper.get('.stage-name').text()).toBe(label)
    expect((wrapper.get('.progress-fill').element as HTMLDivElement).style.width).toBe(width)
  })

  it('shows points to the next stage when not maxed out', () => {
    const wrapper = mount(GrowthProgressBar, {
      props: { score: 10, theme: 'farm' }
    })

    expect(wrapper.get('.points-to-next').text()).toBe('还需 20 分')
    expect(wrapper.get('.next-stage-info').text()).toBe('下一阶段: 幼苗')
  })

  it('shows the max-stage message when score reaches the final stage', () => {
    const wrapper = mount(GrowthProgressBar, {
      props: { score: 100, theme: 'farm' }
    })

    expect(wrapper.get('.points-to-next.max').text()).toBe('已满级 ✨')
    expect(wrapper.find('.next-stage-info').exists()).toBe(false)
  })

  it('displays the current score and stage markers', () => {
    const wrapper = mount(GrowthProgressBar, {
      props: { score: 75, theme: 'farm' }
    })

    expect(wrapper.get('.current-score').text()).toBe('75')
    expect(wrapper.findAll('.marker')).toHaveLength(4)
  })

  it('applies explicit size classes', () => {
    const small = mount(GrowthProgressBar, {
      props: { score: 30, theme: 'farm', size: 'small' }
    })
    const large = mount(GrowthProgressBar, {
      props: { score: 30, theme: 'farm', size: 'large' }
    })

    expect(small.classes()).toContain('size-small')
    expect(large.classes()).toContain('size-large')
  })
})
