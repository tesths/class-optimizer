import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import GrowthCelebration from '@/components/GrowthCelebration.vue'

function mountCelebration(props?: Partial<{ fromStage: string; toStage: string; theme: 'farm' | 'tree' }>) {
  return mount(GrowthCelebration, {
    attachTo: document.body,
    props: {
      fromStage: 'seed',
      toStage: 'sprout',
      theme: 'farm',
      ...props
    }
  })
}

describe('GrowthCelebration', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('renders farm upgrades with the correct emoji and label', async () => {
    mountCelebration({ theme: 'farm', toStage: 'flower' })
    await nextTick()

    expect(document.body.querySelector('.upgrade-icon')?.textContent).toBe('🌸')
    expect(document.body.querySelector('.stage-name')?.textContent).toBe('开花')
    expect(document.body.querySelector('.congrats')?.textContent).toBe('恭喜升级！')
  })

  it('renders tree upgrades with the correct emoji and label', async () => {
    mountCelebration({ theme: 'tree', toStage: 'sapling' })
    await nextTick()

    expect(document.body.querySelector('.upgrade-icon')?.textContent).toBe('🌿')
    expect(document.body.querySelector('.stage-name')?.textContent).toBe('树苗')
  })

  it('creates 20 star particles', async () => {
    mountCelebration()
    await nextTick()

    expect(document.body.querySelectorAll('.star')).toHaveLength(20)
  })

  it('emits complete after the celebration timeout', async () => {
    vi.useFakeTimers()
    const wrapper = mountCelebration()
    await nextTick()

    vi.advanceTimersByTime(2500)
    await nextTick()

    expect(wrapper.emitted('complete')).toHaveLength(1)
  })
})
