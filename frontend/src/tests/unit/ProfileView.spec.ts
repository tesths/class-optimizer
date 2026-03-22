import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import * as authApi from '@/api/auth'
import ProfileView from '@/views/ProfileView.vue'

const push = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push })
}))

vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getMe: vi.fn(),
  updateProfile: vi.fn()
}))

const initialUser = {
  id: 1,
  username: 'teacher_profile',
  is_active: true,
  created_at: '2024-01-01',
  teacher_profile: {
    id: 1,
    user_id: 1,
    real_name: '原教师姓名',
    subject: '数学',
    phone: '13800000000',
    email: 'teacher@example.com',
    bio: '初始简介'
  }
}

const updatedUser = {
  ...initialUser,
  teacher_profile: {
    ...initialUser.teacher_profile,
    real_name: '更新后的教师姓名',
    subject: '科学',
    bio: '保存后的简介'
  }
}

describe('ProfileView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('token', 'token-123')
    push.mockReset()
  })

  function mountView({
    user = initialUser,
    mockFetchedUser
  }: {
    user?: typeof initialUser | null
    mockFetchedUser?: typeof initialUser
  } = {}) {
    const pinia = createPinia()
    setActivePinia(pinia)

    const store = useAuthStore()
    store.token = 'token-123'
    store.user = user

    if (mockFetchedUser) {
      vi.mocked(authApi.getMe).mockResolvedValue(mockFetchedUser)
    }

    const wrapper = mount(ProfileView, {
      global: {
        plugins: [pinia]
      }
    })

    return { wrapper, store }
  }

  it('syncs the form from the store on mount', async () => {
    const { wrapper } = mountView()
    await flushPromises()

    const inputs = wrapper.findAll('input')
    expect(inputs[0].element.value).toBe('原教师姓名')
    expect(inputs[1].element.value).toBe('数学')
    expect(inputs[2].element.value).toBe('13800000000')
    expect(inputs[3].element.value).toBe('teacher@example.com')
    expect(wrapper.find('textarea').element.value).toBe('初始简介')
    expect(authApi.getMe).not.toHaveBeenCalled()
  })

  it('fetches the profile when the store is empty', async () => {
    const { wrapper, store } = mountView({
      user: null,
      mockFetchedUser: initialUser
    })

    await flushPromises()

    expect(authApi.getMe).toHaveBeenCalledOnce()
    expect(store.user?.teacher_profile?.real_name).toBe('原教师姓名')
    expect(wrapper.findAll('input')[0].element.value).toBe('原教师姓名')
  })

  it('saves the profile and refreshes the form with fetched data', async () => {
    vi.mocked(authApi.updateProfile).mockResolvedValue({ message: '更新成功' } as never)
    vi.mocked(authApi.getMe).mockResolvedValue(updatedUser)

    const { wrapper, store } = mountView()
    await flushPromises()

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('更新后的教师姓名')
    await inputs[1].setValue('科学')
    await wrapper.find('textarea').setValue('保存后的简介')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(authApi.updateProfile).toHaveBeenCalledWith({
      real_name: '更新后的教师姓名',
      subject: '科学',
      phone: '13800000000',
      email: 'teacher@example.com',
      bio: '保存后的简介'
    })
    expect(authApi.getMe).toHaveBeenCalledOnce()
    expect(store.user?.teacher_profile?.real_name).toBe('更新后的教师姓名')
    expect(wrapper.findAll('input')[0].element.value).toBe('更新后的教师姓名')
    expect(wrapper.find('textarea').element.value).toBe('保存后的简介')
  })

  it('logs out and redirects to the login page', async () => {
    const { wrapper, store } = mountView()
    await flushPromises()

    await wrapper.find('.btn-danger').trigger('click')

    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
    expect(push).toHaveBeenCalledWith('/login')
  })
})
