import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ScoreDialog from '@/components/ScoreDialog.vue'

describe('ScoreDialog', () => {
  const mockStudent = {
    id: 1,
    class_id: 1,
    name: '张三',
    student_no: '001',
    total_score: 10,
    growth_stage: 'sprout',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }

  const mockScoreItems = [
    { id: 1, class_id: 1, name: '上课积极', target_type: 'student', score_value: 5, score_type: 'plus', enabled: true, subject: null, sort_order: 0 },
    { id: 2, class_id: 1, name: '迟到', target_type: 'student', score_value: 2, score_type: 'minus', enabled: true, subject: null, sort_order: 1 },
    { id: 3, class_id: 1, name: '已禁用', target_type: 'student', score_value: 3, score_type: 'plus', enabled: false, subject: null, sort_order: 2 }
  ]

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mountDialog() {
    return mount(ScoreDialog, {
      attachTo: document.body,
      props: { visible: true, student: mockStudent, scoreItems: mockScoreItems }
    })
  }

  it('opens when visible prop is true', async () => {
    mountDialog()
    await nextTick()

    expect(document.body.querySelector('.dialog')).not.toBeNull()
    expect(document.body.textContent).toContain('给 张三 评分')
    expect(document.body.textContent).not.toContain('已禁用')
  })

  it('selects a quick item and emits submit with the generated payload', async () => {
    const wrapper = mountDialog()
    await nextTick()

    ;(document.body.querySelector('.item-btn.plus') as HTMLButtonElement).click()
    await nextTick()

    expect(document.body.textContent).toContain('已选择：上课积极（+5）')

    ;(document.body.querySelector('button.btn.btn-primary') as HTMLButtonElement).click()
    await nextTick()

    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({
      score_item_id: 1,
      score_delta: 5,
      remark: ''
    })
  })

  it('resets state when reopened', async () => {
    const wrapper = mountDialog()
    await nextTick()

    ;(document.body.querySelector('.item-btn.plus') as HTMLButtonElement).click()
    await nextTick()

    const remarkInput = document.body.querySelector('input[placeholder="可选备注"]') as HTMLInputElement
    remarkInput.value = '课堂表现'
    remarkInput.dispatchEvent(new Event('input'))
    await nextTick()

    await wrapper.setProps({ visible: false })
    await nextTick()
    await wrapper.setProps({ visible: true })
    await nextTick()

    expect(document.body.querySelector('.dialog')).not.toBeNull()
    expect((document.body.querySelector('input[placeholder="可选备注"]') as HTMLInputElement).value).toBe('')
    expect(document.body.querySelector('.preview-section')).toBeNull()
    expect(document.body.textContent).not.toContain('已选择：')
  })

  it('shows a stage-up preview when the selected score crosses a threshold', async () => {
    mount(ScoreDialog, {
      attachTo: document.body,
      props: {
        visible: true,
        student: { ...mockStudent, total_score: 18, growth_stage: 'seed' },
        scoreItems: mockScoreItems,
        theme: 'farm'
      }
    })
    await nextTick()

    ;(document.body.querySelector('.item-btn.plus') as HTMLButtonElement).click()
    await nextTick()

    expect(document.body.querySelector('.preview-card')?.classList.contains('stage-up')).toBe(true)
    expect(document.body.textContent).toContain('即将升级到 嫩芽！')
  })

  it('keeps minus items collapsed until the reminder section is expanded', async () => {
    mountDialog()
    await nextTick()

    expect(document.body.querySelector('.item-btn.minus')).toBeNull()

    ;(document.body.querySelector('.minus-toggle') as HTMLButtonElement).click()
    await nextTick()

    const minusButton = document.body.querySelector('.item-btn.minus') as HTMLButtonElement | null
    expect(minusButton).not.toBeNull()
    expect(minusButton?.textContent ?? '').toMatch(/迟到\s*-2/)
  })

  it('shows an empty state when no student score items are configured', async () => {
    mount(ScoreDialog, {
      attachTo: document.body,
      props: {
        visible: true,
        student: mockStudent,
        scoreItems: []
      }
    })
    await nextTick()

    expect(document.body.textContent).toContain('还没有可用积分项目')
    expect((document.body.querySelector('button.btn.btn-primary') as HTMLButtonElement).disabled).toBe(true)
  })
})
