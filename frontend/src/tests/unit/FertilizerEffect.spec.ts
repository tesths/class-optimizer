import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import FertilizerEffect from '@/components/FertilizerEffect.vue'

function mountEffect(delta: number) {
  return mount(FertilizerEffect, {
    attachTo: document.body,
    props: { delta, theme: 'farm' }
  })
}

describe('FertilizerEffect', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('renders positive content for score increases', async () => {
    mountEffect(5)
    await nextTick()

    const effect = document.body.querySelector('.fertilizer-effect')
    expect(effect?.classList.contains('fertilize')).toBe(true)
    expect(document.body.querySelector('.delta-text')?.textContent).toBe('+5')
    expect(document.body.querySelector('.emoji')?.textContent).toBe('💚')
    expect(document.body.querySelector('.effect-text')?.textContent).toBe('施肥成功！')
  })

  it('renders negative content for score decreases', async () => {
    mountEffect(-3)
    await nextTick()

    const effect = document.body.querySelector('.fertilizer-effect')
    expect(effect?.classList.contains('wither')).toBe(true)
    expect(document.body.querySelector('.delta-text')?.textContent).toBe('-3')
    expect(document.body.querySelector('.emoji')?.textContent).toBe('💔')
    expect(document.body.querySelector('.effect-text')?.textContent).toBe('植物枯萎了...')
  })

  it('generates 12 themed particles', async () => {
    mountEffect(5)
    await nextTick()

    const particles = document.body.querySelectorAll('.particle')
    expect(particles).toHaveLength(12)
    expect(particles[0]?.textContent).toBe('✨')

    document.body.innerHTML = ''

    mountEffect(-2)
    await nextTick()
    expect(document.body.querySelector('.particle')?.textContent).toBe('🍂')
  })

  it('emits complete after the animation window', async () => {
    vi.useFakeTimers()
    const wrapper = mountEffect(4)
    await nextTick()

    vi.advanceTimersByTime(1500)
    await nextTick()

    expect(wrapper.emitted('complete')).toHaveLength(1)
  })
})
