import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import GrowthVisual from '@/components/GrowthVisual.vue'

describe('GrowthVisual', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([
    { theme: 'farm' as const, stage: 'seed', emoji: '🌱', label: '种子' },
    { theme: 'farm' as const, stage: 'sprout', emoji: '🌿', label: '嫩芽' },
    { theme: 'farm' as const, stage: 'seedling', emoji: '🌾', label: '幼苗' },
    { theme: 'farm' as const, stage: 'flower', emoji: '🌸', label: '开花' },
    { theme: 'farm' as const, stage: 'harvest', emoji: '🎉', label: '丰收' },
    { theme: 'tree' as const, stage: 'seed', emoji: '🌰', label: '种子' },
    { theme: 'tree' as const, stage: 'bud', emoji: '🌱', label: '萌芽' },
    { theme: 'tree' as const, stage: 'sapling', emoji: '🌿', label: '树苗' },
    { theme: 'tree' as const, stage: 'young_tree', emoji: '🌳', label: '小树' },
    { theme: 'tree' as const, stage: 'big_tree', emoji: '🌲', label: '大树' }
  ])('renders $theme stage "$stage"', ({ theme, stage, emoji, label }) => {
    const wrapper = mount(GrowthVisual, {
      props: { theme, stage }
    })

    expect(wrapper.get('.growth-icon').text()).toBe(emoji)
    expect(wrapper.get('.growth-label').text()).toBe(label)
  })

  it('defaults to medium size and can switch sizes', () => {
    const medium = mount(GrowthVisual, {
      props: { theme: 'farm', stage: 'sprout' }
    })
    const small = mount(GrowthVisual, {
      props: { theme: 'farm', stage: 'sprout', size: 'small' }
    })
    const large = mount(GrowthVisual, {
      props: { theme: 'farm', stage: 'sprout', size: 'large' }
    })

    expect(medium.classes()).toContain('size-medium')
    expect(small.classes()).toContain('size-small')
    expect(large.classes()).toContain('size-large')
  })

  it('applies the animated class on the root container', () => {
    const wrapper = mount(GrowthVisual, {
      props: { theme: 'farm', stage: 'sprout', animated: true }
    })

    expect(wrapper.classes()).toContain('animated')
  })

  it('plays celebrate animation when the stage changes', async () => {
    vi.useFakeTimers()
    const wrapper = mount(GrowthVisual, {
      props: { theme: 'farm', stage: 'seed', animated: true }
    })

    await wrapper.setProps({ stage: 'sprout' })

    const icon = wrapper.get('.growth-icon')
    expect(icon.classes()).toContain('celebrate')
    expect(icon.classes()).toContain('animating')

    vi.advanceTimersByTime(1000)
    await nextTick()

    expect(icon.classes()).not.toContain('celebrate')
    expect(icon.classes()).not.toContain('animating')
  })

  it('exposes fertilize animations for positive and negative score changes', async () => {
    vi.useFakeTimers()
    const wrapper = mount(GrowthVisual, {
      props: { theme: 'farm', stage: 'sprout', animated: true }
    })

    ;(wrapper.vm as { triggerFertilize: (isPositive: boolean) => void }).triggerFertilize(true)
    await nextTick()
    expect(wrapper.get('.growth-icon').classes()).toContain('up')

    vi.advanceTimersByTime(800)
    await nextTick()
    expect(wrapper.get('.growth-icon').classes()).not.toContain('up')

    ;(wrapper.vm as { triggerFertilize: (isPositive: boolean) => void }).triggerFertilize(false)
    await nextTick()
    expect(wrapper.get('.growth-icon').classes()).toContain('down')
  })
})
